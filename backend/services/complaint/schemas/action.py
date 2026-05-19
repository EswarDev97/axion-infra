"""
MindFlow Complaint Service - Action Schemas
Per API_CONTRACT.md Section 8.7.2
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


class ActionCreateRequest(BaseModel):
    """Request schema for creating a complaint action (comment)."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    action_type: str = Field("COMMENT", alias="actionType")  # Usually COMMENT for manual actions
    description: str = Field(..., min_length=1, alias="description")
    is_internal: bool = Field(True, alias="isInternal")


class ActionUpdateRequest(BaseModel):
    """Request schema for updating a complaint action."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    description: Optional[str] = Field(None, min_length=1, alias="description")
    is_internal: Optional[bool] = Field(None, alias="isInternal")


class ActionResponse(BaseModel):
    """Response schema for a complaint action."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    complaint_id: UUID = Field(alias="complaintId")
    action_type: str = Field(alias="actionType")
    description: str
    old_status: Optional[str] = Field(None, alias="oldStatus")
    new_status: Optional[str] = Field(None, alias="newStatus")
    old_owner_id: Optional[UUID] = Field(None, alias="oldOwnerId")
    new_owner_id: Optional[UUID] = Field(None, alias="newOwnerId")
    field_changed: Optional[str] = Field(None, alias="fieldChanged")
    old_value: Optional[str] = Field(None, alias="oldValue")
    new_value: Optional[str] = Field(None, alias="newValue")
    is_internal: bool = Field(alias="isInternal")
    performed_at: datetime = Field(alias="performedAt")
    performed_by: Optional[UserInfo] = Field(None, alias="performedBy")
    created_at: datetime = Field(alias="createdAt")


class ActionListResponse(BaseModel):
    """Response schema for list of complaint actions."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[ActionResponse]
    total: int
