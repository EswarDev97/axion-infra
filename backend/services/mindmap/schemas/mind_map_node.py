"""
MindFlow Mind Map Service - Mind Map Node Schemas
Per API_CONTRACT.md
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MindMapNodeCreateRequest(BaseModel):
    """Request to create a mind map node."""

    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    node_type: str = Field("IDEA", alias="nodeType")
    parent_node_id: Optional[UUID] = Field(None, alias="parentNodeId")
    linked_task_id: Optional[UUID] = Field(None, alias="linkedTaskId")
    x_position: Decimal = Field(Decimal("0.00"), alias="xPosition")
    y_position: Decimal = Field(Decimal("0.00"), alias="yPosition")
    display_order: int = Field(0, alias="displayOrder")
    visual_metadata: Dict[str, Any] = Field(default_factory=dict, alias="visualMetadata")


class MindMapNodeUpdateRequest(BaseModel):
    """Request to update a mind map node."""

    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    node_type: Optional[str] = Field(None, alias="nodeType")
    linked_task_id: Optional[UUID] = Field(None, alias="linkedTaskId")
    x_position: Optional[Decimal] = Field(None, alias="xPosition")
    y_position: Optional[Decimal] = Field(None, alias="yPosition")
    display_order: Optional[int] = Field(None, alias="displayOrder")
    visual_metadata: Optional[Dict[str, Any]] = Field(None, alias="visualMetadata")


class NodeAttachmentSummary(BaseModel):
    """Summary of a node attachment."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    file_id: UUID = Field(..., alias="fileId")
    attached_at: datetime = Field(..., alias="attachedAt")
    attached_by: UUID = Field(..., alias="attachedBy")


class MindMapNodeResponse(BaseModel):
    """Mind map node response."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    tenant_id: UUID = Field(..., alias="tenantId")
    mind_map_id: UUID = Field(..., alias="mindMapId")
    parent_node_id: Optional[UUID] = Field(None, alias="parentNodeId")
    title: str
    description: Optional[str] = None
    node_type: str = Field(..., alias="nodeType")
    linked_task_id: Optional[UUID] = Field(None, alias="linkedTaskId")
    x_position: Decimal = Field(..., alias="xPosition")
    y_position: Decimal = Field(..., alias="yPosition")
    display_order: int = Field(..., alias="displayOrder")
    visual_metadata: Dict[str, Any] = Field(default_factory=dict, alias="visualMetadata")
    child_count: int = Field(0, alias="childCount")
    attachments: List[NodeAttachmentSummary] = Field(default_factory=list)
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    created_by: UUID = Field(..., alias="createdBy")
    updated_by: UUID = Field(..., alias="updatedBy")


class MindMapNodeMoveRequest(BaseModel):
    """Request to move a node to a new parent."""

    model_config = ConfigDict(populate_by_name=True)

    new_parent_node_id: Optional[UUID] = Field(None, alias="newParentNodeId")
    display_order: Optional[int] = Field(None, alias="displayOrder")


class NodePositionUpdate(BaseModel):
    """Position update for a single node."""

    model_config = ConfigDict(populate_by_name=True)

    node_id: UUID = Field(..., alias="nodeId")
    x_position: Decimal = Field(..., alias="xPosition")
    y_position: Decimal = Field(..., alias="yPosition")


class MindMapNodeBulkCreateRequest(BaseModel):
    """Request to create multiple nodes at once."""

    model_config = ConfigDict(populate_by_name=True)

    nodes: List[MindMapNodeCreateRequest]


class MindMapNodeBulkDeleteRequest(BaseModel):
    """Request to delete multiple nodes."""

    model_config = ConfigDict(populate_by_name=True)

    node_ids: List[UUID] = Field(..., alias="nodeIds")
    deletion_reason: Optional[str] = Field(None, alias="deletionReason", max_length=255)


class NodeToTaskConvertRequest(BaseModel):
    """Request to convert a mind map node to a task."""

    model_config = ConfigDict(populate_by_name=True)

    assignee_id: Optional[UUID] = Field(None, alias="assigneeId")
    due_date: Optional[str] = Field(None, alias="dueDate")
    priority: str = Field("MEDIUM", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")


class NodeToTaskConvertResponse(BaseModel):
    """Response from converting a node to a task."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    node_id: UUID = Field(..., alias="nodeId")
    task_id: UUID = Field(..., alias="taskId")
    task_title: str = Field(..., alias="taskTitle")
    message: str
