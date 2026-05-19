"""
MindFlow Auth Service - User Management Endpoints
Per API_CONTRACT.md Section 8.1.2

Endpoints:
- GET /users - List all users
- POST /users - Create new user
- GET /users/{user_id} - Get user by ID
- PUT /users/{user_id} - Update user
- DELETE /users/{user_id} - Deactivate user
- POST /users/{user_id}/activate - Reactivate user
- POST /users/{user_id}/unlock - Unlock locked account
"""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_permission,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import (
    UserCreateRequest,
    UserListResponse,
    UserResponse,
    UserUpdateRequest,
)
from ..services import UserService

router = APIRouter(prefix="/users", tags=["users"])


def _user_to_response(user) -> UserResponse:
    """Convert User model to UserResponse schema."""
    roles = [r.role.code for r in user.roles if r.is_active and r.role]
    status = "ACTIVE"
    if user.is_deleted:
        status = "DELETED"
    elif not user.is_active:
        status = "INACTIVE"
    elif user.is_locked:
        status = "LOCKED"

    return UserResponse(
        id=user.id,
        email=user.email,
        firstName=None,  # TODO: Link to Employee
        lastName=None,
        roles=roles,
        tenantId=user.tenant_id,
        status=status,
        isActive=user.is_active,
        isLocked=user.is_locked,
        lastLoginAt=user.last_login_at,
        createdAt=user.created_at,
        updatedAt=user.updated_at
    )


@router.get("", response_model=ApiResponse[UserListResponse])
async def list_users(
    user: Annotated[CurrentUser, Depends(require_permission("auth:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    List all users.

    Requires permission: auth:read:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        users, total = await user_service.list_users(user.tenant_id, pagination)

        items = [_user_to_response(u) for u in users]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = UserListResponse(
            items=items,
            pagination=PaginationMeta(
                page=pagination.page,
                pageSize=pagination.page_size,
                totalItems=total,
                totalPages=total_pages,
                hasNext=pagination.page < total_pages,
                hasPrevious=pagination.page > 1
            )
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Users retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[UserResponse], status_code=201)
async def create_user(
    body: UserCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("auth:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Create new user.

    Requires permission: auth:create:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        new_user = await user_service.create_user(
            tenant_id=body.tenant_id or user.tenant_id,
            email=body.email,
            password=body.password,
            roles=body.roles,
            created_by=user.user_id,
            first_name=body.first_name,
            last_name=body.last_name
        )

        return ApiResponse(
            success=True,
            data=_user_to_response(new_user),
            message="User created successfully",
            requestId=request_id
        )


@router.get("/{user_id}", response_model=ApiResponse[UserResponse])
async def get_user(
    user_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("auth:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Get user by ID.

    Requires permission: auth:read:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        db_user = await user_service.get_user(user_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_user_to_response(db_user),
            message="User retrieved successfully",
            requestId=request_id
        )


@router.put("/{user_id}", response_model=ApiResponse[UserResponse])
async def update_user(
    user_id: UUID,
    body: UserUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("auth:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Update user.

    Requires permission: auth:update:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        updated_user = await user_service.update_user(
            user_id=user_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            email=body.email,
            is_active=body.is_active,
            roles=body.roles
        )

        return ApiResponse(
            success=True,
            data=_user_to_response(updated_user),
            message="User updated successfully",
            requestId=request_id
        )


@router.delete("/{user_id}", response_model=ApiResponse[None], status_code=200)
async def delete_user(
    user_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("auth:delete:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Deactivate (soft delete) user.

    Requires permission: auth:delete:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        await user_service.delete_user(
            user_id=user_id,
            tenant_id=user.tenant_id,
            deleted_by=user.user_id
        )

        return ApiResponse(
            success=True,
            message="User deactivated successfully",
            requestId=request_id
        )


@router.post("/{user_id}/activate", response_model=ApiResponse[UserResponse])
async def activate_user(
    user_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("auth:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Reactivate user.

    Requires permission: auth:update:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        activated_user = await user_service.activate_user(
            user_id=user_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id
        )

        return ApiResponse(
            success=True,
            data=_user_to_response(activated_user),
            message="User activated successfully",
            requestId=request_id
        )


@router.post("/{user_id}/unlock", response_model=ApiResponse[UserResponse])
async def unlock_user(
    user_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("auth:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Unlock locked account.

    Requires permission: auth:update:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        user_service = UserService(db)
        unlocked_user = await user_service.unlock_user(
            user_id=user_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id
        )

        return ApiResponse(
            success=True,
            data=_user_to_response(unlocked_user),
            message="User unlocked successfully",
            requestId=request_id
        )
