"""
MindFlow Task Service - Database Models
Per DATABASE_SCHEMA.md Section 3.4 (Task Module Tables)
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before Task models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .task_status import TaskStatus
from .task import Task
from .task_assignee import TaskAssignee
from .task_comment import TaskComment
from .task_attachment import TaskAttachment
from .task_dependency import TaskDependency

__all__ = [
    "TaskStatus",
    "Task",
    "TaskAssignee",
    "TaskComment",
    "TaskAttachment",
    "TaskDependency",
]
