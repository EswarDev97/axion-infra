"""
MindFlow Task Service - Task Assignee Schemas
Per API_CONTRACT.md Section 8.3.2
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskAssigneeCreateRequest(BaseModel):
    """POST /tasks/{task_id}/assignees request body."""
    user_id: UUID = Field(alias="userId")
    role: str = Field(default="ASSIGNEE")

    model_config = ConfigDict(populate_by_name=True)


class TaskAssigneeResponse(BaseModel):
    """Task assignee response schema."""
    id: UUID
    task_id: UUID = Field(alias="taskId")
    user_id: UUID = Field(alias="userId")
    user_name: str = Field(alias="userName")
    role: str
    assigned_at: datetime = Field(alias="assignedAt")
    assigned_by: UUID = Field(alias="assignedBy")
    tenant_id: UUID = Field(alias="tenantId")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
