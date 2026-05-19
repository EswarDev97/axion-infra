"""
MindFlow Mind Map Service - Mind Map Schemas
Per API_CONTRACT.md
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MindMapCreateRequest(BaseModel):
    """Request to create a mind map."""

    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    template_id: Optional[UUID] = Field(None, alias="templateId")
    theme_settings: Dict[str, Any] = Field(default_factory=dict, alias="themeSettings")


class MindMapUpdateRequest(BaseModel):
    """Request to update a mind map."""

    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    theme_settings: Optional[Dict[str, Any]] = Field(None, alias="themeSettings")


class MindMapNodeSummary(BaseModel):
    """Summary of a mind map node for list views."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    title: str
    node_type: str = Field(..., alias="nodeType")
    parent_node_id: Optional[UUID] = Field(None, alias="parentNodeId")
    x_position: float = Field(..., alias="xPosition")
    y_position: float = Field(..., alias="yPosition")
    display_order: int = Field(..., alias="displayOrder")
    visual_metadata: Dict[str, Any] = Field(default_factory=dict, alias="visualMetadata")
    linked_task_id: Optional[UUID] = Field(None, alias="linkedTaskId")
    child_count: int = Field(0, alias="childCount")


class MindMapResponse(BaseModel):
    """Mind map response."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    tenant_id: UUID = Field(..., alias="tenantId")
    title: str
    description: Optional[str] = None
    status: str
    template_id: Optional[UUID] = Field(None, alias="templateId")
    theme_settings: Dict[str, Any] = Field(default_factory=dict, alias="themeSettings")
    node_count: int = Field(0, alias="nodeCount")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    created_by: UUID = Field(..., alias="createdBy")
    updated_by: UUID = Field(..., alias="updatedBy")


class MindMapDetailResponse(BaseModel):
    """Mind map with full node tree."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    tenant_id: UUID = Field(..., alias="tenantId")
    title: str
    description: Optional[str] = None
    status: str
    template_id: Optional[UUID] = Field(None, alias="templateId")
    theme_settings: Dict[str, Any] = Field(default_factory=dict, alias="themeSettings")
    nodes: List[MindMapNodeSummary] = Field(default_factory=list)
    node_count: int = Field(0, alias="nodeCount")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    created_by: UUID = Field(..., alias="createdBy")
    updated_by: UUID = Field(..., alias="updatedBy")


class MindMapListResponse(BaseModel):
    """Paginated list of mind maps."""

    model_config = ConfigDict(populate_by_name=True)

    items: List[MindMapResponse]
    total: int
    page: int
    page_size: int = Field(..., alias="pageSize")
    total_pages: int = Field(..., alias="totalPages")


class MindMapFilters(BaseModel):
    """Filters for listing mind maps."""

    model_config = ConfigDict(populate_by_name=True)

    status: Optional[str] = None
    template_id: Optional[UUID] = Field(None, alias="templateId")
    search: Optional[str] = None
    created_by: Optional[UUID] = Field(None, alias="createdBy")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100, alias="pageSize")


class MindMapDuplicateRequest(BaseModel):
    """Request to duplicate a mind map."""

    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class MindMapFromTemplateRequest(BaseModel):
    """Request to create mind map from template."""

    model_config = ConfigDict(populate_by_name=True)

    template_id: UUID = Field(..., alias="templateId")
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    theme_settings: Optional[Dict[str, Any]] = Field(None, alias="themeSettings")
