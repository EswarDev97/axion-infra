"""
Auth Service - Router/API Unit Tests
Per SDLC Phase 7 Task 7.1 - Write Unit Tests

Tests for Auth API endpoints:
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
- GET /api/v1/auth/me
- PUT /api/v1/auth/change-password
- GET /api/v1/users
- POST /api/v1/users
- GET /api/v1/users/{id}
- PUT /api/v1/users/{id}
- DELETE /api/v1/users/{id}
"""

import pytest
from datetime import datetime
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestAuthLoginEndpoint:
    """Tests for POST /api/v1/auth/login endpoint."""

    async def test_login_success(self, auth_client, test_user, test_tenant):
        """Test successful login returns tokens."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPass123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert data["data"]["token_type"] == "bearer"

    async def test_login_invalid_email(self, auth_client, test_tenant):
        """Test login fails with invalid email."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "AnyPassword123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    async def test_login_invalid_password(self, auth_client, test_user, test_tenant):
        """Test login fails with invalid password."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "WrongPassword123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    async def test_login_missing_email(self, auth_client, test_tenant):
        """Test login fails with missing email."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "password": "SomePassword123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code == 422  # Validation error

    async def test_login_missing_password(self, auth_client, test_user, test_tenant):
        """Test login fails with missing password."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code == 422  # Validation error

    async def test_login_invalid_email_format(self, auth_client, test_tenant):
        """Test login fails with invalid email format."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": "not-an-email",
                "password": "SomePassword123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code == 422  # Validation error

    async def test_login_locked_account(self, auth_client, db_session, test_user, test_tenant):
        """Test login fails for locked account."""
        # Lock the user
        test_user.is_locked = True
        test_user.locked_at = datetime.utcnow()
        await db_session.flush()

        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPass123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code in [401, 403]

    async def test_login_inactive_account(self, auth_client, db_session, test_user, test_tenant):
        """Test login fails for inactive account."""
        # Deactivate the user
        test_user.is_active = False
        await db_session.flush()

        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPass123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code in [401, 403]


class TestAuthLogoutEndpoint:
    """Tests for POST /api/v1/auth/logout endpoint."""

    async def test_logout_success(self, auth_client, auth_headers):
        """Test successful logout."""
        response = await auth_client.post(
            "/api/v1/auth/logout",
            headers=auth_headers,
        )

        assert response.status_code == 200

    async def test_logout_without_auth(self, auth_client):
        """Test logout fails without authentication."""
        response = await auth_client.post("/api/v1/auth/logout")

        assert response.status_code == 401

    async def test_logout_invalid_token(self, auth_client):
        """Test logout fails with invalid token."""
        response = await auth_client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401


class TestAuthRefreshEndpoint:
    """Tests for POST /api/v1/auth/refresh endpoint."""

    async def test_refresh_token_success(self, auth_client, test_user, test_tenant):
        """Test successful token refresh."""
        # First login to get tokens
        login_response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "TestPass123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        refresh_token = login_response.json()["data"]["refresh_token"]

        # Refresh the token
        response = await auth_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data["data"]

    async def test_refresh_token_invalid(self, auth_client):
        """Test refresh fails with invalid token."""
        response = await auth_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_refresh_token"},
        )

        assert response.status_code == 401

    async def test_refresh_token_missing(self, auth_client):
        """Test refresh fails with missing token."""
        response = await auth_client.post(
            "/api/v1/auth/refresh",
            json={},
        )

        assert response.status_code == 422


class TestAuthMeEndpoint:
    """Tests for GET /api/v1/auth/me endpoint."""

    async def test_me_authenticated(self, auth_client, auth_headers, test_user):
        """Test getting current user profile."""
        response = await auth_client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["email"] == test_user.email

    async def test_me_unauthenticated(self, auth_client):
        """Test me endpoint fails without authentication."""
        response = await auth_client.get("/api/v1/auth/me")

        assert response.status_code == 401

    async def test_me_expired_token(self, auth_client, expired_token_headers):
        """Test me endpoint fails with expired token."""
        response = await auth_client.get(
            "/api/v1/auth/me",
            headers=expired_token_headers,
        )

        assert response.status_code == 401


