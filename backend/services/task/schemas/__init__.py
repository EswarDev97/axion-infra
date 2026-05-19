"""
MindFlow Task Service - Pydantic Schemas
Per API_CONTRACT.md Section 8.3 (Task Module)
"""

from .task_status import (
    TaskStatusCreateRequest,
    TaskStatusUpdateRequest,
    TaskStatusResponse,
    TaskStatusListResponse,
)
from .task import (
    TaskCreateRequest,
    TaskUpdateRequest,
    TaskResponse,
    TaskListResponse,
    TaskFilters,
    TaskKanbanColumn,
    TaskKanbanResponse,
    TaskCalendarEvent,
    TaskCalendarResponse,
)
from .task_assignee import (
    TaskAssigneeCreateRequest,
    TaskAssigneeResponse,
)
from .task_comment import (
    TaskCommentCreateRequest,
    TaskCommentUpdateRequest,
    TaskCommentResponse,
    TaskCommentListResponse,
)
from .task_attachment import (
    TaskAttachmentCreateRequest,
    TaskAttachmentResponse,
)
from .task_dependency import (
    TaskDependencyCreateRequest,
    TaskDependencyResponse,
)

__all__ = [
    # Task Status
    "TaskStatusCreateRequest",
    "TaskStatusUpdateRequest",
    "TaskStatusResponse",
    "TaskStatusListResponse",
    # Task
    "TaskCreateRequest",
    "TaskUpdateRequest",
    "TaskResponse",
    "TaskListResponse",
    "TaskFilters",
    "TaskKanbanColumn",
    "TaskKanbanResponse",
    "TaskCalendarEvent",
    "TaskCalendarResponse",
    # Task Assignee
    "TaskAssigneeCreateRequest",
    "TaskAssigneeResponse",
    # Task Comment
    "TaskCommentCreateRequest",
    "TaskCommentUpdateRequest",
    "TaskCommentResponse",
    "TaskCommentListResponse",
    # Task Attachment
    "TaskAttachmentCreateRequest",
    "TaskAttachmentResponse",
    # Task Dependency
    "TaskDependencyCreateRequest",
    "TaskDependencyResponse",
]
