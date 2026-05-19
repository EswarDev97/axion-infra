"""
MindFlow Task Service - Task Status Schemas
Per API_CONTRACT.md Section 8.3.6
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class TaskStatusCreateRequest(BaseModel):
    """POST /tasks/statuses request body."""
    code: str = Field(max_length=30)
    name: str = Field(max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")
    sort_order: int = Field(default=0, ge=0)
    is_default: bool = Field(default=False, alias="isDefault")
    is_terminal: bool = Field(default=False, alias="isTerminal")
    allowed_transitions: List[str] = Field(default_factory=list, alias="allowedTransitions")

    model_config = ConfigDict(populate_by_name=True)


class TaskStatusUpdateRequest(BaseModel):
    """PUT /tasks/statuses/{id} request body."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    sort_order: Optional[int] = Field(None, ge=0, alias="sortOrder")
    is_default: Optional[bool] = Field(None, alias="isDefault")
    is_terminal: Optional[bool] = Field(None, alias="isTerminal")
    allowed_transitions: Optional[List[str]] = Field(None, alias="allowedTransitions")
    is_active: Optional[bool] = Field(None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class TaskStatusResponse(BaseModel):
    """Task status response schema."""
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    color: str
    sort_order: int = Field(alias="sortOrder")
    is_default: bool = Field(alias="isDefault")
    is_terminal: bool = Field(alias="isTerminal")
    allowed_transitions: List[str] = Field(alias="allowedTransitions")
    is_active: bool = Field(alias="isActive")
    task_count: int = Field(default=0, alias="taskCount")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TaskStatusListResponse(PaginatedData[TaskStatusResponse]):
    """Paginated list of task statuses."""
    pass
