"""
MindFlow Task Service - Task Schemas
Per API_CONTRACT.md Section 8.3.1
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class TaskCreateRequest(BaseModel):
    """POST /tasks request body."""
    title: str = Field(max_length=255)
    description: Optional[str] = None
    status_id: Optional[UUID] = Field(None, alias="statusId")
    priority: str = Field(default="MEDIUM")
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    parent_task_id: Optional[UUID] = Field(None, alias="parentTaskId")
    expected_completion_date: Optional[date] = Field(None, alias="expectedCompletionDate")
    estimated_hours: Optional[Decimal] = Field(None, alias="estimatedHours", ge=0)
    tags: List[str] = Field(default_factory=list)
    assignee_ids: List[UUID] = Field(default_factory=list, alias="assigneeIds")

    model_config = ConfigDict(populate_by_name=True)


class TaskUpdateRequest(BaseModel):
    """PUT /tasks/{id} request body."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status_id: Optional[UUID] = Field(None, alias="statusId")
    priority: Optional[str] = None
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    expected_completion_date: Optional[date] = Field(None, alias="expectedCompletionDate")
    actual_completion_date: Optional[date] = Field(None, alias="actualCompletionDate")
    estimated_hours: Optional[Decimal] = Field(None, alias="estimatedHours", ge=0)
    actual_hours: Optional[Decimal] = Field(None, alias="actualHours", ge=0)
    tags: Optional[List[str]] = None
    assignee_ids: Optional[List[UUID]] = Field(None, alias="assigneeIds")

    model_config = ConfigDict(populate_by_name=True)


class TaskFilters(BaseModel):
    """Query filters for task list."""
    status_id: Optional[UUID] = Field(None, alias="statusId")
    priority: Optional[str] = None
    assignee_id: Optional[UUID] = Field(None, alias="assigneeId")
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    parent_task_id: Optional[UUID] = Field(None, alias="parentTaskId")
    is_overdue: Optional[bool] = Field(None, alias="isOverdue")
    tags: Optional[List[str]] = None
    search: Optional[str] = None
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")

    model_config = ConfigDict(populate_by_name=True)


class TaskAssigneeInfo(BaseModel):
    """Assignee info embedded in task response."""
    id: UUID
    user_id: UUID = Field(alias="userId")
    user_name: str = Field(alias="userName")
    role: str

    model_config = ConfigDict(populate_by_name=True)


class TaskResponse(BaseModel):
    """Task response schema."""
    id: UUID
    title: str
    description: Optional[str] = None
    status_id: UUID = Field(alias="statusId")
    status_name: str = Field(alias="statusName")
    status_color: str = Field(alias="statusColor")
    priority: str
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    department_name: Optional[str] = Field(None, alias="departmentName")
    parent_task_id: Optional[UUID] = Field(None, alias="parentTaskId")
    origin_type: str = Field(alias="originType")
    expected_completion_date: Optional[date] = Field(None, alias="expectedCompletionDate")
    actual_completion_date: Optional[date] = Field(None, alias="actualCompletionDate")
    estimated_hours: Optional[Decimal] = Field(None, alias="estimatedHours")
    actual_hours: Optional[Decimal] = Field(None, alias="actualHours")
    started_at: Optional[datetime] = Field(None, alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    time_taken_minutes: Optional[int] = Field(None, alias="timeTakenMinutes")
    tags: List[str]
    assignees: List[TaskAssigneeInfo] = Field(default_factory=list)
    subtask_count: int = Field(default=0, alias="subtaskCount")
    comment_count: int = Field(default=0, alias="commentCount")
    attachment_count: int = Field(default=0, alias="attachmentCount")
    is_overdue: bool = Field(alias="isOverdue")
    progress_percentage: Optional[int] = Field(None, alias="progressPercentage")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: Optional[UUID] = Field(None, alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TaskListResponse(PaginatedData[TaskResponse]):
    """Paginated list of tasks."""
    pass


class TaskKanbanColumn(BaseModel):
    """Single column in Kanban view."""
    status_id: UUID = Field(alias="statusId")
    status_name: str = Field(alias="statusName")
    status_color: str = Field(alias="statusColor")
    tasks: List[TaskResponse]
    count: int

    model_config = ConfigDict(populate_by_name=True)


class TaskKanbanResponse(BaseModel):
    """Kanban board view response."""
    columns: List[TaskKanbanColumn]
    total_tasks: int = Field(alias="totalTasks")

    model_config = ConfigDict(populate_by_name=True)


class TaskCalendarEvent(BaseModel):
    """Task as calendar event."""
    id: UUID
    title: str
    date: date
    priority: str
    status_name: str = Field(alias="statusName")
    status_color: str = Field(alias="statusColor")
    is_overdue: bool = Field(alias="isOverdue")

    model_config = ConfigDict(populate_by_name=True)


class TaskCalendarResponse(BaseModel):
    """Calendar view response."""
    events: List[TaskCalendarEvent]
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")

    model_config = ConfigDict(populate_by_name=True)
