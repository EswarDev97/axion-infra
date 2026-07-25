"""
HR Service Employees API Unit Tests — GET /employees/me,
GET /employees/field-executives

Standalone route-level test (mirrors backend/tests/unit/complaint/
test_payments_api.py's pattern: minimal FastAPI app mounting only the
employees router, with get_current_user/get_tenant_id overridden
directly) rather than going through the shared conftest.py header
fixtures (admin_headers/employee_headers/etc.), which are currently
broken — create_access_token() requires email and permissions as
non-default positional args that those fixtures never pass, so every
test depending on them errors at setup regardless of test logic.
"""

from datetime import date
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from shared.dependencies import get_current_user, get_tenant_id, CurrentUser

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


async def _create_position(db_session, test_tenant, test_user):
    from services.hr.models import Position

    position = Position(
        tenant_id=test_tenant.id,
        title="Surveyor",
        code=f"SURV-{uuid4().hex[:8]}",
        created_by=test_user.id,
        updated_by=test_user.id,
    )
    db_session.add(position)
    await db_session.commit()
    await db_session.refresh(position)
    return position


def _make_employees_client(db_session, test_tenant, test_user, permissions):
    """Shared builder behind the employees_client/payments_scoped_employees_client
    fixtures below — same client, different CurrentUser.permissions so each
    test exercises a specific permission gate.

    Unlike sibling services (e.g. complaint/api/payments.py, which takes
    `db: AsyncSession = Depends(get_db_session)`), employees.py opens its
    own session via the module-level `db_manager.session(...)` context
    manager instead of a FastAPI dependency, so get_db_session can't be
    overridden here. db_manager is normally initialized once at app
    startup (lifespan) — for a standalone test app we call init_db()
    directly, pointed at the same TEST_DATABASE_URL conftest.py already
    exported to DATABASE_URL, so it connects to the same test database as
    the db_session fixture (a separate connection, but committed rows are
    visible across connections via standard Postgres MVCC).
    """
    from services.hr.api.employees import router as employees_router
    from shared.database import db_manager
    from shared.middleware import setup_exception_handlers

    async def _client_cm():
        await db_manager.init_db()

        app = FastAPI()
        app.include_router(employees_router, prefix="/api/v1/hr")
        setup_exception_handlers(app)

        current_user = CurrentUser(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            email=test_user.email,
            roles=["EMPLOYEE"],
            permissions=permissions,
            jti="test-jti",
        )

        async def override_get_current_user():
            return current_user

        async def override_get_tenant_id():
            return test_tenant.id

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_tenant_id] = override_get_tenant_id

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client

        app.dependency_overrides.clear()
        await db_manager.close_db()

    return _client_cm()


@pytest_asyncio.fixture
async def employees_client(db_session, test_tenant, test_user) -> AsyncClient:
    """CurrentUser with only employees:read:self (the GET /employees/me case)."""
    async for client in _make_employees_client(
        db_session, test_tenant, test_user, ["employees:read:self"]
    ):
        yield client


@pytest_asyncio.fixture
async def payments_scoped_employees_client(db_session, test_tenant, test_user) -> AsyncClient:
    """CurrentUser with only payments:read (no hr:read:all/hr:read:subordinates,
    no employees:read:self) — the GET /employees/field-executives case."""
    async for client in _make_employees_client(
        db_session, test_tenant, test_user, ["payments:read"]
    ):
        yield client


@pytest_asyncio.fixture
async def no_permission_employees_client(db_session, test_tenant, test_user) -> AsyncClient:
    """CurrentUser with no relevant permissions at all — used to assert 403
    on GET /employees/field-executives."""
    async for client in _make_employees_client(db_session, test_tenant, test_user, []):
        yield client


class TestGetMyEmployeeRecord:
    """Tests for GET /employees/me."""

    async def test_returns_own_employee_record(
        self, employees_client, db_session, test_tenant, test_user
    ):
        """A caller with employees:read:self and a linked Employee row
        (employees.user_id == caller's user_id) gets their own record."""
        from services.hr.services.employee_service import EmployeeService

        position = await _create_position(db_session, test_tenant, test_user)
        service = EmployeeService(db_session)
        employee = await service.create_employee(
            tenant_id=test_tenant.id,
            employee_code=f"E-{uuid4().hex[:8]}",
            first_name="Jane",
            last_name="Doe",
            email=f"jane.{uuid4().hex[:8]}@example.com",
            position_id=position.id,
            date_of_joining=date.today(),
            created_by=test_user.id,
            user_id=test_user.id,
        )

        response = await employees_client.get("/api/v1/hr/employees/me")

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["data"]["id"] == str(employee.id)
        assert body["data"]["fullName"] == "Jane Doe"

    async def test_404_when_no_employee_record_linked(
        self, employees_client
    ):
        """A caller with employees:read:self but no Employee row whose
        user_id matches theirs (e.g. a pure system/API user) gets 404,
        not an empty 200 or a 500."""
        response = await employees_client.get("/api/v1/hr/employees/me")

        assert response.status_code == 404


class TestListFieldExecutives:
    """Tests for GET /employees/field-executives."""

    async def test_returns_only_active_field_executives(
        self, payments_scoped_employees_client, db_session, test_tenant, test_user
    ):
        """A caller with only payments:read (no hr:read:all/hr:read:
        subordinates) gets every active Field Executive, excluding other
        positions and inactive Field Executives."""
        from services.hr.models import Position
        from services.hr.services.employee_service import EmployeeService

        field_exec_position = Position(
            tenant_id=test_tenant.id,
            title="Field Executive",
            code=f"FE-{uuid4().hex[:8]}",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        other_position = await _create_position(db_session, test_tenant, test_user)
        db_session.add(field_exec_position)
        await db_session.commit()
        await db_session.refresh(field_exec_position)

        service = EmployeeService(db_session)
        active_fe = await service.create_employee(
            tenant_id=test_tenant.id,
            employee_code=f"E-{uuid4().hex[:8]}",
            first_name="Raju",
            last_name="P",
            email=f"raju.{uuid4().hex[:8]}@example.com",
            position_id=field_exec_position.id,
            date_of_joining=date.today(),
            created_by=test_user.id,
        )
        inactive_fe = await service.create_employee(
            tenant_id=test_tenant.id,
            employee_code=f"E-{uuid4().hex[:8]}",
            first_name="Inactive",
            last_name="Fe",
            email=f"inactive.{uuid4().hex[:8]}@example.com",
            position_id=field_exec_position.id,
            date_of_joining=date.today(),
            created_by=test_user.id,
        )
        inactive_fe.status = "INACTIVE"
        await db_session.commit()
        await service.create_employee(
            tenant_id=test_tenant.id,
            employee_code=f"E-{uuid4().hex[:8]}",
            first_name="Other",
            last_name="Position",
            email=f"other.{uuid4().hex[:8]}@example.com",
            position_id=other_position.id,
            date_of_joining=date.today(),
            created_by=test_user.id,
        )

        response = await payments_scoped_employees_client.get(
            "/api/v1/hr/employees/field-executives"
        )

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        names = [item["fullName"] for item in body["data"]["items"]]
        assert names == ["Raju P"]
        assert active_fe.id is not None  # sanity: employee actually persisted

    async def test_forbidden_without_payments_or_hr_permission(
        self, no_permission_employees_client
    ):
        """A caller with neither payments:create/payments:read nor hr:read:all/
        hr:read:subordinates is rejected with 403."""
        response = await no_permission_employees_client.get(
            "/api/v1/hr/employees/field-executives"
        )

        assert response.status_code == 403
