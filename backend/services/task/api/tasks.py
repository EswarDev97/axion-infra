"""
MindFlow Task Service - Task Endpoints
Per API_CONTRACT.md Section 8.3.1
"""

import logging
from datetime import date
from typing import Annotated, Dict, List, Set
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Header, Query
from sqlalchemy import String, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import Base, db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_any_permission,
    require_permission,
    get_current_user,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..services.integration_service import TaskIntegrationService

logger = logging.getLogger(__name__)


async def _resolve_user_names(db: AsyncSession, user_ids: Set[UUID]) -> Dict[UUID, str]:
    """Resolve user IDs to display names via the employees table."""
    if not user_ids:
        return {}
    result = await db.execute(
        text("""
            SELECT e.user_id, e.first_name || ' ' || e.last_name AS full_name
            FROM employees e
            WHERE e.user_id = ANY(:ids) AND e.is_deleted = false
        """),
        {"ids": list(user_ids)}
    )
    return {row[0]: row[1] for row in result.fetchall()}


async def _resolve_department_names(db: AsyncSession, dept_ids: Set[UUID]) -> Dict[UUID, str]:
    """Resolve department IDs to names."""
    if not dept_ids:
        return {}
    result = await db.execute(
        text("SELECT id, name FROM departments WHERE id = ANY(:ids)"),
        {"ids": list(dept_ids)}
    )
    return {row[0]: row[1] for row in result.fetchall()}

from ..schemas import (
    TaskCreateRequest,
    TaskUpdateRequest,
    TaskResponse,
    TaskListResponse,
    TaskFilters,
    TaskKanbanResponse,
    TaskKanbanColumn,
    TaskCalendarResponse,
    TaskCalendarEvent,
    TaskAssigneeCreateRequest,
    TaskAssigneeResponse,
    TaskCommentCreateRequest,
    TaskCommentUpdateRequest,
    TaskCommentResponse,
    TaskCommentListResponse,
    TaskAttachmentCreateRequest,
    TaskAttachmentResponse,
    TaskDependencyCreateRequest,
    TaskDependencyResponse,
)
from ..schemas.task import TaskAssigneeInfo
from ..services import TaskService

router = APIRouter(tags=["tasks"])


def _task_to_response(
    task,
    user_names: Dict[UUID, str] = None,
    dept_names: Dict[UUID, str] = None,
) -> TaskResponse:
    """Convert Task model to TaskResponse schema."""
    user_names = user_names or {}
    dept_names = dept_names or {}

    assignees = []
    if task.assignees:
        for a in task.assignees:
            assignees.append(TaskAssigneeInfo(
                id=a.id,
                userId=a.user_id,
                userName=user_names.get(a.user_id, f"User {str(a.user_id)[:8]}"),
                role=a.role
            ))

    dept_name = dept_names.get(task.department_id) if task.department_id else None
    creator_name = user_names.get(task.created_by) if task.created_by else None

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        statusId=task.status_id,
        statusName=task.status.name if task.status else "",
        statusColor=task.status.color if task.status else "#6B7280",
        priority=task.priority,
        departmentId=task.department_id,
        departmentName=dept_name,
        parentTaskId=task.parent_task_id,
        originType=task.origin_type,
        expectedCompletionDate=task.expected_completion_date,
        actualCompletionDate=task.actual_completion_date,
        estimatedHours=task.estimated_hours,
        actualHours=task.actual_hours,
        startedAt=task.started_at,
        completedAt=task.completed_at,
        timeTakenMinutes=task.time_taken_minutes,
        tags=task.tags or [],
        assignees=assignees,
        subtaskCount=len([st for st in task.subtasks if not st.is_deleted]) if task.subtasks else 0,
        commentCount=len([c for c in task.comments if not c.is_deleted]) if hasattr(task, 'comments') and task.comments else 0,
        attachmentCount=len(task.attachments) if hasattr(task, 'attachments') and task.attachments else 0,
        isOverdue=task.is_overdue,
        progressPercentage=task.progress_percentage,
        tenantId=task.tenant_id,
        createdAt=task.created_at,
        updatedAt=task.updated_at,
        createdBy=task.created_by
    )


