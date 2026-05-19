"""
MindFlow Backend Test Configuration
Per SDLC Phase 7 - Testing & Quality Assurance

This module provides shared fixtures for all backend tests:
- Database session management with rollback
- Test tenant and user creation
- Authentication token generation
- Service-specific test clients
"""

import os
import asyncio
from datetime import datetime, timedelta
from typing import AsyncGenerator, Generator
from uuid import uuid4, UUID

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

# Set test environment BEFORE importing anything that uses settings
os.environ["MINDFLOW_ENV"] = "test"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://mindflow_test:mindflow_test@localhost:5432/mindflow_test"
)

# Import shared modules
from shared.database import Base, get_db as get_async_session
from shared.security import create_access_token, hash_password
from shared.config import get_settings

# Clear the settings cache and re-create with test environment
get_settings.cache_clear()
settings = get_settings()


# =============================================================================
# DATABASE FIXTURES
# =============================================================================

@pytest.fixture(scope="function")
def event_loop():
    """Create an event loop for each test function."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


# Module-level flag to track if tables have been created
_tables_created = False


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """Create async database engine for each test function - tables created once per session."""
    global _tables_created
    # Import all models from all services to register them with Base.metadata
    # Auth Service models
    from services.auth.models import (
        Tenant, User, Role, Permission, RolePermission, UserTenantRole, Session
    )
    # HR Service models
    from services.hr.models import (
        Department, Position, Employee, LeaveType, LeaveBalance,
        LeaveRequest, AttendanceRecord, PayrollReference, Candidate
    )
    # Task Service models
    from services.task.models import (
        TaskStatus, Task, TaskAssignee, TaskComment, TaskAttachment, TaskDependency
    )
    # Training Service models
    from services.training.models import (
        Course, TrainingContent, TrainingSession, Enrollment,
        TrainingAttendance, Exam, ExamQuestion, ExamAttempt, ExamResponse, Certificate
    )
    # Expense Service models
    from services.expense.models import (
        ExpenseCategory, ExpenseRequest, ExpenseItem, ExpenseReceipt, PaymentRecord
    )
    # MindMap Service models
    from services.mindmap.models import (
        MindMapTemplate, MindMap, MindMapNode, NodeAttachment
    )
    # Complaint Service models
    from services.complaint.models import (
        ComplaintCategory, SLAConfiguration, EscalationRule,
        Complaint, ComplaintAction, ComplaintAttachment
    )
    # Approval Service models
    from services.approval.models import (
        ApprovalWorkflow, ApprovalStep, ApprovalInstance, ApprovalDecision, DelegationRule
    )
    # Notification Service models
    from services.notification.models import (
        Notification, NotificationPreference
    )
    # Storage Service models
    from services.storage.models import FileMetadata
    # Report Service models
    from services.report.models import Report, ReportParameter, ReportExecution

    engine = create_async_engine(
        settings.database_url,
        poolclass=NullPool,
        echo=False,
    )

    # Only create tables once per test session
    if not _tables_created:
        async with engine.begin() as conn:
            # Create all tables (will be no-op if they already exist)
            await conn.run_sync(Base.metadata.create_all)
        _tables_created = True

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a new database session for each test.
    Truncates all tables after each test for complete isolation.
    Tests can use flush() for in-transaction persistence or commit() for full commits.
    """
    async_session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with async_session_factory() as session:
        yield session
        # Rollback any uncommitted changes
        await session.rollback()

    # Truncate all tables after test for complete isolation
    # This handles data that was committed during the test
    async with async_engine.begin() as conn:
        # Get all table names and truncate them with CASCADE
        await conn.execute(text("""
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        """))


