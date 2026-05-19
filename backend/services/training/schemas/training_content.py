"""
MindFlow Training Service - Training Content Schemas
Per API_CONTRACT.md Section 8.5.7
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TrainingContentCreateRequest(BaseModel):
    """POST /courses/{course_id}/content request body."""
    title: str = Field(max_length=255)
    content_type: str = Field(alias="contentType")
    file_id: Optional[UUID] = Field(None, alias="fileId")
    external_url: Optional[str] = Field(None, alias="externalUrl", max_length=500)
    display_order: int = Field(default=0, alias="displayOrder", ge=0)
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes", ge=0)
    is_mandatory: bool = Field(default=True, alias="isMandatory")

    model_config = ConfigDict(populate_by_name=True)


class TrainingContentUpdateRequest(BaseModel):
    """PUT /content/{content_id} request body."""
    title: Optional[str] = Field(None, max_length=255)
    content_type: Optional[str] = Field(None, alias="contentType")
    file_id: Optional[UUID] = Field(None, alias="fileId")
    external_url: Optional[str] = Field(None, alias="externalUrl", max_length=500)
    display_order: Optional[int] = Field(None, alias="displayOrder", ge=0)
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes", ge=0)
    is_mandatory: Optional[bool] = Field(None, alias="isMandatory")

    model_config = ConfigDict(populate_by_name=True)


class TrainingContentResponse(BaseModel):
    """Training content response schema."""
    id: UUID
    course_id: UUID = Field(alias="courseId")
    title: str
    content_type: str = Field(alias="contentType")
    file_id: Optional[UUID] = Field(None, alias="fileId")
    external_url: Optional[str] = Field(None, alias="externalUrl")
    display_order: int = Field(alias="displayOrder")
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes")
    is_mandatory: bool = Field(alias="isMandatory")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
