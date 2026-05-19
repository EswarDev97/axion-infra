"""
MindFlow Complaint Service - Complaint Category Model
Per DATABASE_SCHEMA.md Section 3.7.1

CREATE TABLE complaint_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES complaint_categories(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .complaint import Complaint
    from .sla_config import SLAConfiguration
    from .escalation_rule import EscalationRule


class ComplaintCategory(Base):
    """
    Complaint category definitions.
    Categories can be hierarchical (parent_category_id for sub-categories).
    """

    __tablename__ = "complaint_categories"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    # Note: No ForeignKey as tenants table is in a different service
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_category_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("complaint_categories.id"),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

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
    # Note: No ForeignKey as users table is in Auth service
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )
    # Note: No ForeignKey as users table is in Auth service
    updated_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Self-referential relationship for hierarchical categories
    parent: Mapped[Optional["ComplaintCategory"]] = relationship(
        "ComplaintCategory",
        remote_side=[id],
        back_populates="children",
        lazy="selectin"
    )
    children: Mapped[List["ComplaintCategory"]] = relationship(
        "ComplaintCategory",
        back_populates="parent",
        lazy="selectin"
    )

    # Related entities
    complaints: Mapped[List["Complaint"]] = relationship(
        "Complaint",
        back_populates="category",
        lazy="noload"
    )
    sla_configurations: Mapped[List["SLAConfiguration"]] = relationship(
        "SLAConfiguration",
        back_populates="category",
        lazy="noload"
    )
    escalation_rules: Mapped[List["EscalationRule"]] = relationship(
        "EscalationRule",
        back_populates="category",
        lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<ComplaintCategory(id={self.id}, code={self.code}, name={self.name})>"
