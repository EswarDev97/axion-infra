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

from shared.dependencies import (
    get_current_user,
    get_db_session,
    get_employee_id,
    get_tenant_id,
    CurrentUser,
)

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


async def _create_financer(db_session, test_tenant, test_user):
    """Helper: create a Client row of type FINANCER so Payment.finance_id
    FK (payments_finance_id_fkey references clients.id) is satisfiable."""
    from services.complaint.models.client import Client

    financer = Client(
        tenant_id=test_tenant.id,
        name="Acme Finance Co",
        code=f"FIN-{uuid4().hex[:8]}",
        type="FINANCER",
        is_active=True,
        created_by=test_user.id,
        updated_by=test_user.id,
    )
    db_session.add(financer)
    await db_session.commit()
    await db_session.refresh(financer)
    return financer


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
async def own_scoped_payments_client(db_session, test_tenant, test_user):
    """
    Variant of `payments_client` for an EMPLOYEE with ONLY `payments:read:own`
    (no `payments:read`). `get_employee_id` is overridden to a fixed UUID
    (rather than querying a real `employees` row, per the pattern already
    used for `get_db_session`/`get_tenant_id` in this file) so list/get
    scoping can be asserted deterministically. Returns (client, employee_id).
    """
    from services.complaint.api.payments import router as payments_router
    from shared.middleware import setup_exception_handlers

    app = FastAPI()
    app.include_router(payments_router, prefix="/api/v1/complaints")
    setup_exception_handlers(app)

    own_employee_id = uuid4()

    scoped_user = CurrentUser(
        user_id=test_user.id,
        tenant_id=test_tenant.id,
        email=test_user.email,
        roles=["EMPLOYEE"],
        permissions=["payments:read:own"],
        jti="test-jti",
    )

    async def override_get_db_session():
        yield db_session

    async def override_get_current_user():
        return scoped_user

    async def override_get_tenant_id():
        return test_tenant.id

    async def override_get_employee_id():
        return own_employee_id

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_tenant_id] = override_get_tenant_id
    app.dependency_overrides[get_employee_id] = override_get_employee_id

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client, own_employee_id

    app.dependency_overrides.clear()


class TestPaymentListFilters:
    """Tests for the Payment Management filter bar query params:
    clientId, financeId, executiveEmployeeId, dateFrom, dateTo."""

    async def test_list_filters_by_finance_id_query_param(
        self, payments_client, db_session, test_tenant, test_user
    ):
        from services.complaint.models.payment import Payment

        client_obj = await _create_client(db_session, test_tenant, test_user)
        matching_financer = await _create_financer(db_session, test_tenant, test_user)
        other_financer = await _create_financer(db_session, test_tenant, test_user)

        matching = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-API-FIN-MATCH",
            client_id=client_obj.id,
            finance_id=matching_financer.id,
            vehicle_registration_number="KA01AB3001",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        other = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-API-FIN-OTHER",
            client_id=client_obj.id,
            finance_id=other_financer.id,
            vehicle_registration_number="KA01AB3002",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([matching, other])
        await db_session.commit()

        response = await payments_client.get(
            "/api/v1/complaints/payments",
            params={"financeId": str(matching_financer.id)},
        )

        assert response.status_code == 200
        items = response.json()["data"]["items"]
        assert len(items) == 1
        assert items[0]["caseReference"] == "CASE-API-FIN-MATCH"

    async def test_list_filters_by_date_range_query_params(
        self, payments_client, db_session, test_tenant, test_user
    ):
        from datetime import datetime, timezone

        from services.complaint.models.payment import Payment

        client_obj = await _create_client(db_session, test_tenant, test_user)

        in_range = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-API-DATE-IN",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB3003",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 4, 10, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        out_of_range = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-API-DATE-OUT",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB3004",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([in_range, out_of_range])
        await db_session.commit()

        response = await payments_client.get(
            "/api/v1/complaints/payments",
            params={"dateFrom": "2026-04-01", "dateTo": "2026-04-30"},
        )

        assert response.status_code == 200
        items = response.json()["data"]["items"]
        assert len(items) == 1
        assert items[0]["caseReference"] == "CASE-API-DATE-IN"

    async def test_list_combines_client_finance_executive_and_date_filters(
        self, payments_client, db_session, test_tenant, test_user
    ):
        from datetime import datetime, timezone

        from services.complaint.models.payment import Payment

        client_obj = await _create_client(db_session, test_tenant, test_user)
        target_financer = await _create_financer(db_session, test_tenant, test_user)
        target_executive_id = uuid4()

        exact_match = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-API-COMBINED-MATCH",
            client_id=client_obj.id,
            finance_id=target_financer.id,
            vehicle_registration_number="KA01AB3005",
            executive_employee_id=target_executive_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 6, 15, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        wrong_executive = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-API-COMBINED-WRONG-EXEC",
            client_id=client_obj.id,
            finance_id=target_financer.id,
            vehicle_registration_number="KA01AB3006",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 6, 15, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([exact_match, wrong_executive])
        await db_session.commit()

        response = await payments_client.get(
            "/api/v1/complaints/payments",
            params={
                "clientId": str(client_obj.id),
                "financeId": str(target_financer.id),
                "executiveEmployeeId": str(target_executive_id),
                "dateFrom": "2026-06-01",
                "dateTo": "2026-06-30",
            },
        )

        assert response.status_code == 200
        items = response.json()["data"]["items"]
        assert len(items) == 1
        assert items[0]["caseReference"] == "CASE-API-COMBINED-MATCH"


