"""
MindFlow Task Service - Task Attachment Schemas
Per API_CONTRACT.md Section 8.3.4
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskAttachmentCreateRequest(BaseModel):
    """POST /tasks/{task_id}/attachments request body."""
    file_id: UUID = Field(alias="fileId")

    model_config = ConfigDict(populate_by_name=True)


class TaskAttachmentResponse(BaseModel):
    """Task attachment response schema."""
    id: UUID
    task_id: UUID = Field(alias="taskId")
    file_id: UUID = Field(alias="fileId")
    attached_by: UUID = Field(alias="attachedBy")
    attached_by_name: str = Field(alias="attachedByName")
    attached_at: datetime = Field(alias="attachedAt")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
