"""
MindFlow Auth Service - Pydantic Schemas
Per API_CONTRACT.md Section 8.1 (auth-module)
"""

from .auth import (
    LoginRequest,
    LoginResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    PasswordForgotRequest,
    PasswordResetRequest,
    PasswordChangeRequest,
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserInfoResponse,
)
from .user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
    UserListResponse,
)
from .role import (
    RoleCreateRequest,
    RoleUpdateRequest,
    RoleResponse,
    RoleListResponse,
    PermissionResponse,
    PermissionListResponse,
)
from .session import (
    SessionResponse,
    SessionListResponse,
)
from .tenant import (
    TenantCreateRequest,
    TenantUpdateRequest,
    TenantResponse,
    TenantListResponse,
)

__all__ = [
    # Auth
    "LoginRequest",
    "LoginResponse",
    "TokenRefreshRequest",
    "TokenRefreshResponse",
    "PasswordForgotRequest",
    "PasswordResetRequest",
    "PasswordChangeRequest",
    "UserProfileResponse",
    "UserProfileUpdateRequest",
    "UserInfoResponse",
    # User
    "UserCreateRequest",
    "UserUpdateRequest",
    "UserResponse",
    "UserListResponse",
    # Role
    "RoleCreateRequest",
    "RoleUpdateRequest",
    "RoleResponse",
    "RoleListResponse",
    "PermissionResponse",
    "PermissionListResponse",
    # Session
    "SessionResponse",
    "SessionListResponse",
    # Tenant
    "TenantCreateRequest",
    "TenantUpdateRequest",
    "TenantResponse",
    "TenantListResponse",
]
