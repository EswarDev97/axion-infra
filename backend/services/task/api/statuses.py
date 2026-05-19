"""
MindFlow Task Service - Task Status Endpoints
Per API_CONTRACT.md Section 8.3.6
"""

from typing import Annotated, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_any_permission,
    require_permission,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import (
    TaskStatusCreateRequest,
    TaskStatusUpdateRequest,
    TaskStatusResponse,
    TaskStatusListResponse,
)
from ..services import TaskStatusService

router = APIRouter(prefix="/statuses", tags=["task-statuses"])


def _status_to_response(status) -> TaskStatusResponse:
    """Convert TaskStatus model to TaskStatusResponse schema."""
    return TaskStatusResponse(
        id=status.id,
        code=status.code,
        name=status.name,
        description=status.description,
        color=status.color,
        sortOrder=status.sort_order,
        isDefault=status.is_default,
        isTerminal=status.is_terminal,
        allowedTransitions=status.allowed_transitions,
        isActive=status.is_active,
        taskCount=len(status.tasks) if hasattr(status, 'tasks') and status.tasks else 0,
        tenantId=status.tenant_id,
        createdAt=status.created_at,
        updatedAt=status.updated_at
    )


@router.get("", response_model=ApiResponse[TaskStatusListResponse])
async def list_statuses(
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    is_active: bool | None = Query(None, alias="isActive"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all task statuses."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskStatusService(db)
        statuses, total = await service.list_statuses(
            user.tenant_id, pagination, is_active
        )

        items = [_status_to_response(s) for s in statuses]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = TaskStatusListResponse(
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
            message="Task statuses retrieved successfully",
            requestId=request_id
        )


@router.post("", response_model=ApiResponse[TaskStatusResponse], status_code=201)
async def create_status(
    body: TaskStatusCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("task:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new task status."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskStatusService(db)
        status = await service.create_status(
            tenant_id=user.tenant_id,
            code=body.code,
            name=body.name,
            created_by=user.user_id,
            description=body.description,
            color=body.color,
            sort_order=body.sort_order,
            is_default=body.is_default,
            is_terminal=body.is_terminal,
            allowed_transitions=body.allowed_transitions
        )

        return ApiResponse(
            success=True,
            data=_status_to_response(status),
            message="Task status created successfully",
            requestId=request_id
        )


@router.post("/initialize", response_model=ApiResponse[List[TaskStatusResponse]])
async def initialize_statuses(
    user: Annotated[CurrentUser, Depends(require_permission("task:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Initialize default task statuses for tenant."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskStatusService(db)
        statuses = await service.initialize_default_statuses(
            user.tenant_id, user.user_id
        )

        return ApiResponse(
            success=True,
            data=[_status_to_response(s) for s in statuses],
            message="Default task statuses initialized successfully",
            requestId=request_id
        )


@router.get("/{status_id}", response_model=ApiResponse[TaskStatusResponse])
async def get_status(
    status_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get task status by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskStatusService(db)
        status = await service.get_status(status_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_status_to_response(status),
            message="Task status retrieved successfully",
            requestId=request_id
        )


@router.put("/{status_id}", response_model=ApiResponse[TaskStatusResponse])
async def update_status(
    status_id: UUID,
    body: TaskStatusUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update task status."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskStatusService(db)
        status = await service.update_status(
            status_id=status_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            name=body.name,
            description=body.description,
            color=body.color,
            sort_order=body.sort_order,
            is_default=body.is_default,
            is_terminal=body.is_terminal,
            allowed_transitions=body.allowed_transitions,
            is_active=body.is_active
        )

        return ApiResponse(
            success=True,
            data=_status_to_response(status),
            message="Task status updated successfully",
            requestId=request_id
        )


@router.delete("/{status_id}", response_model=ApiResponse[None])
async def delete_status(
    status_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("task:delete:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete task status."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskStatusService(db)
        await service.delete_status(status_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Task status deleted successfully",
            requestId=request_id
        )
