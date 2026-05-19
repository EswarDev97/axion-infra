"""
MindFlow Approval Service - Decision Schemas
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserInfo(BaseModel):
    """Minimal user information."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str


class DecisionRequest(BaseModel):
    """Request schema for making an approval decision."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    comments: Optional[str] = Field(None, alias="comments")


class DelegateRequest(BaseModel):
    """Request schema for delegating an approval."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    delegate_to_id: UUID = Field(..., alias="delegateToId")
    comments: Optional[str] = Field(None, alias="comments")


class DecisionResponse(BaseModel):
    """Response schema for an approval decision."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    instance_id: UUID = Field(alias="instanceId")
    step_id: UUID = Field(alias="stepId")
    step_name: Optional[str] = Field(None, alias="stepName")
    approver_id: UUID = Field(alias="approverId")
    approver: Optional[UserInfo] = None
    decision: str  # APPROVED, REJECTED, DELEGATED, INFO_REQUESTED
    comments: Optional[str] = None
    delegated_from_id: Optional[UUID] = Field(None, alias="delegatedFromId")
    delegated_from: Optional[UserInfo] = Field(None, alias="delegatedFrom")
    decided_at: datetime = Field(alias="decidedAt")
    created_at: datetime = Field(alias="createdAt")
