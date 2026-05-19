"""
MindFlow Complaint Service - SLA Configuration Schemas
Per API_CONTRACT.md Section 8.7.5
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .category import CategoryResponse


class SLAConfigCreateRequest(BaseModel):
    """Request schema for creating an SLA configuration."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: Optional[UUID] = Field(None, alias="categoryId")
    severity: str = Field(..., alias="severity")  # LOW, MEDIUM, HIGH, CRITICAL
    response_time_hours: int = Field(..., gt=0, alias="responseTimeHours")
    resolution_time_hours: int = Field(..., gt=0, alias="resolutionTimeHours")
    escalation_time_hours: int = Field(..., gt=0, alias="escalationTimeHours")
    is_active: bool = Field(True, alias="isActive")


class SLAConfigUpdateRequest(BaseModel):
    """Request schema for updating an SLA configuration."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: Optional[UUID] = Field(None, alias="categoryId")
    severity: Optional[str] = Field(None, alias="severity")
    response_time_hours: Optional[int] = Field(None, gt=0, alias="responseTimeHours")
    resolution_time_hours: Optional[int] = Field(None, gt=0, alias="resolutionTimeHours")
    escalation_time_hours: Optional[int] = Field(None, gt=0, alias="escalationTimeHours")
    is_active: Optional[bool] = Field(None, alias="isActive")


class SLAConfigResponse(BaseModel):
    """Response schema for an SLA configuration."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    category_id: Optional[UUID] = Field(None, alias="categoryId")
    category: Optional[CategoryResponse] = None
    severity: str
    response_time_hours: int = Field(alias="responseTimeHours")
    resolution_time_hours: int = Field(alias="resolutionTimeHours")
    escalation_time_hours: int = Field(alias="escalationTimeHours")
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class SLAConfigListResponse(BaseModel):
    """Response schema for list of SLA configurations."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[SLAConfigResponse]
    total: int
    page: int
    limit: int
    pages: int
