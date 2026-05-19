"""
MindFlow Auth Service - Session Schemas
Per API_CONTRACT.md Section 8.1.5 (Session Management Endpoints)
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class SessionResponse(BaseModel):
    """
    Session response schema.
    """
    id: UUID
    device_info: Optional[str] = Field(None, alias="deviceInfo")
    ip_address: Optional[str] = Field(None, alias="ipAddress")
    user_agent: Optional[str] = Field(None, alias="userAgent")
    created_at: datetime = Field(alias="createdAt")
    last_activity_at: datetime = Field(alias="lastActivityAt")
    expires_at: datetime = Field(alias="expiresAt")
    is_current: bool = Field(default=False, alias="isCurrent")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SessionListResponse(PaginatedData[SessionResponse]):
    """Paginated list of sessions."""
    pass
