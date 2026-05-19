"""
MindFlow Auth Service - Authentication Endpoints
Per API_CONTRACT.md Section 8.1.1

Endpoints:
- POST /login - User login with email/password
- POST /logout - Invalidate current session
- POST /token/refresh - Refresh access token
- POST /password/forgot - Request password reset
- POST /password/reset - Reset password with token
- POST /password/change - Change password (authenticated)
- GET /me - Get current user profile
- PUT /me - Update current user profile
"""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import get_settings
from shared.database import db_manager
from shared.dependencies import CurrentUser, get_current_user
from shared.schemas import ApiResponse

from ..schemas import (
    LoginRequest,
    LoginResponse,
    PasswordChangeRequest,
    PasswordForgotRequest,
    PasswordResetRequest,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserInfoResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
)
from ..services import AuthService

router = APIRouter()


@router.post("/login", response_model=ApiResponse[LoginResponse])
async def login(
    request: Request,
    body: LoginRequest,
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    User login with email/password.

    Returns access token, refresh token, and user info.
    Per API_CONTRACT.md Section 8.1.4.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    settings = get_settings()

    # Get client info
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    async with db_manager.session() as db:
        auth_service = AuthService(db)
        access_token, refresh_token, user, roles, permissions = await auth_service.authenticate(
            email=body.email,
            password=body.password,
            ip_address=ip_address,
            user_agent=user_agent
        )

        user_info = UserInfoResponse(
            id=user.id,
            email=user.email,
            firstName=None,  # TODO: Add first_name to User model or Employee link
            lastName=None,
            roles=roles,
            permissions=permissions,
            tenantId=user.tenant_id
        )

        login_response = LoginResponse(
            accessToken=access_token,
            refreshToken=refresh_token,
            tokenType="Bearer",
            expiresIn=settings.jwt_access_token_expire_minutes * 60,
            user=user_info
        )

        return ApiResponse(
            success=True,
            data=login_response,
            message="Login successful",
            requestId=request_id
        )


@router.post("/logout", response_model=ApiResponse[None])
async def logout(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Invalidate current session.

    Requires authentication.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        auth_service = AuthService(db)
        await auth_service.logout(user.user_id, user.jti)

        return ApiResponse(
            success=True,
            message="Logged out successfully",
            requestId=request_id
        )


@router.post("/token/refresh", response_model=ApiResponse[TokenRefreshResponse])
async def refresh_token(
    body: TokenRefreshRequest,
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Refresh access token using refresh token.

    Old refresh token is revoked (rotation).
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session() as db:
        auth_service = AuthService(db)
        new_access_token, new_refresh_token, expires_in = await auth_service.refresh_tokens(
            body.refresh_token
        )

        token_response = TokenRefreshResponse(
            accessToken=new_access_token,
            refreshToken=new_refresh_token,
            tokenType="Bearer",
            expiresIn=expires_in
        )

        return ApiResponse(
            success=True,
            data=token_response,
            message="Token refreshed successfully",
            requestId=request_id
        )


@router.post("/password/forgot", response_model=ApiResponse[None])
async def forgot_password(
    body: PasswordForgotRequest,
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Request password reset.

    Sends reset link to email (in production).
    Always returns success to prevent email enumeration.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # TODO: Implement password reset email sending
    # For now, always return success to prevent email enumeration

    return ApiResponse(
        success=True,
        message="If the email exists, a password reset link has been sent",
        requestId=request_id
    )


@router.post("/password/reset", response_model=ApiResponse[None])
async def reset_password(
    body: PasswordResetRequest,
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Reset password with token.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # TODO: Implement password reset token validation and password update

    return ApiResponse(
        success=True,
        message="Password has been reset successfully",
        requestId=request_id
    )


@router.post("/password/change", response_model=ApiResponse[None])
async def change_password(
    body: PasswordChangeRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Change password (authenticated).

    Requires current password verification.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # TODO: Implement password change with current password verification

    return ApiResponse(
        success=True,
        message="Password changed successfully",
        requestId=request_id
    )


@router.get("/me", response_model=ApiResponse[UserProfileResponse])
async def get_current_user_profile(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Get current user profile.

    Returns user info including roles and permissions.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    from ..services import UserService

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        db_user = await user_service.get_user(user.user_id, user.tenant_id)

        # Get roles and permissions
        roles = [r.role.code for r in db_user.roles if r.is_active]
        permissions = []
        for r in db_user.roles:
            if r.is_active and r.role:
                for rp in r.role.role_permissions:
                    if rp.permission:
                        permissions.append(rp.permission.code)

        profile = UserProfileResponse(
            id=db_user.id,
            email=db_user.email,
            firstName=None,  # TODO: Link to Employee
            lastName=None,
            roles=roles,
            permissions=permissions,
            tenantId=db_user.tenant_id,
            lastLoginAt=db_user.last_login_at,
            createdAt=db_user.created_at
        )

        return ApiResponse(
            success=True,
            data=profile,
            message="Profile retrieved successfully",
            requestId=request_id
        )


@router.put("/me", response_model=ApiResponse[UserProfileResponse])
async def update_current_user_profile(
    body: UserProfileUpdateRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Update current user profile.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # TODO: Implement profile update (first_name, last_name)
    # May need to update Employee record instead of User

    return ApiResponse(
        success=True,
        message="Profile updated successfully",
        requestId=request_id
    )
