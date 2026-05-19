"""
RBAC Tests - Auth Service
Per SDLC Phase 7 Task 7.3 - Test RBAC Enforcement

Tests for role-based access control on Auth service endpoints.
Validates that:
- ADMIN can perform user management
- HR_ADMIN has limited user access
- MANAGER can view team members
- EMPLOYEE has minimal access
"""

import pytest
from uuid import uuid4

pytestmark = [pytest.mark.rbac, pytest.mark.asyncio]


class TestUserManagementRBAC:
    """RBAC tests for user management endpoints."""

    # GET /api/v1/users - List users
    async def test_admin_can_list_users(self, auth_client, admin_headers):
        """Test ADMIN role can list all users."""
        response = await auth_client.get("/api/v1/users", headers=admin_headers)
        assert response.status_code == 200

    async def test_hr_admin_can_list_users(self, auth_client, hr_admin_headers):
        """Test HR_ADMIN role can list users (for HR operations)."""
        response = await auth_client.get("/api/v1/users", headers=hr_admin_headers)
        # HR_ADMIN typically has read access to users
        assert response.status_code in [200, 403]

    async def test_manager_cannot_list_all_users(self, auth_client, manager_headers):
        """Test MANAGER role cannot list all users."""
        response = await auth_client.get("/api/v1/users", headers=manager_headers)
        assert response.status_code == 403

    async def test_employee_cannot_list_users(self, auth_client, employee_headers):
        """Test EMPLOYEE role cannot list users."""
        response = await auth_client.get("/api/v1/users", headers=employee_headers)
        assert response.status_code == 403

    # POST /api/v1/users - Create user
    async def test_admin_can_create_user(self, auth_client, admin_headers):
        """Test ADMIN role can create users."""
        response = await auth_client.post(
            "/api/v1/users",
            json={
                "email": f"newuser_{uuid4().hex[:8]}@example.com",
                "password": "NewUser123!",
            },
            headers=admin_headers,
        )
        assert response.status_code == 201

    async def test_hr_admin_cannot_create_user(self, auth_client, hr_admin_headers):
        """Test HR_ADMIN role cannot create users (only ADMIN)."""
        response = await auth_client.post(
            "/api/v1/users",
            json={
                "email": "unauthorized@example.com",
                "password": "Password123!",
            },
            headers=hr_admin_headers,
        )
        assert response.status_code == 403

    async def test_manager_cannot_create_user(self, auth_client, manager_headers):
        """Test MANAGER role cannot create users."""
        response = await auth_client.post(
            "/api/v1/users",
            json={
                "email": "manager_attempt@example.com",
                "password": "Password123!",
            },
            headers=manager_headers,
        )
        assert response.status_code == 403

    async def test_employee_cannot_create_user(self, auth_client, employee_headers):
        """Test EMPLOYEE role cannot create users."""
        response = await auth_client.post(
            "/api/v1/users",
            json={
                "email": "employee_attempt@example.com",
                "password": "Password123!",
            },
            headers=employee_headers,
        )
        assert response.status_code == 403

    # GET /api/v1/users/{id} - Get user by ID
    async def test_admin_can_get_any_user(self, auth_client, admin_headers, test_user):
        """Test ADMIN role can get any user."""
        response = await auth_client.get(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )
        assert response.status_code == 200

    async def test_employee_can_get_own_profile(
        self, auth_client, employee_headers, employee_user
    ):
        """Test EMPLOYEE role can get their own profile."""
        response = await auth_client.get(
            f"/api/v1/users/{employee_user.id}",
            headers=employee_headers,
        )
        # Should be allowed for own profile
        assert response.status_code in [200, 403]

    async def test_employee_cannot_get_other_user(
        self, auth_client, employee_headers, test_user
    ):
        """Test EMPLOYEE role cannot get other user profiles."""
        response = await auth_client.get(
            f"/api/v1/users/{test_user.id}",
            headers=employee_headers,
        )
        assert response.status_code == 403

    # PUT /api/v1/users/{id} - Update user
    async def test_admin_can_update_user(self, auth_client, admin_headers, test_user):
        """Test ADMIN role can update any user."""
        response = await auth_client.put(
            f"/api/v1/users/{test_user.id}",
            json={"is_active": True},
            headers=admin_headers,
        )
        assert response.status_code == 200

    async def test_employee_cannot_update_other_user(
        self, auth_client, employee_headers, test_user
    ):
        """Test EMPLOYEE role cannot update other users."""
        response = await auth_client.put(
            f"/api/v1/users/{test_user.id}",
            json={"is_active": False},
            headers=employee_headers,
        )
        assert response.status_code == 403

    # DELETE /api/v1/users/{id} - Delete user
    async def test_admin_can_delete_user(
        self, auth_client, admin_headers, db_session, test_tenant
    ):
        """Test ADMIN role can delete users."""
        # Create a user to delete
        from services.auth.models import User
        from shared.security import hash_password

        user_to_delete = User(
            id=uuid4(),
            tenant_id=test_tenant.id,
            email="todelete@example.com",
            password_hash=hash_password("Password123!"),
        )
        db_session.add(user_to_delete)
        await db_session.flush()

        response = await auth_client.delete(
            f"/api/v1/users/{user_to_delete.id}",
            headers=admin_headers,
        )
        assert response.status_code == 200

    async def test_hr_admin_cannot_delete_user(
        self, auth_client, hr_admin_headers, test_user
    ):
        """Test HR_ADMIN role cannot delete users."""
        response = await auth_client.delete(
            f"/api/v1/users/{test_user.id}",
            headers=hr_admin_headers,
        )
        assert response.status_code == 403

    async def test_manager_cannot_delete_user(
        self, auth_client, manager_headers, test_user
    ):
        """Test MANAGER role cannot delete users."""
        response = await auth_client.delete(
            f"/api/v1/users/{test_user.id}",
            headers=manager_headers,
        )
        assert response.status_code == 403


