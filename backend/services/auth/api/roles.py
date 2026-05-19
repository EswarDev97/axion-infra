"""
MindFlow Auth Service - Role & Permission Endpoints
Per API_CONTRACT.md Section 8.1.3

Endpoints:
- GET /roles - List all roles
- POST /roles - Create custom role
- GET /roles/{role_id} - Get role details
- PUT /roles/{role_id} - Update role
- DELETE /roles/{role_id} - Delete role
- GET /permissions - List all permissions
- PUT /users/{user_id}/roles - Assign roles to user
"""

from typing import Annotated, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_permission,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import (
    PermissionListResponse,
    PermissionResponse,
    RoleCreateRequest,
    RoleListResponse,
    RoleResponse,
    RoleUpdateRequest,
)
from ..services import RoleService

router = APIRouter(prefix="/roles", tags=["roles"])


def _role_to_response(role) -> RoleResponse:
    """Convert Role model to RoleResponse schema."""
    permissions = [
        rp.permission.code
        for rp in role.role_permissions
        if rp.permission
    ]

    return RoleResponse(
        id=role.id,
        code=role.code,
        name=role.name,
        description=role.description,
        isSystemRole=role.is_system_role,
        permissions=permissions,
        createdAt=role.created_at,
        updatedAt=role.updated_at
    )


@router.get("", response_model=ApiResponse[RoleListResponse])
async def list_roles(
    user: Annotated[CurrentUser, Depends(require_permission("auth:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    List all roles.

    Requires permission: auth:read:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        role_service = RoleService(db)
        roles, total = await role_service.list_roles(user.tenant_id, pagination)

        items = [_role_to_response(r) for r in roles]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = RoleListResponse(
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
            message="Roles retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[RoleResponse], status_code=201)
async def create_role(
    body: RoleCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("auth:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Create custom role.

    Requires permission: auth:create:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        role_service = RoleService(db)
        new_role = await role_service.create_role(
            tenant_id=user.tenant_id,
            code=body.code,
            name=body.name,
            created_by=user.user_id,
            description=body.description,
            permissions=body.permissions
        )

        return ApiResponse(
            success=True,
            data=_role_to_response(new_role),
            message="Role created successfully",
            requestId=request_id
        )


@router.get("/permissions", response_model=ApiResponse[PermissionListResponse])
async def list_permissions(
    user: Annotated[CurrentUser, Depends(require_permission("auth:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    module: Annotated[Optional[str], Query()] = None,
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    List all permissions.

    Requires permission: auth:read:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        role_service = RoleService(db)
        permissions, total = await role_service.list_permissions(pagination, module)

        items = [
            PermissionResponse(
                id=p.id,
                code=p.code,
                name=p.name,
                module=p.module,
                action=p.action,
                resourceScope=p.resource_scope,
                description=p.description
            )
            for p in permissions
        ]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = PermissionListResponse(
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
            message="Permissions retrieved successfully",
            requestId=request_id
        )


@router.get("/{role_id}", response_model=ApiResponse[RoleResponse])
async def get_role(
    role_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("auth:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Get role details.

    Requires permission: auth:read:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        role_service = RoleService(db)
        role = await role_service.get_role(role_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_role_to_response(role),
            message="Role retrieved successfully",
            requestId=request_id
        )


@router.put("/{role_id}", response_model=ApiResponse[RoleResponse])
async def update_role(
    role_id: UUID,
    body: RoleUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("auth:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Update role.

    Requires permission: auth:update:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        role_service = RoleService(db)
        updated_role = await role_service.update_role(
            role_id=role_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            name=body.name,
            description=body.description,
            permissions=body.permissions
        )

        return ApiResponse(
            success=True,
            data=_role_to_response(updated_role),
            message="Role updated successfully",
            requestId=request_id
        )


@router.delete("/{role_id}", response_model=ApiResponse[None])
async def delete_role(
    role_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("auth:delete:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Delete role.

    Requires permission: auth:delete:all
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        role_service = RoleService(db)
        await role_service.delete_role(role_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Role deleted successfully",
            requestId=request_id
        )


