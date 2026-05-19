"""
MindFlow Mind Map Service - Schemas
Per API_CONTRACT.md Section 3.6 (mindmap-module)
"""

from .template import (
    MindMapTemplateCreateRequest,
    MindMapTemplateUpdateRequest,
    MindMapTemplateResponse,
    MindMapTemplateListResponse,
    MindMapTemplateFilters,
)
from .mind_map import (
    MindMapCreateRequest,
    MindMapUpdateRequest,
    MindMapResponse,
    MindMapDetailResponse,
    MindMapListResponse,
    MindMapFilters,
    MindMapDuplicateRequest,
    MindMapFromTemplateRequest,
    MindMapNodeSummary,
)
from .mind_map_node import (
    MindMapNodeCreateRequest,
    MindMapNodeUpdateRequest,
    MindMapNodeResponse,
    MindMapNodeMoveRequest,
    MindMapNodeBulkCreateRequest,
    MindMapNodeBulkDeleteRequest,
    NodePositionUpdate,
    NodeAttachmentSummary,
    NodeToTaskConvertRequest,
    NodeToTaskConvertResponse,
)
from .attachment import (
    NodeAttachmentCreateRequest,
    NodeAttachmentResponse,
    NodeAttachmentListResponse,
)

__all__ = [
    # Template
    "MindMapTemplateCreateRequest",
    "MindMapTemplateUpdateRequest",
    "MindMapTemplateResponse",
    "MindMapTemplateListResponse",
    "MindMapTemplateFilters",
    # Mind Map
    "MindMapCreateRequest",
    "MindMapUpdateRequest",
    "MindMapResponse",
    "MindMapDetailResponse",
    "MindMapListResponse",
    "MindMapFilters",
    "MindMapDuplicateRequest",
    "MindMapFromTemplateRequest",
    "MindMapNodeSummary",
    # Node
    "MindMapNodeCreateRequest",
    "MindMapNodeUpdateRequest",
    "MindMapNodeResponse",
    "MindMapNodeMoveRequest",
    "MindMapNodeBulkCreateRequest",
    "MindMapNodeBulkDeleteRequest",
    "NodePositionUpdate",
    "NodeAttachmentSummary",
    "NodeToTaskConvertRequest",
    "NodeToTaskConvertResponse",
    # Attachment
    "NodeAttachmentCreateRequest",
    "NodeAttachmentResponse",
    "NodeAttachmentListResponse",
]