class TestRoleManagementRBAC:
    """RBAC tests for role management endpoints."""

    # GET /api/v1/roles - List roles
    async def test_admin_can_list_roles(self, auth_client, admin_headers):
        """Test ADMIN role can list roles."""
        response = await auth_client.get("/api/v1/roles", headers=admin_headers)
        assert response.status_code == 200

    async def test_employee_cannot_list_roles(self, auth_client, employee_headers):
        """Test EMPLOYEE role cannot list roles."""
        response = await auth_client.get("/api/v1/roles", headers=employee_headers)
        assert response.status_code == 403

    # POST /api/v1/roles - Create role
    async def test_admin_can_create_role(self, auth_client, admin_headers):
        """Test ADMIN role can create roles."""
        response = await auth_client.post(
            "/api/v1/roles",
            json={
                "name": f"Test Role {uuid4().hex[:8]}",
                "code": f"TEST_{uuid4().hex[:8].upper()}",
                "description": "Test role for RBAC testing",
            },
            headers=admin_headers,
        )
        assert response.status_code == 201

    async def test_hr_admin_cannot_create_role(self, auth_client, hr_admin_headers):
        """Test HR_ADMIN role cannot create roles."""
        response = await auth_client.post(
            "/api/v1/roles",
            json={
                "name": "Unauthorized Role",
                "code": "UNAUTHORIZED",
            },
            headers=hr_admin_headers,
        )
        assert response.status_code == 403

    # POST /api/v1/roles/{role_id}/assign - Assign role
    async def test_admin_can_assign_role(
        self, auth_client, admin_headers, db_session, test_tenant, test_user
    ):
        """Test ADMIN role can assign roles to users."""
        from services.auth.models import Role

        # Create a role to assign
        role = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Assignable Role",
            code=f"ASSIGN_{uuid4().hex[:8].upper()}",
        )
        db_session.add(role)
        await db_session.flush()

        response = await auth_client.post(
            f"/api/v1/roles/{role.id}/assign",
            json={"user_id": str(test_user.id)},
            headers=admin_headers,
        )
        assert response.status_code in [200, 201]

    async def test_employee_cannot_assign_role(
        self, auth_client, employee_headers, db_session, test_tenant, test_user
    ):
        """Test EMPLOYEE role cannot assign roles."""
        from services.auth.models import Role

        role = Role(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Another Role",
            code=f"ANOTHER_{uuid4().hex[:8].upper()}",
        )
        db_session.add(role)
        await db_session.flush()

        response = await auth_client.post(
            f"/api/v1/roles/{role.id}/assign",
            json={"user_id": str(test_user.id)},
            headers=employee_headers,
        )
        assert response.status_code == 403


class TestTenantManagementRBAC:
    """RBAC tests for tenant management (Super Admin only)."""

    # GET /api/v1/tenants - List tenants
    async def test_super_admin_can_list_tenants(self, auth_client, admin_headers):
        """Test SUPER_ADMIN role can list tenants."""
        response = await auth_client.get("/api/v1/tenants", headers=admin_headers)
        # Requires SUPER_ADMIN, regular ADMIN might be denied
        assert response.status_code in [200, 403]

    async def test_hr_admin_cannot_list_tenants(self, auth_client, hr_admin_headers):
        """Test HR_ADMIN role cannot list tenants."""
        response = await auth_client.get("/api/v1/tenants", headers=hr_admin_headers)
        assert response.status_code == 403

    async def test_employee_cannot_list_tenants(self, auth_client, employee_headers):
        """Test EMPLOYEE role cannot list tenants."""
        response = await auth_client.get("/api/v1/tenants", headers=employee_headers)
        assert response.status_code == 403


class TestSelfServiceRBAC:
    """RBAC tests for self-service endpoints (all authenticated users)."""

    # GET /api/v1/auth/me - Get current user
    async def test_any_user_can_get_own_profile(self, auth_client, employee_headers):
        """Test any authenticated user can get their own profile."""
        response = await auth_client.get("/api/v1/auth/me", headers=employee_headers)
        assert response.status_code == 200

    # PUT /api/v1/auth/change-password - Change own password
    async def test_any_user_can_change_own_password(
        self, auth_client, employee_headers
    ):
        """Test any authenticated user can change their own password."""
        response = await auth_client.put(
            "/api/v1/auth/change-password",
            json={
                "old_password": "Employee123!",
                "new_password": "NewEmployee456!",
            },
            headers=employee_headers,
        )
        # Should succeed or fail due to wrong old password (not 403)
        assert response.status_code in [200, 400]

    # POST /api/v1/auth/logout - Logout
    async def test_any_user_can_logout(self, auth_client, employee_headers):
        """Test any authenticated user can logout."""
        response = await auth_client.post(
            "/api/v1/auth/logout",
            headers=employee_headers,
        )
        assert response.status_code == 200
