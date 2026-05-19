"""
MindFlow Approval Service - Instance Schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .step import StepResponse
from .decision import DecisionResponse


class UserInfo(BaseModel):
    """Minimal user information."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str


class InstanceCreateRequest(BaseModel):
    """Request schema for creating an approval instance."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    workflow_id: UUID = Field(..., alias="workflowId")
    entity_type: str = Field(..., alias="entityType")
    entity_id: UUID = Field(..., alias="entityId")


class InstanceResponse(BaseModel):
    """Response schema for an approval instance (list view)."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    workflow_id: UUID = Field(alias="workflowId")
    workflow_name: Optional[str] = Field(None, alias="workflowName")
    entity_type: str = Field(alias="entityType")
    entity_id: UUID = Field(alias="entityId")
    requester_id: UUID = Field(alias="requesterId")
    requester: Optional[UserInfo] = None
    current_step_id: Optional[UUID] = Field(None, alias="currentStepId")
    current_step_name: Optional[str] = Field(None, alias="currentStepName")
    status: str
    started_at: datetime = Field(alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    created_at: datetime = Field(alias="createdAt")


class InstanceDetailResponse(BaseModel):
    """Response schema for approval instance details."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    workflow_id: UUID = Field(alias="workflowId")
    workflow_name: Optional[str] = Field(None, alias="workflowName")
    entity_type: str = Field(alias="entityType")
    entity_id: UUID = Field(alias="entityId")
    requester_id: UUID = Field(alias="requesterId")
    requester: Optional[UserInfo] = None
    current_step_id: Optional[UUID] = Field(None, alias="currentStepId")
    current_step: Optional[StepResponse] = Field(None, alias="currentStep")
    status: str
    started_at: datetime = Field(alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    decisions: List[DecisionResponse] = Field(default_factory=list)
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class InstanceListResponse(BaseModel):
    """Response schema for list of approval instances."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[InstanceResponse]
    total: int
    page: int
    limit: int
    pages: int
