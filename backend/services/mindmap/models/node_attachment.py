"""
MindFlow Mind Map Service - Node Attachment Model
Per DATABASE_SCHEMA.md

CREATE TABLE node_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    node_id UUID NOT NULL REFERENCES mind_map_nodes(id),
    file_id UUID NOT NULL,
    attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attached_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .mind_map_node import MindMapNode


class NodeAttachment(Base):
    """
    Node attachment entity - file attachments to mind map nodes.
    """

    __tablename__ = "node_attachments"

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
    node_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("mind_map_nodes.id"),
        nullable=False,
        index=True
    )

    # File reference (references file_metadata in storage service)
    file_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Attachment details
    attached_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    attached_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    node: Mapped["MindMapNode"] = relationship(
        "MindMapNode",
        back_populates="attachments",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<NodeAttachment(id={self.id}, node_id={self.node_id}, file_id={self.file_id})>"
