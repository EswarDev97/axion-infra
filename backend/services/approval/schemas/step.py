"""
MindFlow Approval Service - Step Schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StepCreateRequest(BaseModel):
    """Request schema for creating an approval step."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    step_order: int = Field(..., ge=1, alias="stepOrder")
    name: str = Field(..., min_length=1, max_length=100, alias="name")
    approver_type: str = Field(..., alias="approverType")  # REPORTING_MANAGER, ROLE, POSITION, etc.
    approver_role: Optional[str] = Field(None, max_length=50, alias="approverRole")
    approver_position_id: Optional[UUID] = Field(None, alias="approverPositionId")
    use_hierarchy: bool = Field(True, alias="useHierarchy")
    hierarchy_level: Optional[int] = Field(None, alias="hierarchyLevel")
    timeout_hours: Optional[int] = Field(None, gt=0, alias="timeoutHours")
    auto_approve_on_timeout: bool = Field(False, alias="autoApproveOnTimeout")
    is_optional: bool = Field(False, alias="isOptional")


class StepUpdateRequest(BaseModel):
    """Request schema for updating an approval step."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: Optional[str] = Field(None, min_length=1, max_length=100, alias="name")
    approver_type: Optional[str] = Field(None, alias="approverType")
    approver_role: Optional[str] = Field(None, max_length=50, alias="approverRole")
    approver_position_id: Optional[UUID] = Field(None, alias="approverPositionId")
    use_hierarchy: Optional[bool] = Field(None, alias="useHierarchy")
    hierarchy_level: Optional[int] = Field(None, alias="hierarchyLevel")
    timeout_hours: Optional[int] = Field(None, gt=0, alias="timeoutHours")
    auto_approve_on_timeout: Optional[bool] = Field(None, alias="autoApproveOnTimeout")
    is_optional: Optional[bool] = Field(None, alias="isOptional")


class StepResponse(BaseModel):
    """Response schema for an approval step."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    workflow_id: UUID = Field(alias="workflowId")
    step_order: int = Field(alias="stepOrder")
    name: str
    approver_type: str = Field(alias="approverType")
    approver_role: Optional[str] = Field(None, alias="approverRole")
    approver_position_id: Optional[UUID] = Field(None, alias="approverPositionId")
    use_hierarchy: bool = Field(alias="useHierarchy")
    hierarchy_level: Optional[int] = Field(None, alias="hierarchyLevel")
    timeout_hours: Optional[int] = Field(None, alias="timeoutHours")
    auto_approve_on_timeout: bool = Field(alias="autoApproveOnTimeout")
    is_optional: bool = Field(alias="isOptional")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class StepReorderRequest(BaseModel):
    """Request schema for reordering steps."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    step_order: List[UUID] = Field(..., alias="stepOrder")  # List of step IDs in desired order
