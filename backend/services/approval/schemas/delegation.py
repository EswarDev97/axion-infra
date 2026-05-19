"""
MindFlow Approval Service - Delegation Schemas
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserInfo(BaseModel):
    """Minimal user information."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str


class WorkflowInfo(BaseModel):
    """Minimal workflow information."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str


class DelegationCreateRequest(BaseModel):
    """Request schema for creating a delegation rule."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    delegate_id: UUID = Field(..., alias="delegateId")
    workflow_id: Optional[UUID] = Field(None, alias="workflowId")
    valid_from: date = Field(..., alias="validFrom")
    valid_to: date = Field(..., alias="validTo")
    reason: Optional[str] = Field(None, max_length=255, alias="reason")
    is_active: bool = Field(True, alias="isActive")


class DelegationUpdateRequest(BaseModel):
    """Request schema for updating a delegation rule."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    delegate_id: Optional[UUID] = Field(None, alias="delegateId")
    workflow_id: Optional[UUID] = Field(None, alias="workflowId")
    valid_from: Optional[date] = Field(None, alias="validFrom")
    valid_to: Optional[date] = Field(None, alias="validTo")
    reason: Optional[str] = Field(None, max_length=255, alias="reason")
    is_active: Optional[bool] = Field(None, alias="isActive")


class DelegationResponse(BaseModel):
    """Response schema for a delegation rule."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    delegator_id: UUID = Field(alias="delegatorId")
    delegator: Optional[UserInfo] = None
    delegate_id: UUID = Field(alias="delegateId")
    delegate: Optional[UserInfo] = None
    workflow_id: Optional[UUID] = Field(None, alias="workflowId")
    workflow: Optional[WorkflowInfo] = None
    valid_from: date = Field(alias="validFrom")
    valid_to: date = Field(alias="validTo")
    reason: Optional[str] = None
    is_active: bool = Field(alias="isActive")
    is_currently_active: bool = Field(False, alias="isCurrentlyActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class DelegationListResponse(BaseModel):
    """Response schema for list of delegation rules."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[DelegationResponse]
    total: int
    page: int
    limit: int
    pages: int
