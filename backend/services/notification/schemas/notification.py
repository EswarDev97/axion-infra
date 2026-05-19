"""
MindFlow Notification Service - Notification Schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreateRequest(BaseModel):
    """Request schema for creating a notification (internal use)."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    user_id: UUID = Field(..., alias="userId")
    type: str = Field(..., alias="type")  # e.g., TASK_ASSIGNED, LEAVE_APPROVED
    title: str = Field(..., min_length=1, max_length=255, alias="title")
    message: str = Field(..., min_length=1, alias="message")
    entity_type: Optional[str] = Field(None, max_length=50, alias="entityType")
    entity_id: Optional[UUID] = Field(None, alias="entityId")
    action_url: Optional[str] = Field(None, max_length=500, alias="actionUrl")
    priority: str = Field("NORMAL", alias="priority")  # LOW, NORMAL, HIGH, URGENT


class MetadataInfo(BaseModel):
    """Metadata for notification."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    entity_type: Optional[str] = Field(None, alias="entityType")
    entity_id: Optional[UUID] = Field(None, alias="entityId")
    action_url: Optional[str] = Field(None, alias="actionUrl")


class NotificationResponse(BaseModel):
    """Response schema for a notification."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    type: str
    title: str
    message: str
    metadata: Optional[MetadataInfo] = None
    priority: str
    is_read: bool = Field(alias="isRead")
    read_at: Optional[datetime] = Field(None, alias="readAt")
    created_at: datetime = Field(alias="createdAt")


class NotificationListResponse(BaseModel):
    """Response schema for list of notifications."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[NotificationResponse]
    total: int
    page: int
    limit: int
    pages: int


class UnreadCountResponse(BaseModel):
    """Response schema for unread count."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    count: int


# Alias for backwards compatibility
NotificationCountResponse = UnreadCountResponse


class BroadcastRequest(BaseModel):
    """Request schema for broadcasting a notification to multiple users."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    user_ids: List[UUID] = Field(..., alias="userIds")
    type: str
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    entity_type: Optional[str] = Field(None, max_length=50, alias="entityType")
    entity_id: Optional[UUID] = Field(None, alias="entityId")
    action_url: Optional[str] = Field(None, max_length=500, alias="actionUrl")
    priority: str = Field("NORMAL")
