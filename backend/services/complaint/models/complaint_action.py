"""
MindFlow Complaint Service - Complaint Action Model
Per DATABASE_SCHEMA.md Section 3.7.5

CREATE TABLE complaint_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_id UUID NOT NULL REFERENCES complaints(id),
    action_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    old_owner_id UUID REFERENCES employees(id),
    new_owner_id UUID REFERENCES employees(id),
    is_internal BOOLEAN NOT NULL DEFAULT TRUE,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .complaint import Complaint


# Action type constants
ACTION_CREATED = "CREATED"
ACTION_ASSIGNED = "ASSIGNED"
ACTION_REASSIGNED = "REASSIGNED"
ACTION_STATUS_CHANGE = "STATUS_CHANGE"
ACTION_ESCALATED = "ESCALATED"
ACTION_COMMENT = "COMMENT"
ACTION_RESOLUTION = "RESOLUTION"
ACTION_CLOSURE = "CLOSURE"
ACTION_REOPENED = "REOPENED"


class ComplaintAction(Base):
    """
    Complaint action history - append-only audit trail.
    Records all actions taken on a complaint.
    """

    __tablename__ = "complaint_actions"

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
    complaint_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("complaints.id"),
        nullable=False,
        index=True
    )

    # Action type: CREATED, ASSIGNED, REASSIGNED, STATUS_CHANGE, ESCALATED, COMMENT, RESOLUTION, CLOSURE, REOPENED
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Status change tracking
    old_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Owner change tracking
    # Note: No ForeignKey as employees table is in HR service
    old_owner_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True
    )
    # Note: No ForeignKey as employees table is in HR service
    new_owner_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True
    )

    # Field-level change tracking
    field_changed: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Internal flag (false = visible to external complainant)
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # When action was performed
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    # Note: No ForeignKey as users table is in Auth service
    performed_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Audit columns (immutable, no updated_at)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    complaint: Mapped["Complaint"] = relationship(
        "Complaint",
        back_populates="actions",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ComplaintAction(id={self.id}, type={self.action_type}, complaint_id={self.complaint_id})>"
