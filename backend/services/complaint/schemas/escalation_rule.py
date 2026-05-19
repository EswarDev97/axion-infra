"""
MindFlow Complaint Service - Escalation Rule Schemas
Per API_CONTRACT.md Section 8.7.6
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .category import CategoryResponse


class EscalationRuleCreateRequest(BaseModel):
    """Request schema for creating an escalation rule."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: Optional[UUID] = Field(None, alias="categoryId")
    escalation_level: int = Field(..., ge=1, alias="escalationLevel")
    time_threshold_hours: int = Field(..., gt=0, alias="timeThresholdHours")
    escalate_to_position_id: Optional[UUID] = Field(None, alias="escalateToPositionId")
    escalate_to_role: Optional[str] = Field(None, max_length=50, alias="escalateToRole")
    notification_template: Optional[str] = Field(None, max_length=100, alias="notificationTemplate")
    notify_department_head: bool = Field(False, alias="notifyDepartmentHead")
    notify_hr_admin: bool = Field(False, alias="notifyHrAdmin")
    is_active: bool = Field(True, alias="isActive")


class EscalationRuleUpdateRequest(BaseModel):
    """Request schema for updating an escalation rule."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: Optional[UUID] = Field(None, alias="categoryId")
    escalation_level: Optional[int] = Field(None, ge=1, alias="escalationLevel")
    time_threshold_hours: Optional[int] = Field(None, gt=0, alias="timeThresholdHours")
    escalate_to_position_id: Optional[UUID] = Field(None, alias="escalateToPositionId")
    escalate_to_role: Optional[str] = Field(None, max_length=50, alias="escalateToRole")
    notification_template: Optional[str] = Field(None, max_length=100, alias="notificationTemplate")
    notify_department_head: Optional[bool] = Field(None, alias="notifyDepartmentHead")
    notify_hr_admin: Optional[bool] = Field(None, alias="notifyHrAdmin")
    is_active: Optional[bool] = Field(None, alias="isActive")


class EscalationRuleResponse(BaseModel):
    """Response schema for an escalation rule."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    category_id: Optional[UUID] = Field(None, alias="categoryId")
    category: Optional[CategoryResponse] = None
    escalation_level: int = Field(alias="escalationLevel")
    time_threshold_hours: int = Field(alias="timeThresholdHours")
    escalate_to_position_id: Optional[UUID] = Field(None, alias="escalateToPositionId")
    escalate_to_role: Optional[str] = Field(None, alias="escalateToRole")
    notification_template: Optional[str] = Field(None, alias="notificationTemplate")
    notify_department_head: bool = Field(False, alias="notifyDepartmentHead")
    notify_hr_admin: bool = Field(False, alias="notifyHrAdmin")
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class EscalationRuleListResponse(BaseModel):
    """Response schema for list of escalation rules."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[EscalationRuleResponse]
    total: int
    page: int
    limit: int
    pages: int
