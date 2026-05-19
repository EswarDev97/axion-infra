"""
MindFlow Notification Service - Preference Schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PreferenceUpdateItem(BaseModel):
    """Single preference update item."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    notification_type: str = Field(..., alias="notificationType")
    in_app_enabled: Optional[bool] = Field(None, alias="inAppEnabled")
    email_enabled: Optional[bool] = Field(None, alias="emailEnabled")
    push_enabled: Optional[bool] = Field(None, alias="pushEnabled")


class PreferenceUpdateRequest(BaseModel):
    """Request schema for updating notification preferences."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    preferences: List[PreferenceUpdateItem]


class PreferenceResponse(BaseModel):
    """Response schema for a notification preference."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: Optional[UUID] = None  # None for default preferences
    notification_type: str = Field(alias="notificationType")
    display_name: Optional[str] = Field(None, alias="displayName")
    in_app_enabled: bool = Field(alias="inAppEnabled")
    email_enabled: bool = Field(alias="emailEnabled")
    push_enabled: bool = Field(alias="pushEnabled")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")


class PreferenceListResponse(BaseModel):
    """Response schema for list of notification preferences."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[PreferenceResponse]


class BulkPreferenceUpdateRequest(BaseModel):
    """Request schema for bulk updating notification preferences."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    preferences: List[PreferenceUpdateItem]
