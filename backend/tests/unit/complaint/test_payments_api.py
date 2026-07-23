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
    from shared.middleware import setup_exception_handlers

    app = FastAPI()
    app.include_router(payments_router, prefix="/api/v1/complaints")
    # Register the shared MindFlowException handler so authz/auth exceptions
    # raised inside require_permission map to 403/401 JSON responses (the
    # standalone test app has no lifespan/middleware setup otherwise).
    setup_exception_handlers(app)

    current_user = CurrentUser(
        user_id=test_user.id,
        tenant_id=test_tenant.id,
        email=test_user.email,
        roles=["HR_ADMIN"],
        permissions=[
            "payments:create",
            "payments:read",
            "payments:update",
            "payments:delete",
        ],
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


@pytest_asyncio.fixture
async def forbidden_payments_client(db_session, test_tenant, test_user) -> AsyncClient:
    """
    Variant of `payments_client` whose `get_current_user` override returns a
    `CurrentUser` with a non-privileged role and NO payment permissions
    (roles=["EMPLOYEE"], permissions=[]). Used to assert that the
    `require_permission` gating rejects authenticated-but-unpermitted users
    with a 403.
    """
    from services.complaint.api.payments import router as payments_router
    from shared.middleware import setup_exception_handlers

    app = FastAPI()
    app.include_router(payments_router, prefix="/api/v1/complaints")
    setup_exception_handlers(app)

    unprivileged_user = CurrentUser(
        user_id=test_user.id,
        tenant_id=test_tenant.id,
        email=test_user.email,
        roles=["EMPLOYEE"],
        permissions=[],
        jti="test-jti",
    )

    async def override_get_db_session():
        yield db_session

    async def override_get_current_user():
        return unprivileged_user

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


@pytest_asyncio.fixture
async def unauthenticated_payments_client() -> AsyncClient:
    """
    Variant of `payments_client` that does NOT override `get_current_user`,
    so the real dependency chain executes. With no valid `Authorization`
    header, `extract_token_from_header` raises `AuthTokenInvalidException`
    (401). `get_db_session`/`get_tenant_id` are NOT overridden either since
    they themselves depend on `get_current_user` and are never reached once
    auth fails. This exercises the genuine unauthenticated rejection path.
    """
    from services.complaint.api.payments import router as payments_router
    from shared.middleware import setup_exception_handlers

    app = FastAPI()
    app.include_router(payments_router, prefix="/api/v1/complaints")
    setup_exception_handlers(app)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client


class TestPaymentAuthorization:
    """Tests for `require_permission` gating on the payments router (T7b)."""

    async def test_create_payment_forbidden_without_permission(
        self, forbidden_payments_client
    ):
        """An authenticated user lacking `payments:create` (roles=["EMPLOYEE"],
        permissions=[]) must be rejected with 403 before any route logic runs."""
        payload = {
            "caseReference": "CASE-2026-0002",
            "clientId": str(uuid4()),
            "vehicleRegistrationNumber": "KA01AB1234",
            "executiveEmployeeId": str(uuid4()),
            "caseStatus": "ASSIGNED",
            "billingStatus": "COMPANY_BILLING",
        }

        response = await forbidden_payments_client.post(
            "/api/v1/complaints/payments",
            json=payload,
        )

        assert response.status_code == 403
        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == "AUTHZ_INSUFFICIENT_PERMISSION"

    async def test_create_payment_unauthenticated(
        self, unauthenticated_payments_client
    ):
        """A request with no valid auth (no Authorization header) must be
        rejected with 401 by the real dependency chain, never reaching the
        route body."""
        payload = {
            "caseReference": "CASE-2026-0003",
            "clientId": str(uuid4()),
            "vehicleRegistrationNumber": "KA01AB1234",
            "executiveEmployeeId": str(uuid4()),
            "caseStatus": "ASSIGNED",
            "billingStatus": "COMPANY_BILLING",
        }

        response = await unauthenticated_payments_client.post(
            "/api/v1/complaints/payments",
            json=payload,
        )

        assert response.status_code == 401
        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == "AUTH_TOKEN_INVALID"