class TestPaymentReadOwnScoping:
    """Tests for `payments:read:own` (EMPLOYEE role) list/get scoping."""

    async def test_list_payments_scoped_to_own_executive_id(
        self, own_scoped_payments_client, db_session, test_tenant, test_user
    ):
        """A user with only payments:read:own must see just the payments
        where they are the assigned executive, not other executives'."""
        from services.complaint.models.payment import Payment

        client_obj = await _create_client(db_session, test_tenant, test_user)
        scoped_client, own_employee_id = own_scoped_payments_client

        own_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OWN-API-001",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB2001",
            executive_employee_id=own_employee_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        other_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OTHER-API-001",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB2002",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([own_payment, other_payment])
        await db_session.commit()

        response = await scoped_client.get("/api/v1/complaints/payments")

        assert response.status_code == 200
        body = response.json()
        items = body["data"]["items"]
        assert len(items) == 1
        assert items[0]["caseReference"] == "CASE-OWN-API-001"

    async def test_list_payments_scoped_ignores_supplied_executive_filter(
        self, own_scoped_payments_client, db_session, test_tenant, test_user
    ):
        """A payments:read:own caller who passes ?executiveEmployeeId=<someone
        else> must NOT see that other executive's payments — the caller's own
        employee id always wins over a user-supplied filter value."""
        from services.complaint.models.payment import Payment

        client_obj = await _create_client(db_session, test_tenant, test_user)
        scoped_client, own_employee_id = own_scoped_payments_client
        other_executive_id = uuid4()

        own_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OWN-API-SCOPE-OVERRIDE",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB2006",
            executive_employee_id=own_employee_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        other_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OTHER-API-SCOPE-OVERRIDE",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB2007",
            executive_employee_id=other_executive_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([own_payment, other_payment])
        await db_session.commit()

        response = await scoped_client.get(
            "/api/v1/complaints/payments",
            params={"executiveEmployeeId": str(other_executive_id)},
        )

        assert response.status_code == 200
        items = response.json()["data"]["items"]
        assert len(items) == 1
        assert items[0]["caseReference"] == "CASE-OWN-API-SCOPE-OVERRIDE"

    async def test_get_payment_scoped_denies_other_executives_payment(
        self, own_scoped_payments_client, db_session, test_tenant, test_user
    ):
        """GET /payments/{id} for a payment NOT assigned to the caller must
        return 404 (not 403 — avoids confirming the record's existence)."""
        from services.complaint.models.payment import Payment

        client_obj = await _create_client(db_session, test_tenant, test_user)
        scoped_client, _own_employee_id = own_scoped_payments_client

        other_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OTHER-API-002",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB2003",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(other_payment)
        await db_session.commit()
        await db_session.refresh(other_payment)

        response = await scoped_client.get(f"/api/v1/complaints/payments/{other_payment.id}")

        assert response.status_code == 404

    async def test_get_payment_scoped_allows_own_payment(
        self, own_scoped_payments_client, db_session, test_tenant, test_user
    ):
        """GET /payments/{id} for a payment assigned to the caller succeeds."""
        from services.complaint.models.payment import Payment

        client_obj = await _create_client(db_session, test_tenant, test_user)
        scoped_client, own_employee_id = own_scoped_payments_client

        own_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OWN-API-002",
            client_id=client_obj.id,
            vehicle_registration_number="KA01AB2004",
            executive_employee_id=own_employee_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(own_payment)
        await db_session.commit()
        await db_session.refresh(own_payment)

        response = await scoped_client.get(f"/api/v1/complaints/payments/{own_payment.id}")

        assert response.status_code == 200
        assert response.json()["data"]["caseReference"] == "CASE-OWN-API-002"

    async def test_create_payment_forbidden_with_only_read_own_permission(
        self, own_scoped_payments_client
    ):
        """payments:read:own does not grant payments:create."""
        scoped_client, _own_employee_id = own_scoped_payments_client
        payload = {
            "caseReference": "CASE-DENIED-001",
            "clientId": str(uuid4()),
            "vehicleRegistrationNumber": "KA01AB2005",
            "executiveEmployeeId": str(uuid4()),
            "caseStatus": "ASSIGNED",
            "billingStatus": "COMPANY_BILLING",
        }

        response = await scoped_client.post("/api/v1/complaints/payments", json=payload)

        assert response.status_code == 403


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
