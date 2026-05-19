"""
MindFlow Mind Map Service - Template Schemas
Per API_CONTRACT.md
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MindMapTemplateCreateRequest(BaseModel):
    """Request to create a mind map template."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl", max_length=500)
    template_data: Dict[str, Any] = Field(default_factory=dict, alias="templateData")
    is_system_template: bool = Field(False, alias="isSystemTemplate")


class MindMapTemplateUpdateRequest(BaseModel):
    """Request to update a mind map template."""

    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl", max_length=500)
    template_data: Optional[Dict[str, Any]] = Field(None, alias="templateData")
    is_active: Optional[bool] = Field(None, alias="isActive")


class MindMapTemplateResponse(BaseModel):
    """Mind map template response."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    tenant_id: UUID = Field(..., alias="tenantId")
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    template_data: Dict[str, Any] = Field(default_factory=dict, alias="templateData")
    is_system_template: bool = Field(..., alias="isSystemTemplate")
    is_active: bool = Field(..., alias="isActive")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    created_by: UUID = Field(..., alias="createdBy")
    updated_by: UUID = Field(..., alias="updatedBy")


class MindMapTemplateListResponse(BaseModel):
    """Paginated list of mind map templates."""

    model_config = ConfigDict(populate_by_name=True)

    items: List[MindMapTemplateResponse]
    total: int
    page: int
    page_size: int = Field(..., alias="pageSize")
    total_pages: int = Field(..., alias="totalPages")


class MindMapTemplateFilters(BaseModel):
    """Filters for listing templates."""

    model_config = ConfigDict(populate_by_name=True)

    category: Optional[str] = None
    is_system_template: Optional[bool] = Field(None, alias="isSystemTemplate")
    is_active: Optional[bool] = Field(None, alias="isActive")
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100, alias="pageSize")
