"""
Complaint Service Payments API Unit Tests

Tests for the `payments` API router (T7a — routes only, no permission
gating yet; that is added in T7b). The router is NOT mounted on the
service's aggregate app (`services.complaint.api.router`) until T8, so
these tests build a minimal standalone FastAPI app that includes only
`services.complaint.api.payments.router`, overriding `get_db_session`
and `get_current_user` directly rather than relying on the full app's
lifespan-initialized `db_manager` (mirrors this codebase's
`test_payment_service.py` fixture usage — `db_session`/`test_tenant`/
`test_user` — for deterministic, isolated route-level testing).
"""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from shared.dependencies import get_current_user, get_db_session, get_tenant_id, CurrentUser

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


async def _create_client(db_session, test_tenant, test_user):
    """Helper: create a Client row so Payment.client_id FK is satisfiable."""
    from services.complaint.models.client import Client

    client = Client(
        tenant_id=test_tenant.id,
        name="Acme Insurer",
        code=f"ACME-{uuid4().hex[:8]}",
        type="CLIENT",
        is_active=True,
        created_by=test_user.id,
        updated_by=test_user.id,
    )
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    return client


@pytest_asyncio.fixture
async def payments_client(db_session, test_tenant, test_user) -> AsyncClient:
    """
    Standalone ASGI app mounting only the `payments` router, with
    `get_db_session`/`get_current_user`/`get_tenant_id` overridden to use
    the test's `db_session`/`test_tenant`/`test_user` fixtures directly.
    """
    from services.complaint.api.payments import router as payments_router

    app = FastAPI()
    app.include_router(payments_router, prefix="/api/v1/complaints")

    current_user = CurrentUser(
        user_id=test_user.id,
        tenant_id=test_tenant.id,
        email=test_user.email,
        roles=["HR_ADMIN"],
        permissions=[],
        jti="test-jti",
    )

    async def override_get_db_session():
        yield db_session

    async def override_get_current_user():
        return current_user

    async def override_get_tenant_id():
        return test_tenant.id

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_tenant_id] = override_get_tenant_id

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


class TestCreatePayment:
    """Tests for POST /payments."""

    async def test_create_payment_success(
        self, payments_client, db_session, test_tenant, test_user
    ):
        """Test creating a payment via the API returns 201 with a
        PaymentResponse-shaped body wrapped in ApiResponse."""
        client = await _create_client(db_session, test_tenant, test_user)

        payload = {
            "caseReference": "CASE-2026-0001",
            "clientId": str(client.id),
            "vehicleRegistrationNumber": "KA01AB1234",
            "executiveEmployeeId": str(uuid4()),
            "caseStatus": "ASSIGNED",
            "billingStatus": "COMPANY_BILLING",
        }

        response = await payments_client.post(
            "/api/v1/complaints/payments",
            json=payload,
        )

        assert response.status_code == 201
        body = response.json()

        assert body["success"] is True
        assert body["message"] == "Payment created successfully"
        assert "requestId" in body

        data = body["data"]
        assert data["id"] is not None
        assert data["caseReference"] == "CASE-2026-0001"
        assert data["clientId"] == str(client.id)
        assert data["financeId"] is None
        assert data["vehicleRegistrationNumber"] == "KA01AB1234"
        assert data["caseStatus"] == "ASSIGNED"
        assert data["billingStatus"] == "COMPANY_BILLING"
        assert data["paymentMode"] is None
        assert data["utrNumber"] is None
        assert data["transactionDatetime"] is None
        assert data["amount"] is None
        assert "createdAt" in data
        assert "updatedAt" in data
