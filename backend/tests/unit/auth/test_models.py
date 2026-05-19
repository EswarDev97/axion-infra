"""
Auth Service - Model Unit Tests
Per SDLC Phase 7 Task 7.1 - Write Unit Tests

Tests for:
- User model
- Tenant model
- Role model
- Permission model
- Session model
- UserTenantRole model
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

pytestmark = pytest.mark.unit


class TestUserModel:
    """Tests for the User model."""

    @pytest.mark.asyncio
    async def test_user_creation_with_required_fields(self, db_session, test_tenant):
        """Test user model creation with all required fields."""
        from services.auth.models import User

        user = User(
            id=uuid4(),
            tenant_id=test_tenant.id,
            email="newuser@example.com",
            password_hash="hashed_password_value",
            is_active=True,
            is_locked=False,
            failed_login_attempts=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(user)
        await db_session.flush()

        assert user.id is not None
        assert user.email == "newuser@example.com"
        assert user.tenant_id == test_tenant.id
        assert user.is_active is True
        assert user.is_locked is False
        assert user.failed_login_attempts == 0

    @pytest.mark.asyncio
    async def test_user_default_values(self, db_session, test_tenant):
        """Test user model default values are applied correctly."""
        from services.auth.models import User

        user = User(
            id=uuid4(),
            tenant_id=test_tenant.id,
            email="defaults@example.com",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        assert user.is_active is True
        assert user.is_locked is False
        assert user.failed_login_attempts == 0
        assert user.is_deleted is False
        assert user.deleted_at is None

    @pytest.mark.asyncio
    async def test_user_email_unique_per_tenant(self, db_session, test_tenant):
        """Test that email must be unique within a tenant."""
        from services.auth.models import User
        from sqlalchemy.exc import IntegrityError

        user1 = User(
            id=uuid4(),
            tenant_id=test_tenant.id,
            email="duplicate@example.com",
            password_hash="hash1",
        )
        db_session.add(user1)
        await db_session.flush()

        user2 = User(
            id=uuid4(),
            tenant_id=test_tenant.id,
            email="duplicate@example.com",  # Same email
            password_hash="hash2",
        )
        db_session.add(user2)

        with pytest.raises(IntegrityError):
            await db_session.flush()

    @pytest.mark.asyncio
    async def test_user_same_email_different_tenant(self, db_session, test_tenant, test_tenant_2):
        """Test that same email can exist in different tenants."""
        from services.auth.models import User

        user1 = User(
            id=uuid4(),
            tenant_id=test_tenant.id,
            email="shared@example.com",
            password_hash="hash1",
        )
        user2 = User(
            id=uuid4(),
            tenant_id=test_tenant_2.id,
            email="shared@example.com",  # Same email, different tenant
            password_hash="hash2",
        )

        db_session.add(user1)
        db_session.add(user2)
        await db_session.flush()

        assert user1.id != user2.id
        assert user1.email == user2.email
        assert user1.tenant_id != user2.tenant_id

    @pytest.mark.asyncio
    async def test_user_soft_delete(self, db_session, test_user):
        """Test soft delete sets deleted_at timestamp."""
        test_user.is_deleted = True
        test_user.deleted_at = datetime.utcnow()
        test_user.deletion_reason = "Account closure requested"
        await db_session.flush()

        assert test_user.is_deleted is True
        assert test_user.deleted_at is not None
        assert test_user.deletion_reason == "Account closure requested"

    @pytest.mark.asyncio
    async def test_user_lock_account(self, db_session, test_user):
        """Test user account locking."""
        test_user.is_locked = True
        test_user.locked_at = datetime.utcnow()
        test_user.locked_reason = "Too many failed login attempts"
        await db_session.flush()

        assert test_user.is_locked is True
        assert test_user.locked_at is not None
        assert test_user.locked_reason == "Too many failed login attempts"

    @pytest.mark.asyncio
    async def test_user_increment_failed_login_attempts(self, db_session, test_user):
        """Test incrementing failed login attempts."""
        original_attempts = test_user.failed_login_attempts
        test_user.failed_login_attempts += 1
        await db_session.flush()

        assert test_user.failed_login_attempts == original_attempts + 1

    @pytest.mark.asyncio
    async def test_user_update_last_login(self, db_session, test_user):
        """Test updating last login timestamp."""
        now = datetime.utcnow()
        test_user.last_login_at = now
        await db_session.flush()

        assert test_user.last_login_at == now

    @pytest.mark.asyncio
    async def test_user_is_account_valid_property(self, db_session, test_user):
        """Test is_account_valid property."""
        # Active user should be valid
        assert test_user.is_account_valid is True

        # Locked user should be invalid
        test_user.is_locked = True
        assert test_user.is_account_valid is False

        # Deleted user should be invalid
        test_user.is_locked = False
        test_user.is_deleted = True
        assert test_user.is_account_valid is False

        # Inactive user should be invalid
        test_user.is_deleted = False
        test_user.is_active = False
        assert test_user.is_account_valid is False


class TestTenantModel:
    """Tests for the Tenant model."""

    @pytest.mark.asyncio
    async def test_tenant_creation(self, db_session):
        """Test tenant model creation."""
        from services.auth.models import Tenant

        tenant = Tenant(
            id=uuid4(),
            name="Test Company",
            slug="test-company",
            status="ACTIVE",
        )
        db_session.add(tenant)
        await db_session.flush()

        assert tenant.id is not None
        assert tenant.name == "Test Company"
        assert tenant.slug == "test-company"
        assert tenant.status == "ACTIVE"

    @pytest.mark.asyncio
    async def test_tenant_slug_unique(self, db_session):
        """Test tenant slug must be unique."""
        from services.auth.models import Tenant
        from sqlalchemy.exc import IntegrityError

        tenant1 = Tenant(
            id=uuid4(),
            name="First Company",
            slug="same-slug",
            status="ACTIVE",
        )
        db_session.add(tenant1)
        await db_session.flush()

        tenant2 = Tenant(
            id=uuid4(),
            name="Second Company",
            slug="same-slug",  # Duplicate slug
            status="ACTIVE",
        )
        db_session.add(tenant2)

        with pytest.raises(IntegrityError):
            await db_session.flush()

    @pytest.mark.asyncio
    async def test_tenant_deactivation(self, db_session, test_tenant):
        """Test tenant can be deactivated."""
        test_tenant.status = "INACTIVE"
        await db_session.flush()

        assert test_tenant.status == "INACTIVE"


class TestRoleModel:
    """Tests for the Role model."""

    @pytest.mark.asyncio
    async def test_role_creation(self, db_session, test_tenant, test_user):
        """Test role model creation."""
        from services.auth.models import Role

        role = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Test Role",
            code="TEST_ROLE",
            description="A test role",
            is_system_role=False,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(role)
        await db_session.flush()

        assert role.id is not None
        assert role.name == "Test Role"
        assert role.code == "TEST_ROLE"
        assert role.is_system_role is False

    @pytest.mark.asyncio
    async def test_role_code_unique_per_tenant(self, db_session, test_tenant, test_user):
        """Test role code must be unique within a tenant."""
        from services.auth.models import Role
        from sqlalchemy.exc import IntegrityError

        role1 = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="First Role",
            code="DUPLICATE_CODE",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(role1)
        await db_session.flush()

        role2 = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Second Role",
            code="DUPLICATE_CODE",  # Duplicate code
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(role2)

        with pytest.raises(IntegrityError):
            await db_session.flush()

    @pytest.mark.asyncio
    async def test_system_role_flag(self, db_session, test_tenant, test_user):
        """Test system role flag."""
        from services.auth.models import Role

        system_role = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Admin",
            code="ADMIN",
            is_system_role=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(system_role)
        await db_session.flush()

        assert system_role.is_system_role is True


class TestUserTenantRoleModel:
    """Tests for the UserTenantRole model."""

    @pytest.mark.asyncio
    async def test_user_tenant_role_assignment(self, db_session, test_tenant, test_user):
        """Test user-role assignment."""
        from services.auth.models import Role, UserTenantRole

        role = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Test Role",
            code="TEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(role)
        await db_session.flush()

        user_role = UserTenantRole(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            role_id=role.id,
            assigned_by=test_user.id,
        )
        db_session.add(user_role)
        await db_session.flush()

        assert user_role.id is not None
        assert user_role.user_id == test_user.id
        assert user_role.role_id == role.id

    @pytest.mark.asyncio
    async def test_user_tenant_role_revocation(self, db_session, test_tenant, test_user):
        """Test user-role revocation."""
        from services.auth.models import Role, UserTenantRole

        role = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Revocable Role",
            code="REVOCABLE",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(role)
        await db_session.flush()

        user_role = UserTenantRole(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            role_id=role.id,
            assigned_by=test_user.id,
        )
        db_session.add(user_role)
        await db_session.flush()

        # Revoke the role
        user_role.revoked_at = datetime.utcnow()
        user_role.revoked_by = test_user.id
        await db_session.flush()

        assert user_role.revoked_at is not None
        assert user_role.revoked_by == test_user.id
        assert user_role.is_active is False

    @pytest.mark.asyncio
    async def test_user_tenant_role_is_active_property(self, db_session, test_tenant, test_user):
        """Test is_active property for user-role assignment."""
        from services.auth.models import Role, UserTenantRole

        role = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Active Test",
            code="ACTIVE_TEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(role)
        await db_session.flush()

        user_role = UserTenantRole(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            role_id=role.id,
            assigned_by=test_user.id,
        )
        db_session.add(user_role)
        await db_session.flush()

        # Initially active
        assert user_role.is_active is True

        # After revocation
        user_role.revoked_at = datetime.utcnow()
        assert user_role.is_active is False


class TestSessionModel:
    """Tests for the Session model."""

    @pytest.mark.asyncio
    async def test_session_creation(self, db_session, test_tenant, test_user):
        """Test session model creation."""
        from services.auth.models import Session

        token_jti = uuid4()
        session = Session(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            refresh_token_jti=token_jti,
            expires_at=datetime.utcnow() + timedelta(days=7),
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test Browser",
            is_revoked=False,
        )
        db_session.add(session)
        await db_session.flush()

        assert session.id is not None
        assert session.user_id == test_user.id
        assert session.refresh_token_jti == token_jti
        assert session.is_revoked is False

    @pytest.mark.asyncio
    async def test_session_revocation(self, db_session, test_tenant, test_user):
        """Test session revocation."""
        from services.auth.models import Session

        session = Session(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            refresh_token_jti=uuid4(),
            expires_at=datetime.utcnow() + timedelta(days=7),
            is_revoked=False,
        )
        db_session.add(session)
        await db_session.flush()

        # Revoke the session
        session.is_revoked = True
        session.revoked_at = datetime.utcnow()
        await db_session.flush()

        assert session.is_revoked is True
        assert session.revoked_at is not None

    @pytest.mark.asyncio
    async def test_session_expiry(self, db_session, test_tenant, test_user):
        """Test session expiry detection."""
        from services.auth.models import Session

        # Create expired session
        session = Session(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            refresh_token_jti=uuid4(),
            expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
            is_revoked=False,
        )
        db_session.add(session)
        await db_session.flush()

        # Session should be considered expired
        assert session.expires_at < datetime.utcnow()
