"""
MindFlow Backend - FastAPI Dependencies
Per API_CONTRACT.md and SECURITY_ARCHITECTURE.md

Provides reusable dependencies for:
- Authentication (JWT validation)
- Authorization (permission checking)
- Database sessions with RLS context
- Pagination
"""

from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import Depends, Header, Query, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import db_manager
from .exceptions import (
    AuthTokenExpiredException,
    AuthTokenInvalidException,
    AuthzInsufficientPermissionException,
    ResourceNotFoundException,
)
from .schemas import PaginationParams
from .security import TokenError, decode_access_token


class CurrentUser:
    """
    Represents the current authenticated user from JWT.
    Per API_CONTRACT.md Section 2.1 (JWT Token Structure).
    """

    def __init__(
        self,
        user_id: UUID,
        tenant_id: UUID,
        email: str,
        roles: List[str],
        permissions: List[str],
        jti: str
    ):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.email = email
        self.roles = roles
        self.permissions = permissions
        self.jti = jti

    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        return permission in self.permissions

    def has_any_permission(self, permissions: List[str]) -> bool:
        """Check if user has any of the specified permissions."""
        return any(p in self.permissions for p in permissions)

    def has_all_permissions(self, permissions: List[str]) -> bool:
        """Check if user has all of the specified permissions."""
        return all(p in self.permissions for p in permissions)

    def has_role(self, role: str) -> bool:
        """Check if user has a specific role."""
        return role in self.roles

    def is_super_admin(self) -> bool:
        """Check if user is a super admin."""
        return "SUPER_ADMIN" in self.roles

    def is_system_admin(self) -> bool:
        """Check if user is a system admin."""
        return "SYSTEM_ADMIN" in self.roles or self.is_super_admin()


def extract_token_from_header(authorization: str = Header(None)) -> str:
    """
    Extract Bearer token from Authorization header.
    Per API_CONTRACT.md Section 2.2.
    """
    if not authorization:
        raise AuthTokenInvalidException("Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthTokenInvalidException("Invalid Authorization header format")

    return parts[1]


async def get_current_user(
    token: Annotated[str, Depends(extract_token_from_header)]
) -> CurrentUser:
    """
    Dependency to get the current authenticated user from JWT.

    Usage:
        @app.get("/me")
        async def get_me(user: CurrentUser = Depends(get_current_user)):
            return user.email
    """
    try:
        payload = decode_access_token(token)

        return CurrentUser(
            user_id=UUID(payload["user_id"]),
            tenant_id=UUID(payload["tenant_id"]),
            email=payload["email"],
            roles=payload.get("roles", []),
            permissions=payload.get("permissions", []),
            jti=payload["jti"]
        )
    except TokenError as e:
        if "expired" in str(e).lower():
            raise AuthTokenExpiredException()
        raise AuthTokenInvalidException(str(e))


async def get_optional_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[CurrentUser]:
    """
    Dependency to optionally get current user (for public endpoints with optional auth).
    """
    if not authorization:
        return None

    try:
        token = extract_token_from_header(authorization)
        return await get_current_user(token)
    except Exception:
        return None


async def get_db_session(
    user: CurrentUser = Depends(get_current_user)
) -> AsyncSession:
    """
    Dependency to get database session with RLS context from authenticated user.

    This automatically sets the tenant_id for Row-Level Security.
    """
    async with db_manager.session(tenant_id=user.tenant_id) as session:
        yield session


async def get_db_session_no_auth() -> AsyncSession:
    """
    Dependency to get database session without authentication.
    Used for public endpoints like login, registration.
    """
    async with db_manager.session() as session:
        yield session


def require_permission(permission: str):
    """
    Dependency factory to require a specific permission.
    SUPER_ADMIN bypasses all permission checks.

    Usage:
        @app.delete("/users/{user_id}")
        async def delete_user(
            user: CurrentUser = Depends(require_permission("auth:delete:all"))
        ):
            ...
    """
    async def permission_checker(
        user: CurrentUser = Depends(get_current_user)
    ) -> CurrentUser:
        # Super admin bypasses all permission checks
        if user.is_super_admin():
            return user
        if not user.has_permission(permission):
            raise AuthzInsufficientPermissionException(
                required=permission,
                actual=user.permissions
            )
        return user

    return permission_checker


def require_any_permission(permissions: List[str]):
    """
    Dependency factory to require any of the specified permissions.
    SUPER_ADMIN bypasses all permission checks.

    Usage:
        @app.get("/employees")
        async def list_employees(
            user: CurrentUser = Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))
        ):
            ...
    """
    async def permission_checker(
        user: CurrentUser = Depends(get_current_user)
    ) -> CurrentUser:
        # Super admin bypasses all permission checks
        if user.is_super_admin():
            return user
        if not user.has_any_permission(permissions):
            raise AuthzInsufficientPermissionException(
                message=f"Requires one of: {', '.join(permissions)}",
                required=", ".join(permissions),
                actual=user.permissions
            )
        return user

    return permission_checker


def require_role(role: str):
    """
    Dependency factory to require a specific role.

    Usage:
        @app.get("/admin/users")
        async def admin_list_users(
            user: CurrentUser = Depends(require_role("SYSTEM_ADMIN"))
        ):
            ...
    """
    async def role_checker(
        user: CurrentUser = Depends(get_current_user)
    ) -> CurrentUser:
        if not user.has_role(role) and not user.is_super_admin():
            raise AuthzInsufficientPermissionException(
                message=f"Requires role: {role}"
            )
        return user

    return role_checker


def get_pagination_params(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, alias="page_size", description="Items per page"),
    pageSize: int | None = Query(default=None, ge=1, le=100, description="Items per page (camelCase alias)"),
    sort_by: str = Query(default="created_at", description="Field to sort by"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$", description="Sort order")
) -> PaginationParams:
    """
    Dependency to parse pagination query parameters.
    Per API_CONTRACT.md Section 4.1.

    FastAPI's Query(alias=...) only accepts a single alias, but the frontend
    API client sends camelCase (pageSize) while the documented contract uses
    snake_case (page_size) — accept both explicitly so requests silently
    falling back to the default page size (20) don't hide records beyond it.
    """
    return PaginationParams(
        page=page,
        page_size=pageSize if pageSize is not None else page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )


async def get_tenant_id(
    user: CurrentUser = Depends(get_current_user)
) -> UUID:
    """
    Dependency to get the tenant ID from the current user.
    Used for multi-tenant data isolation.
    """
    return user.tenant_id


async def get_employee_id(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
) -> UUID:
    """
    Dependency to get the employee ID from the employees table by user_id.
    The employee_id and user_id are different UUIDs in the system.
    Falls back to user_id if no employee record is found.
    """
    result = await db.execute(
        text("SELECT id FROM employees WHERE user_id = :user_id LIMIT 1"),
        {"user_id": user.user_id}
    )
    row = result.fetchone()
    if row:
        return row[0]
    # Fallback: use user_id if no employee record exists (e.g., system admin)
    return user.user_id
