"""
MindFlow Complaint Service - Category Schemas
Per API_CONTRACT.md Section 8.7.4
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginationMeta


class CategoryCreateRequest(BaseModel):
    """Request schema for creating a complaint category."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str = Field(..., min_length=1, max_length=100, alias="name")
    code: str = Field(..., min_length=1, max_length=50, alias="code")
    description: Optional[str] = Field(None, alias="description")
    parent_category_id: Optional[UUID] = Field(None, alias="parentCategoryId")
    is_active: bool = Field(True, alias="isActive")


class CategoryUpdateRequest(BaseModel):
    """Request schema for updating a complaint category."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: Optional[str] = Field(None, min_length=1, max_length=100, alias="name")
    code: Optional[str] = Field(None, min_length=1, max_length=50, alias="code")
    description: Optional[str] = Field(None, alias="description")
    parent_category_id: Optional[UUID] = Field(None, alias="parentCategoryId")
    is_active: Optional[bool] = Field(None, alias="isActive")


class CategoryResponse(BaseModel):
    """Response schema for a complaint category."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    parent_category_id: Optional[UUID] = Field(None, alias="parentCategoryId")
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    # Nested parent category (optional)
    parent: Optional["CategoryResponse"] = None


class CategoryListResponse(BaseModel):
    """Response schema for list of complaint categories."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[CategoryResponse]
    pagination: PaginationMeta
