"""
MindFlow Mind Map Service - Node Attachment Schemas
Per API_CONTRACT.md
"""

from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NodeAttachmentCreateRequest(BaseModel):
    """Request to attach a file to a node."""

    model_config = ConfigDict(populate_by_name=True)

    file_id: UUID = Field(..., alias="fileId")


class NodeAttachmentResponse(BaseModel):
    """Node attachment response."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    tenant_id: UUID = Field(..., alias="tenantId")
    node_id: UUID = Field(..., alias="nodeId")
    file_id: UUID = Field(..., alias="fileId")
    attached_at: datetime = Field(..., alias="attachedAt")
    attached_by: UUID = Field(..., alias="attachedBy")
    created_at: datetime = Field(..., alias="createdAt")


class NodeAttachmentListResponse(BaseModel):
    """List of node attachments."""

    model_config = ConfigDict(populate_by_name=True)

    items: List[NodeAttachmentResponse]
    total: int
