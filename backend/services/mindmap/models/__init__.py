"""
MindFlow Mind Map Service - Models
Per DATABASE_SCHEMA.md Section 3.4 (mindmap-module)
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before MindMap models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .mind_map_template import MindMapTemplate
from .mind_map import MindMap
from .mind_map_node import MindMapNode
from .node_attachment import NodeAttachment

__all__ = [
    "MindMapTemplate",
    "MindMap",
    "MindMapNode",
    "NodeAttachment",
]
