"""
MindFlow Task Service - Task Comment Schemas
Per API_CONTRACT.md Section 8.3.3
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class TaskCommentCreateRequest(BaseModel):
    """POST /tasks/{task_id}/comments request body."""
    content: str = Field(min_length=1)
    parent_id: Optional[UUID] = Field(None, alias="parentId")
    is_internal: bool = Field(default=False, alias="isInternal")

    model_config = ConfigDict(populate_by_name=True)


class TaskCommentUpdateRequest(BaseModel):
    """PUT /tasks/{task_id}/comments/{comment_id} request body."""
    content: str = Field(min_length=1)

    model_config = ConfigDict(populate_by_name=True)


class TaskCommentResponse(BaseModel):
    """Task comment response schema."""
    id: UUID
    task_id: UUID = Field(alias="taskId")
    parent_id: Optional[UUID] = Field(None, alias="parentId")
    content: str
    is_internal: bool = Field(alias="isInternal")
    author_id: UUID = Field(alias="authorId")
    author_name: str = Field(alias="authorName")
    is_deleted: bool = Field(alias="isDeleted")
    reply_count: int = Field(default=0, alias="replyCount")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TaskCommentListResponse(PaginatedData[TaskCommentResponse]):
    """Paginated list of task comments."""
    pass
