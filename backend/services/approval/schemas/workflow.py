"""
MindFlow Approval Service - Workflow Schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .step import StepCreateRequest, StepResponse


class WorkflowCreateRequest(BaseModel):
    """Request schema for creating an approval workflow."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str = Field(..., min_length=1, max_length=100, alias="name")
    code: str = Field(..., min_length=1, max_length=50, alias="code")
    entity_type: str = Field(..., alias="entityType")
    description: Optional[str] = Field(None, alias="description")
    is_active: bool = Field(True, alias="isActive")
    steps: Optional[List[StepCreateRequest]] = Field(None, alias="steps")


class WorkflowUpdateRequest(BaseModel):
    """Request schema for updating an approval workflow."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: Optional[str] = Field(None, min_length=1, max_length=100, alias="name")
    description: Optional[str] = Field(None, alias="description")
    is_active: Optional[bool] = Field(None, alias="isActive")


class WorkflowResponse(BaseModel):
    """Response schema for an approval workflow (list view)."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str
    code: str
    entity_type: str = Field(alias="entityType")
    description: Optional[str] = None
    is_active: bool = Field(alias="isActive")
    step_count: int = Field(0, alias="stepCount")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class WorkflowDetailResponse(BaseModel):
    """Response schema for workflow details with steps."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str
    code: str
    entity_type: str = Field(alias="entityType")
    description: Optional[str] = None
    is_active: bool = Field(alias="isActive")
    steps: List[StepResponse] = Field(default_factory=list)
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class WorkflowListResponse(BaseModel):
    """Response schema for list of workflows."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[WorkflowResponse]
    total: int
    page: int
    limit: int
    pages: int