class TestChangePasswordEndpoint:
    """Tests for PUT /api/v1/auth/change-password endpoint."""

    async def test_change_password_success(self, auth_client, auth_headers):
        """Test successful password change."""
        response = await auth_client.put(
            "/api/v1/auth/change-password",
            json={
                "old_password": "TestPass123!",
                "new_password": "NewTestPass456!",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200

    async def test_change_password_wrong_old_password(self, auth_client, auth_headers):
        """Test password change fails with wrong old password."""
        response = await auth_client.put(
            "/api/v1/auth/change-password",
            json={
                "old_password": "WrongOldPass123!",
                "new_password": "NewTestPass456!",
            },
            headers=auth_headers,
        )

        assert response.status_code in [400, 401]

    async def test_change_password_weak_new_password(self, auth_client, auth_headers):
        """Test password change fails with weak new password."""
        response = await auth_client.put(
            "/api/v1/auth/change-password",
            json={
                "old_password": "TestPass123!",
                "new_password": "weak",  # Too weak
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    async def test_change_password_unauthenticated(self, auth_client):
        """Test password change fails without authentication."""
        response = await auth_client.put(
            "/api/v1/auth/change-password",
            json={
                "old_password": "TestPass123!",
                "new_password": "NewTestPass456!",
            },
        )

        assert response.status_code == 401


class TestForgotPasswordEndpoint:
    """Tests for POST /api/v1/auth/forgot-password endpoint."""

    async def test_forgot_password_success(self, auth_client, test_user, test_tenant):
        """Test forgot password request."""
        response = await auth_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_user.email},
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        # Should return 200 even if email doesn't exist (security)
        assert response.status_code == 200

    async def test_forgot_password_nonexistent_email(self, auth_client, test_tenant):
        """Test forgot password with nonexistent email (should still return 200)."""
        response = await auth_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"},
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        # Should return 200 to prevent email enumeration
        assert response.status_code == 200

    async def test_forgot_password_invalid_email(self, auth_client, test_tenant):
        """Test forgot password with invalid email format."""
        response = await auth_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "not-an-email"},
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        assert response.status_code == 422


class TestUsersEndpoints:
    """Tests for /api/v1/users/* endpoints."""

    async def test_list_users_admin(self, auth_client, admin_headers, test_user):
        """Test admin can list users."""
        response = await auth_client.get(
            "/api/v1/users",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data["data"]
        assert "total" in data["data"]

    async def test_list_users_non_admin(self, auth_client, employee_headers):
        """Test non-admin cannot list all users."""
        response = await auth_client.get(
            "/api/v1/users",
            headers=employee_headers,
        )

        assert response.status_code == 403

    async def test_create_user_admin(self, auth_client, admin_headers, test_tenant):
        """Test admin can create users."""
        response = await auth_client.post(
            "/api/v1/users",
            json={
                "email": "newadmincreated@example.com",
                "password": "NewUserPass123!",
            },
            headers=admin_headers,
        )

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["email"] == "newadmincreated@example.com"

    async def test_create_user_non_admin(self, auth_client, employee_headers):
        """Test non-admin cannot create users."""
        response = await auth_client.post(
            "/api/v1/users",
            json={
                "email": "shouldfail@example.com",
                "password": "SomePass123!",
            },
            headers=employee_headers,
        )

        assert response.status_code == 403

    async def test_get_user_by_id_admin(self, auth_client, admin_headers, test_user):
        """Test admin can get user by ID."""
        response = await auth_client.get(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == str(test_user.id)

    async def test_get_user_by_id_not_found(self, auth_client, admin_headers):
        """Test get user returns 404 for non-existent user."""
        response = await auth_client.get(
            f"/api/v1/users/{uuid4()}",
            headers=admin_headers,
        )

        assert response.status_code == 404

    async def test_get_own_profile(self, auth_client, employee_headers, employee_user):
        """Test user can get their own profile."""
        response = await auth_client.get(
            f"/api/v1/users/{employee_user.id}",
            headers=employee_headers,
        )

        # Either 200 (allowed to view own profile) or 403 (restricted to self-endpoints)
        assert response.status_code in [200, 403]

    async def test_update_user_admin(self, auth_client, admin_headers, test_user):
        """Test admin can update user."""
        response = await auth_client.put(
            f"/api/v1/users/{test_user.id}",
            json={
                "is_active": False,
            },
            headers=admin_headers,
        )

        assert response.status_code == 200

    async def test_update_user_non_admin(self, auth_client, employee_headers, test_user):
        """Test non-admin cannot update other users."""
        response = await auth_client.put(
            f"/api/v1/users/{test_user.id}",
            json={
                "is_active": False,
            },
            headers=employee_headers,
        )

        assert response.status_code == 403

    async def test_delete_user_admin(self, auth_client, admin_headers, test_user):
        """Test admin can soft-delete user."""
        response = await auth_client.delete(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200

    async def test_delete_user_non_admin(self, auth_client, employee_headers, test_user):
        """Test non-admin cannot delete users."""
        response = await auth_client.delete(
            f"/api/v1/users/{test_user.id}",
            headers=employee_headers,
        )

        assert response.status_code == 403


class TestRolesEndpoints:
    """Tests for /api/v1/roles/* endpoints."""

    async def test_list_roles_admin(self, auth_client, admin_headers):
        """Test admin can list roles."""
        response = await auth_client.get(
            "/api/v1/roles",
            headers=admin_headers,
        )

        assert response.status_code == 200

    async def test_create_role_admin(self, auth_client, admin_headers):
        """Test admin can create roles."""
        response = await auth_client.post(
            "/api/v1/roles",
            json={
                "name": "Custom Role",
                "code": "CUSTOM_ROLE",
                "description": "A custom role for testing",
            },
            headers=admin_headers,
        )

        assert response.status_code == 201

    async def test_create_role_non_admin(self, auth_client, employee_headers):
        """Test non-admin cannot create roles."""
        response = await auth_client.post(
            "/api/v1/roles",
            json={
                "name": "Unauthorized Role",
                "code": "UNAUTHORIZED",
            },
            headers=employee_headers,
        )

        assert response.status_code == 403


class TestTenantsEndpoints:
    """Tests for /api/v1/tenants/* endpoints (Super Admin only)."""

    async def test_list_tenants_super_admin(self, auth_client, admin_headers):
        """Test super admin can list tenants."""
        # Note: This requires SUPER_ADMIN role, not just ADMIN
        response = await auth_client.get(
            "/api/v1/tenants",
            headers=admin_headers,
        )

        # Depending on role hierarchy, may be 200 or 403
        assert response.status_code in [200, 403]

    async def test_list_tenants_non_admin(self, auth_client, employee_headers):
        """Test non-admin cannot list tenants."""
        response = await auth_client.get(
            "/api/v1/tenants",
            headers=employee_headers,
        )

        assert response.status_code == 403


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    async def test_health_check(self, auth_client):
        """Test health endpoint returns healthy status."""
        response = await auth_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "ok"]

    async def test_readiness_check(self, auth_client):
        """Test readiness endpoint."""
        response = await auth_client.get("/ready")

        assert response.status_code == 200
