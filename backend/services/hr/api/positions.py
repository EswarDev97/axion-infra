"""
MindFlow HR Service - Position Endpoints
Per API_CONTRACT.md Section 8.2.3
"""

from typing import Annotated
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
    PositionCreateRequest,
    PositionUpdateRequest,
    PositionResponse,
    PositionListResponse,
)
from ..services import PositionService

router = APIRouter(prefix="/positions", tags=["positions"])


def _position_to_response(pos) -> PositionResponse:
    """Convert Position model to PositionResponse schema."""
    return PositionResponse(
        id=pos.id,
        code=pos.code,
        title=pos.title,
        description=pos.description,
        departmentId=pos.department_id,
        departmentName=pos.department.name if pos.department else None,
        level=pos.level,
        isActive=pos.is_active,
        employeeCount=len(pos.employees) if hasattr(pos, 'employees') and pos.employees else 0,
        tenantId=pos.tenant_id,
        createdAt=pos.created_at,
        updatedAt=pos.updated_at
    )


@router.get("", response_model=ApiResponse[PositionListResponse])
async def list_positions(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    department_id: UUID | None = Query(None, alias="departmentId"),
    is_active: bool | None = Query(None, alias="isActive"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all positions."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PositionService(db)
        positions, total = await service.list_positions(
            user.tenant_id, pagination, department_id, is_active
        )

        items = [_position_to_response(p) for p in positions]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = PositionListResponse(
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
            message="Positions retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[PositionResponse], status_code=201)
async def create_position(
    body: PositionCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new position."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PositionService(db)
        position = await service.create_position(
            tenant_id=user.tenant_id,
            code=body.code,
            title=body.title,
            created_by=user.user_id,
            description=body.description,
            department_id=body.department_id,
            level=body.level
        )

        return ApiResponse(
            success=True,
            data=_position_to_response(position),
            message="Position created successfully",
            requestId=request_id
        )


@router.get("/{position_id}", response_model=ApiResponse[PositionResponse])
async def get_position(
    position_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get position by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PositionService(db)
        position = await service.get_position(position_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_position_to_response(position),
            message="Position retrieved successfully",
            requestId=request_id
        )


@router.put("/{position_id}", response_model=ApiResponse[PositionResponse])
async def update_position(
    position_id: UUID,
    body: PositionUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update position."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PositionService(db)
        position = await service.update_position(
            position_id=position_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            title=body.title,
            description=body.description,
            department_id=body.department_id,
            level=body.level,
            is_active=body.is_active
        )

        return ApiResponse(
            success=True,
            data=_position_to_response(position),
            message="Position updated successfully",
            requestId=request_id
        )


@router.delete("/{position_id}", response_model=ApiResponse[None])
async def delete_position(
    position_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:delete:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete position."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = PositionService(db)
        await service.delete_position(position_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Position deleted successfully",
            requestId=request_id
        )
