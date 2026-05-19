"""
MindFlow Complaint Service - Attachment Schemas
Per API_CONTRACT.md Section 8.7.3
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserInfo(BaseModel):
    """Minimal user information."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str


class AttachmentCreateRequest(BaseModel):
    """Request schema for creating a complaint attachment."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    file_id: UUID = Field(..., alias="fileId")
    attachment_type: str = Field("GENERAL", alias="attachmentType")  # GENERAL, EVIDENCE, RESOLUTION, CORRESPONDENCE


class AttachmentResponse(BaseModel):
    """Response schema for a complaint attachment."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    complaint_id: UUID = Field(alias="complaintId")
    file_id: UUID = Field(alias="fileId")
    attachment_type: str = Field(alias="attachmentType")
    uploaded_at: datetime = Field(alias="uploadedAt")
    uploaded_by: Optional[UserInfo] = Field(None, alias="uploadedBy")


class AttachmentListResponse(BaseModel):
    """Response schema for list of complaint attachments."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[AttachmentResponse]
    total: int