def _collect_ids(tasks):
    """Collect all user IDs and department IDs from a list of tasks."""
    user_ids = set()
    dept_ids = set()
    for t in tasks:
        if t.created_by:
            user_ids.add(t.created_by)
        if t.assignees:
            for a in t.assignees:
                user_ids.add(a.user_id)
        if t.department_id:
            dept_ids.add(t.department_id)
    return user_ids, dept_ids


# ==================== Task CRUD ====================

@router.get("/", response_model=ApiResponse[TaskListResponse])
async def list_tasks(
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    status_id: UUID | None = Query(None, alias="statusId"),
    priority: str | None = Query(None),
    assignee_id: UUID | None = Query(None, alias="assigneeId"),
    parent_task_id: UUID | None = Query(None, alias="parentTaskId"),
    is_overdue: bool | None = Query(None, alias="isOverdue"),
    department_id: UUID | None = Query(None, alias="departmentId"),
    tags: List[str] | None = Query(None),
    search: str | None = Query(None),
    start_date: date | None = Query(None, alias="startDate"),
    end_date: date | None = Query(None, alias="endDate"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all tasks."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # For users with only task:read:own, enforce assignee filter to themselves
    # SUPER_ADMIN and users with task:read:all can see all tasks
    effective_assignee_id = assignee_id
    if not user.is_super_admin() and not user.has_permission("task:read:all"):
        effective_assignee_id = user.user_id

    filters = TaskFilters(
        statusId=status_id,
        priority=priority,
        assigneeId=effective_assignee_id,
        departmentId=department_id,
        parentTaskId=parent_task_id,
        isOverdue=is_overdue,
        tags=tags,
        search=search,
        startDate=start_date,
        endDate=end_date
    )

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        tasks, total = await service.list_tasks(user.tenant_id, pagination, filters)

        # Resolve user and department names
        user_ids, dept_ids = _collect_ids(tasks)
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        items = [_task_to_response(t, user_names, dept_names) for t in tasks]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = TaskListResponse(
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
            message="Tasks retrieved successfully",
            requestId=request_id
        )


@router.post("/", response_model=ApiResponse[TaskResponse], status_code=201)
async def create_task(
    body: TaskCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("task:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Create a new task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        task = await service.create_task(
            tenant_id=user.tenant_id,
            title=body.title,
            created_by=user.user_id,
            description=body.description,
            status_id=body.status_id,
            priority=body.priority,
            department_id=body.department_id,
            parent_task_id=body.parent_task_id,
            expected_completion_date=body.expected_completion_date,
            estimated_hours=body.estimated_hours,
            tags=body.tags,
            assignee_ids=body.assignee_ids
        )

        user_ids, dept_ids = _collect_ids([task])
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        return ApiResponse(
            success=True,
            data=_task_to_response(task, user_names, dept_names),
            message="Task created successfully",
            requestId=request_id
        )


@router.get("/my", response_model=ApiResponse[TaskListResponse])
async def get_my_tasks(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get tasks created by current user."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        tasks, total = await service.get_my_tasks(
            user.user_id, user.tenant_id, pagination
        )

        user_ids, dept_ids = _collect_ids(tasks)
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        items = [_task_to_response(t, user_names, dept_names) for t in tasks]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = TaskListResponse(
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
            message="My tasks retrieved successfully",
            requestId=request_id
        )


@router.get("/assigned/{user_id}", response_model=ApiResponse[TaskListResponse])
async def get_assigned_tasks(
    user_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get tasks assigned to an employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        tasks, total = await service.get_assigned_tasks(
            user_id, user.tenant_id, pagination
        )

        user_ids, dept_ids = _collect_ids(tasks)
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        items = [_task_to_response(t, user_names, dept_names) for t in tasks]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = TaskListResponse(
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
            message="Assigned tasks retrieved successfully",
            requestId=request_id
        )


@router.get("/views/kanban", response_model=ApiResponse[TaskKanbanResponse])
async def get_kanban_view(
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    assignee_id: UUID | None = Query(None, alias="assigneeId"),
    priority: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get Kanban board view."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    filters = TaskFilters(assigneeId=assignee_id, priority=priority)

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        result = await service.get_kanban_view(user.tenant_id, filters)

        # Collect all tasks across columns for name resolution
        all_tasks = []
        for col in result["columns"]:
            all_tasks.extend(col["tasks"])
        user_ids, dept_ids = _collect_ids(all_tasks)
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        columns = []
        for col in result["columns"]:
            columns.append(TaskKanbanColumn(
                statusId=col["status"].id,
                statusName=col["status"].name,
                statusColor=col["status"].color,
                tasks=[_task_to_response(t, user_names, dept_names) for t in col["tasks"]],
                count=col["count"]
            ))

        return ApiResponse(
            success=True,
            data=TaskKanbanResponse(
                columns=columns,
                totalTasks=result["total_tasks"]
            ),
            message="Kanban view retrieved successfully",
            requestId=request_id
        )


@router.get("/views/calendar", response_model=ApiResponse[TaskCalendarResponse])
async def get_calendar_view(
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    start_date: date = Query(..., alias="startDate"),
    end_date: date = Query(..., alias="endDate"),
    assignee_id: UUID | None = Query(None, alias="assigneeId"),
    priority: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get calendar view."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    filters = TaskFilters(assigneeId=assignee_id, priority=priority)

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        result = await service.get_calendar_view(
            user.tenant_id, start_date, end_date, filters
        )

        events = [
            TaskCalendarEvent(
                id=e["id"],
                title=e["title"],
                date=e["date"],
                priority=e["priority"],
                statusName=e["status_name"],
                statusColor=e["status_color"],
                isOverdue=e["is_overdue"]
            )
            for e in result["events"]
        ]

        return ApiResponse(
            success=True,
            data=TaskCalendarResponse(
                events=events,
                startDate=result["start_date"],
                endDate=result["end_date"]
            ),
            message="Calendar view retrieved successfully",
            requestId=request_id
        )


@router.get("/{task_id}", response_model=ApiResponse[TaskResponse])
async def get_task(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get task by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        task = await service.get_task(task_id, user.tenant_id)

        user_ids, dept_ids = _collect_ids([task])
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        return ApiResponse(
            success=True,
            data=_task_to_response(task, user_names, dept_names),
            message="Task retrieved successfully",
            requestId=request_id
        )


@router.put("/{task_id}", response_model=ApiResponse[TaskResponse])
async def update_task(
    task_id: UUID,
    body: TaskUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        task = await service.update_task(
            task_id=task_id,
            tenant_id=user.tenant_id,
            updated_by=user.user_id,
            title=body.title,
            description=body.description,
            status_id=body.status_id,
            priority=body.priority,
            department_id=body.department_id,
            expected_completion_date=body.expected_completion_date,
            actual_completion_date=body.actual_completion_date,
            estimated_hours=body.estimated_hours,
            actual_hours=body.actual_hours,
            tags=body.tags,
            assignee_ids=body.assignee_ids
        )

        user_ids, dept_ids = _collect_ids([task])
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        return ApiResponse(
            success=True,
            data=_task_to_response(task, user_names, dept_names),
            message="Task updated successfully",
            requestId=request_id
        )


@router.post("/{task_id}/start", response_model=ApiResponse[TaskResponse])
async def start_task(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:update:all", "task:update:owned", "task:update:own"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Start a task - records start time and sets status to In Progress."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        task = await service.start_task(task_id, user.tenant_id, user.user_id)

        user_ids, dept_ids = _collect_ids([task])
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        return ApiResponse(
            success=True,
            data=_task_to_response(task, user_names, dept_names),
            message="Task started successfully",
            requestId=request_id
        )


@router.post("/{task_id}/complete", response_model=ApiResponse[TaskResponse])
async def complete_task(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:update:all", "task:update:owned", "task:update:own"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Complete a task - records completion time and calculates time taken."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        task = await service.complete_task(task_id, user.tenant_id, user.user_id)

        user_ids, dept_ids = _collect_ids([task])
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        return ApiResponse(
            success=True,
            data=_task_to_response(task, user_names, dept_names),
            message="Task completed successfully",
            requestId=request_id
        )


@router.delete("/{task_id}", response_model=ApiResponse[None])
async def delete_task(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("task:delete:all"))],
    reason: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Soft delete task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        await service.delete_task(task_id, user.tenant_id, user.user_id, reason)

        return ApiResponse(
            success=True,
            message="Task deleted successfully",
            requestId=request_id
        )


# ==================== Subtasks ====================

@router.get("/{task_id}/subtasks", response_model=ApiResponse[TaskListResponse])
async def get_subtasks(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get subtasks of a task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        tasks, total = await service.get_subtasks(
            task_id, user.tenant_id, pagination
        )

        user_ids, dept_ids = _collect_ids(tasks)
        user_names = await _resolve_user_names(db, user_ids)
        dept_names = await _resolve_department_names(db, dept_ids)

        items = [_task_to_response(t, user_names, dept_names) for t in tasks]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = TaskListResponse(
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
            message="Subtasks retrieved successfully",
            requestId=request_id
        )


# ==================== Assignees ====================

@router.get("/{task_id}/assignees", response_model=ApiResponse[List[TaskAssigneeResponse]])
async def get_assignees(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get task assignees."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        assignees = await service.get_assignees(task_id, user.tenant_id)

        assignee_user_ids = {a.user_id for a in assignees}
        assignee_names = await _resolve_user_names(db, assignee_user_ids)

        items = [
            TaskAssigneeResponse(
                id=a.id,
                taskId=a.task_id,
                userId=a.user_id,
                userName=assignee_names.get(a.user_id, "Unknown"),
                role=a.role,
                assignedAt=a.assigned_at,
                assignedBy=a.assigned_by,
                tenantId=a.tenant_id
            )
            for a in assignees
        ]

        return ApiResponse(
            success=True,
            data=items,
            message="Task assignees retrieved successfully",
            requestId=request_id
        )


@router.post("/{task_id}/assignees", response_model=ApiResponse[TaskAssigneeResponse], status_code=201)
async def add_assignee(
    task_id: UUID,
    body: TaskAssigneeCreateRequest,
    background_tasks: BackgroundTasks,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Add assignee to task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        assignee = await service.add_assignee(
            task_id, body.user_id, user.tenant_id, user.user_id, body.role
        )

        # Get task info for notification
        task = await service.get_task(task_id, user.tenant_id)
        task_title = task.title if task else "Task"

        # Notify assignee in background
        async def notify_assignee():
            try:
                await TaskIntegrationService.on_task_assigned(
                    tenant_id=user.tenant_id,
                    task_id=task_id,
                    task_title=task_title,
                    assignee_id=body.user_id,
                    assigner_name=user.email or "Someone",
                )
            except Exception as e:
                logger.error(f"Failed to send task assignment notification: {e}")

        background_tasks.add_task(notify_assignee)

        assignee_names = await _resolve_user_names(db, {assignee.user_id})

        return ApiResponse(
            success=True,
            data=TaskAssigneeResponse(
                id=assignee.id,
                taskId=assignee.task_id,
                userId=assignee.user_id,
                userName=assignee_names.get(assignee.user_id, "Unknown"),
                role=assignee.role,
                assignedAt=assignee.assigned_at,
                assignedBy=assignee.assigned_by,
                tenantId=assignee.tenant_id
            ),
            message="Assignee added successfully",
            requestId=request_id
        )


@router.delete("/{task_id}/assignees/{user_id}", response_model=ApiResponse[None])
async def remove_assignee(
    task_id: UUID,
    user_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Remove assignee from task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        await service.remove_assignee(task_id, user_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Assignee removed successfully",
            requestId=request_id
        )


# ==================== Comments ====================

@router.get("/{task_id}/comments", response_model=ApiResponse[TaskCommentListResponse])
async def get_comments(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get task comments."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        comments, total = await service.get_comments(
            task_id, user.tenant_id, pagination
        )

        # Resolve comment author names
        comment_user_ids = {c.created_by for c in comments if c.created_by}
        comment_user_names = await _resolve_user_names(db, comment_user_ids)

        items = [
            TaskCommentResponse(
                id=c.id,
                taskId=c.task_id,
                parentId=c.parent_id,
                content=c.content,
                isInternal=c.is_internal,
                authorId=c.created_by,
                authorName=comment_user_names.get(c.created_by, "Unknown"),
                isDeleted=c.is_deleted,
                replyCount=len([r for r in c.replies if not r.is_deleted]) if c.replies else 0,
                tenantId=c.tenant_id,
                createdAt=c.created_at,
                updatedAt=c.updated_at
            )
            for c in comments
        ]

        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = TaskCommentListResponse(
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
            message="Task comments retrieved successfully",
            requestId=request_id
        )


@router.post("/{task_id}/comments", response_model=ApiResponse[TaskCommentResponse], status_code=201)
async def add_comment(
    task_id: UUID,
    body: TaskCommentCreateRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Add comment to task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        comment = await service.add_comment(
            task_id, body.content, user.tenant_id, user.user_id, body.parent_id, body.is_internal
        )

        author_names = await _resolve_user_names(db, {comment.created_by})

        return ApiResponse(
            success=True,
            data=TaskCommentResponse(
                id=comment.id,
                taskId=comment.task_id,
                parentId=comment.parent_id,
                content=comment.content,
                isInternal=comment.is_internal,
                authorId=comment.created_by,
                authorName=author_names.get(comment.created_by, "Unknown"),
                isDeleted=comment.is_deleted,
                replyCount=0,
                tenantId=comment.tenant_id,
                createdAt=comment.created_at,
                updatedAt=comment.updated_at
            ),
            message="Comment added successfully",
            requestId=request_id
        )


@router.put("/{task_id}/comments/{comment_id}", response_model=ApiResponse[TaskCommentResponse])
async def update_comment(
    task_id: UUID,
    comment_id: UUID,
    body: TaskCommentUpdateRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update task comment."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        comment = await service.update_comment(
            comment_id, task_id, body.content, user.tenant_id, user.user_id
        )

        author_names = await _resolve_user_names(db, {comment.created_by})

        return ApiResponse(
            success=True,
            data=TaskCommentResponse(
                id=comment.id,
                taskId=comment.task_id,
                parentId=comment.parent_id,
                content=comment.content,
                isInternal=comment.is_internal,
                authorId=comment.created_by,
                authorName=author_names.get(comment.created_by, "Unknown"),
                isDeleted=comment.is_deleted,
                replyCount=0,
                tenantId=comment.tenant_id,
                createdAt=comment.created_at,
                updatedAt=comment.updated_at
            ),
            message="Comment updated successfully",
            requestId=request_id
        )


@router.delete("/{task_id}/comments/{comment_id}", response_model=ApiResponse[None])
async def delete_comment(
    task_id: UUID,
    comment_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Delete task comment."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        await service.delete_comment(comment_id, task_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Comment deleted successfully",
            requestId=request_id
        )


# ==================== Attachments ====================

@router.get("/{task_id}/attachments", response_model=ApiResponse[List[TaskAttachmentResponse]])
async def get_attachments(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get task attachments."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        attachments = await service.get_attachments(task_id, user.tenant_id)

        attach_user_ids = {a.attached_by for a in attachments if a.attached_by}
        attach_names = await _resolve_user_names(db, attach_user_ids)

        items = [
            TaskAttachmentResponse(
                id=a.id,
                taskId=a.task_id,
                fileId=a.file_id,
                attachedBy=a.attached_by,
                attachedByName=attach_names.get(a.attached_by, "Unknown"),
                attachedAt=a.attached_at,
                tenantId=a.tenant_id,
                createdAt=a.created_at
            )
            for a in attachments
        ]

        return ApiResponse(
            success=True,
            data=items,
            message="Task attachments retrieved successfully",
            requestId=request_id
        )


@router.post("/{task_id}/attachments", response_model=ApiResponse[TaskAttachmentResponse], status_code=201)
async def add_attachment(
    task_id: UUID,
    body: TaskAttachmentCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Add attachment to task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        attachment = await service.add_attachment(
            task_id, body.file_id, user.tenant_id, user.user_id
        )

        attach_names = await _resolve_user_names(db, {attachment.attached_by})

        return ApiResponse(
            success=True,
            data=TaskAttachmentResponse(
                id=attachment.id,
                taskId=attachment.task_id,
                fileId=attachment.file_id,
                attachedBy=attachment.attached_by,
                attachedByName=attach_names.get(attachment.attached_by, "Unknown"),
                attachedAt=attachment.attached_at,
                tenantId=attachment.tenant_id,
                createdAt=attachment.created_at
            ),
            message="Attachment added successfully",
            requestId=request_id
        )


@router.delete("/{task_id}/attachments/{attachment_id}", response_model=ApiResponse[None])
async def remove_attachment(
    task_id: UUID,
    attachment_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Remove attachment from task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        await service.remove_attachment(attachment_id, task_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Attachment removed successfully",
            requestId=request_id
        )


# ==================== Dependencies ====================

@router.get("/{task_id}/dependencies", response_model=ApiResponse[List[TaskDependencyResponse]])
async def get_dependencies(
    task_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["task:read:all", "task:read:assigned", "task:read:own"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get task dependencies."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        dependencies = await service.get_dependencies(task_id, user.tenant_id)

        items = [
            TaskDependencyResponse(
                id=d.id,
                taskId=d.task_id,
                taskTitle=d.task.title if d.task else "",
                dependsOnTaskId=d.depends_on_task_id,
                dependsOnTaskTitle=d.depends_on_task.title if d.depends_on_task else "",
                dependsOnTaskStatus=d.depends_on_task.status.name if d.depends_on_task and d.depends_on_task.status else "",
                dependencyType=d.dependency_type,
                tenantId=d.tenant_id,
                createdAt=d.created_at,
                createdBy=d.created_by
            )
            for d in dependencies
        ]

        return ApiResponse(
            success=True,
            data=items,
            message="Task dependencies retrieved successfully",
            requestId=request_id
        )


@router.post("/{task_id}/dependencies", response_model=ApiResponse[TaskDependencyResponse], status_code=201)
async def add_dependency(
    task_id: UUID,
    body: TaskDependencyCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Add dependency to task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        dependency = await service.add_dependency(
            task_id, body.depends_on_task_id, user.tenant_id,
            user.user_id, body.dependency_type
        )

        # Reload with relationships
        deps = await service.get_dependencies(task_id, user.tenant_id)
        dep = next((d for d in deps if d.id == dependency.id), dependency)

        return ApiResponse(
            success=True,
            data=TaskDependencyResponse(
                id=dep.id,
                taskId=dep.task_id,
                taskTitle=dep.task.title if dep.task else "",
                dependsOnTaskId=dep.depends_on_task_id,
                dependsOnTaskTitle=dep.depends_on_task.title if dep.depends_on_task else "",
                dependsOnTaskStatus=dep.depends_on_task.status.name if dep.depends_on_task and dep.depends_on_task.status else "",
                dependencyType=dep.dependency_type,
                tenantId=dep.tenant_id,
                createdAt=dep.created_at,
                createdBy=dep.created_by
            ),
            message="Dependency added successfully",
            requestId=request_id
        )


@router.delete("/{task_id}/dependencies/{dependency_id}", response_model=ApiResponse[None])
async def remove_dependency(
    task_id: UUID,
    dependency_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("task:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Remove dependency from task."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = TaskService(db)
        await service.remove_dependency(dependency_id, task_id, user.tenant_id)

        return ApiResponse(
            success=True,
            message="Dependency removed successfully",
            requestId=request_id
        )
