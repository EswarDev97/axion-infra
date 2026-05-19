"""
MindFlow Mind Map Service - Mind Map Node Model
Per DATABASE_SCHEMA.md

CREATE TABLE mind_map_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id),
    parent_node_id UUID REFERENCES mind_map_nodes(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    node_type VARCHAR(30) NOT NULL DEFAULT 'IDEA',
    linked_task_id UUID REFERENCES tasks(id),
    x_position DECIMAL(10,2) NOT NULL DEFAULT 0,
    y_position DECIMAL(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    visual_metadata JSONB DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .mind_map import MindMap
    from .node_attachment import NodeAttachment


class MindMapNode(Base):
    """
    Mind map node entity - individual nodes within a mind map.
    Node type: IDEA, ACTIVITY, REFERENCE, LINKED_TASK
    """

    __tablename__ = "mind_map_nodes"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id"),
        nullable=False,
        index=True
    )
    mind_map_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("mind_maps.id"),
        nullable=False,
        index=True
    )
    parent_node_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("mind_map_nodes.id"),
        nullable=True,
        index=True
    )

    # Core fields
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    node_type: Mapped[str] = mapped_column(String(30), nullable=False, default="IDEA")

    # Task linking
    linked_task_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tasks.id"),
        nullable=True,
        index=True
    )

    # Position
    x_position: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    y_position: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Visual customization
    visual_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict
    )

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    updated_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    # Relationships
    mind_map: Mapped["MindMap"] = relationship(
        "MindMap",
        back_populates="nodes",
        lazy="selectin"
    )
    parent_node: Mapped[Optional["MindMapNode"]] = relationship(
        "MindMapNode",
        remote_side=[id],
        back_populates="child_nodes",
        lazy="selectin"
    )
    child_nodes: Mapped[List["MindMapNode"]] = relationship(
        "MindMapNode",
        back_populates="parent_node",
        lazy="selectin"
    )
    attachments: Mapped[List["NodeAttachment"]] = relationship(
        "NodeAttachment",
        back_populates="node",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<MindMapNode(id={self.id}, title={self.title[:30]}..., type={self.node_type})>"

    @property
    def has_linked_task(self) -> bool:
        """Check if node has a linked task."""
        return self.linked_task_id is not None

    @property
    def child_count(self) -> int:
        """Get count of direct child nodes."""
        return len([c for c in self.child_nodes if not c.is_deleted]) if self.child_nodes else 0