@pytest_asyncio.fixture(scope="function")
async def db_session_committed(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a database session that commits changes.
    Use for integration tests that need data persistence across operations.
    """
    async_session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_factory() as session:
        yield session
        # Clean up any data created during the test
        await session.rollback()


# =============================================================================
# TENANT FIXTURES
# =============================================================================

@pytest.fixture
def test_tenant_id() -> UUID:
    """Generate a unique test tenant ID."""
    return uuid4()


@pytest.fixture
def test_tenant_id_2() -> UUID:
    """Generate a second tenant ID for isolation tests."""
    return uuid4()


@pytest_asyncio.fixture
async def test_tenant(db_session: AsyncSession, test_tenant_id: UUID):
    """Create a test tenant in the database."""
    from services.auth.models import Tenant

    tenant = Tenant(
        id=test_tenant_id,
        name="Test Tenant",
        slug="test-tenant",
        status="ACTIVE",
    )
    db_session.add(tenant)
    await db_session.flush()
    return tenant


@pytest_asyncio.fixture
async def test_tenant_2(db_session: AsyncSession, test_tenant_id_2: UUID):
    """Create a second test tenant for isolation tests."""
    from services.auth.models import Tenant

    tenant = Tenant(
        id=test_tenant_id_2,
        name="Test Tenant 2",
        slug="test-tenant-2",
        status="ACTIVE",
    )
    db_session.add(tenant)
    await db_session.flush()
    return tenant


# =============================================================================
# USER FIXTURES
# =============================================================================

@pytest.fixture
def test_user_id() -> UUID:
    """Generate a unique test user ID."""
    return uuid4()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_tenant: "Tenant", test_user_id: UUID):
    """Create a basic test user."""
    from services.auth.models import User

    user = User(
        id=test_user_id,
        tenant_id=test_tenant.id,
        email="testuser@example.com",
        password_hash=hash_password("TestPass123!"),
        is_active=True,
        is_locked=False,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession, test_tenant: "Tenant"):
    """Create an admin user with ADMIN role."""
    from services.auth.models import User, Role, UserTenantRole

    user_id = uuid4()
    role_id = uuid4()

    # Create admin user first
    user = User(
        id=user_id,
        tenant_id=test_tenant.id,
        email="admin@example.com",
        password_hash=hash_password("AdminPass123!"),
        is_active=True,
        is_locked=False,
    )
    db_session.add(user)
    await db_session.flush()

    # Create admin role with user as creator
    admin_role = Role(
        id=role_id,
        tenant_id=test_tenant.id,
        name="ADMIN",
        code="ADMIN",
        description="Administrator role",
        is_system_role=True,
        created_by=user_id,
        updated_by=user_id,
    )
    db_session.add(admin_role)
    await db_session.flush()

    # Assign admin role
    user_role = UserTenantRole(
        id=uuid4(),
        tenant_id=test_tenant.id,
        user_id=user_id,
        role_id=role_id,
        assigned_by=user_id,
    )
    db_session.add(user_role)

    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def hr_admin_user(db_session: AsyncSession, test_tenant: "Tenant"):
    """Create an HR Admin user."""
    from services.auth.models import User, Role, UserTenantRole

    user_id = uuid4()
    role_id = uuid4()

    # Create user first
    user = User(
        id=user_id,
        tenant_id=test_tenant.id,
        email="hr_admin@example.com",
        password_hash=hash_password("HRAdmin123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    # Create role with user as creator
    hr_role = Role(
        id=role_id,
        tenant_id=test_tenant.id,
        name="HR_ADMIN",
        code="HR_ADMIN",
        description="HR Administrator role",
        is_system_role=True,
        created_by=user_id,
        updated_by=user_id,
    )
    db_session.add(hr_role)
    await db_session.flush()

    # Assign role
    user_role = UserTenantRole(
        id=uuid4(),
        tenant_id=test_tenant.id,
        user_id=user_id,
        role_id=role_id,
        assigned_by=user_id,
    )
    db_session.add(user_role)

    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def manager_user(db_session: AsyncSession, test_tenant: "Tenant"):
    """Create a Manager user."""
    from services.auth.models import User, Role, UserTenantRole

    user_id = uuid4()
    role_id = uuid4()

    # Create user first
    user = User(
        id=user_id,
        tenant_id=test_tenant.id,
        email="manager@example.com",
        password_hash=hash_password("Manager123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    # Create role with user as creator
    manager_role = Role(
        id=role_id,
        tenant_id=test_tenant.id,
        name="MANAGER",
        code="MANAGER",
        description="Manager role",
        is_system_role=True,
        created_by=user_id,
        updated_by=user_id,
    )
    db_session.add(manager_role)
    await db_session.flush()

    # Assign role
    user_role = UserTenantRole(
        id=uuid4(),
        tenant_id=test_tenant.id,
        user_id=user_id,
        role_id=role_id,
        assigned_by=user_id,
    )
    db_session.add(user_role)

    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def employee_user(db_session: AsyncSession, test_tenant: "Tenant"):
    """Create an Employee user (basic role)."""
    from services.auth.models import User, Role, UserTenantRole

    user_id = uuid4()
    role_id = uuid4()

    # Create user first
    user = User(
        id=user_id,
        tenant_id=test_tenant.id,
        email="employee@example.com",
        password_hash=hash_password("Employee123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    # Create role with user as creator
    employee_role = Role(
        id=role_id,
        tenant_id=test_tenant.id,
        name="EMPLOYEE",
        code="EMPLOYEE",
        description="Employee role",
        is_system_role=True,
        created_by=user_id,
        updated_by=user_id,
    )
    db_session.add(employee_role)
    await db_session.flush()

    # Assign role
    user_role = UserTenantRole(
        id=uuid4(),
        tenant_id=test_tenant.id,
        user_id=user_id,
        role_id=role_id,
        assigned_by=user_id,
    )
    db_session.add(user_role)

    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def tenant_2_user(db_session: AsyncSession, test_tenant_2: "Tenant"):
    """Create a user in a different tenant for isolation tests."""
    from services.auth.models import User

    user = User(
        id=uuid4(),
        tenant_id=test_tenant_2.id,
        email="user@tenant2.com",
        password_hash=hash_password("Tenant2Pass123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    return user


# =============================================================================
# AUTHENTICATION FIXTURES
# =============================================================================

@pytest.fixture
def auth_headers(test_user, test_tenant) -> dict:
    """Generate authentication headers for test user."""
    token = create_access_token(
        user_id=str(test_user.id),
        tenant_id=str(test_tenant.id),
        roles=["EMPLOYEE"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user, test_tenant) -> dict:
    """Generate authentication headers for admin user."""
    token = create_access_token(
        user_id=str(admin_user.id),
        tenant_id=str(test_tenant.id),
        roles=["ADMIN"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def hr_admin_headers(hr_admin_user, test_tenant) -> dict:
    """Generate authentication headers for HR admin user."""
    token = create_access_token(
        user_id=str(hr_admin_user.id),
        tenant_id=str(test_tenant.id),
        roles=["HR_ADMIN"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def manager_headers(manager_user, test_tenant) -> dict:
    """Generate authentication headers for manager user."""
    token = create_access_token(
        user_id=str(manager_user.id),
        tenant_id=str(test_tenant.id),
        roles=["MANAGER"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def employee_headers(employee_user, test_tenant) -> dict:
    """Generate authentication headers for employee user."""
    token = create_access_token(
        user_id=str(employee_user.id),
        tenant_id=str(test_tenant.id),
        roles=["EMPLOYEE"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def tenant_2_headers(tenant_2_user, test_tenant_2) -> dict:
    """Generate authentication headers for tenant 2 user."""
    token = create_access_token(
        user_id=str(tenant_2_user.id),
        tenant_id=str(test_tenant_2.id),
        roles=["EMPLOYEE"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def expired_token_headers(test_user, test_tenant) -> dict:
    """Generate expired authentication headers for testing token expiry."""
    token = create_access_token(
        user_id=str(test_user.id),
        tenant_id=str(test_tenant.id),
        roles=["EMPLOYEE"],
        expires_delta=timedelta(minutes=-5),  # Expired 5 minutes ago
    )
    return {"Authorization": f"Bearer {token}"}


def get_auth_headers_for_user(user, tenant, roles: list[str]) -> dict:
    """Helper to generate auth headers for any user."""
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        roles=roles,
    )
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# API CLIENT FIXTURES
# =============================================================================

@pytest_asyncio.fixture
async def auth_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Auth service."""
    from services.auth.main import app

    # Override database dependency
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def hr_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for HR service."""
    from services.hr.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def task_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Task service."""
    from services.task.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def training_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Training service."""
    from services.training.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def expense_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Expense service."""
    from services.expense.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def mindmap_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for MindMap service."""
    from services.mindmap.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def complaint_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Complaint service."""
    from services.complaint.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def approval_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Approval service."""
    from services.approval.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def notification_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Notification service."""
    from services.notification.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def storage_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Storage service."""
    from services.storage.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def report_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async client for Report service."""
    from services.report.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


# =============================================================================
# UTILITY FIXTURES
# =============================================================================

@pytest.fixture
def random_uuid() -> UUID:
    """Generate a random UUID."""
    return uuid4()


@pytest.fixture
def future_date() -> datetime:
    """Generate a date in the future."""
    return datetime.utcnow() + timedelta(days=30)


@pytest.fixture
def past_date() -> datetime:
    """Generate a date in the past."""
    return datetime.utcnow() - timedelta(days=30)


# =============================================================================
# RLS CONTEXT FIXTURE
# =============================================================================

@pytest_asyncio.fixture
async def set_rls_context(db_session: AsyncSession):
    """Factory fixture to set RLS context for a tenant."""
    async def _set_context(tenant_id: UUID):
        await db_session.execute(
            text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
        )
    return _set_context


# =============================================================================
# CLEANUP FIXTURES
# =============================================================================

@pytest_asyncio.fixture(autouse=True)
async def cleanup_after_test(db_session: AsyncSession):
    """Automatically cleanup after each test."""
    yield
    # Rollback is handled by db_session fixture
    pass
