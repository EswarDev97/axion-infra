"""
MindFlow Task Service - Task Dependency Schemas
Per API_CONTRACT.md Section 8.3.5
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskDependencyCreateRequest(BaseModel):
    """POST /tasks/{task_id}/dependencies request body."""
    depends_on_task_id: UUID = Field(alias="dependsOnTaskId")
    dependency_type: str = Field(default="BLOCKS", alias="dependencyType")

    model_config = ConfigDict(populate_by_name=True)


class TaskDependencyResponse(BaseModel):
    """Task dependency response schema."""
    id: UUID
    task_id: UUID = Field(alias="taskId")
    task_title: str = Field(alias="taskTitle")
    depends_on_task_id: UUID = Field(alias="dependsOnTaskId")
    depends_on_task_title: str = Field(alias="dependsOnTaskTitle")
    depends_on_task_status: str = Field(alias="dependsOnTaskStatus")
    dependency_type: str = Field(alias="dependencyType")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
