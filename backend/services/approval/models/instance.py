"""
MindFlow Approval Service - Approval Instance Model
Per DATABASE_SCHEMA.md Section 3.8.3

CREATE TABLE approval_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    requester_id UUID NOT NULL REFERENCES users(id),
    current_step_id UUID REFERENCES approval_steps(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .workflow import ApprovalWorkflow
    from .step import ApprovalStep
    from .decision import ApprovalDecision


# Instance status constants
INSTANCE_STATUS_PENDING = "PENDING"
INSTANCE_STATUS_APPROVED = "APPROVED"
INSTANCE_STATUS_REJECTED = "REJECTED"
INSTANCE_STATUS_CANCELLED = "CANCELLED"


class ApprovalInstance(Base):
    """
    Active approval requests.
    Represents an entity going through an approval workflow.
    """

    __tablename__ = "approval_instances"

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
    workflow_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("approval_workflows.id"),
        nullable=False,
        index=True
    )

    # Entity being approved
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)

    # Requester
    requester_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Current step (NULL if completed)
    current_step_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("approval_steps.id"),
        nullable=True
    )

    # Status: PENDING, APPROVED, REJECTED, CANCELLED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=INSTANCE_STATUS_PENDING)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

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

    # Relationships
    workflow: Mapped["ApprovalWorkflow"] = relationship(
        "ApprovalWorkflow",
        back_populates="instances",
        lazy="selectin"
    )
    current_step: Mapped[Optional["ApprovalStep"]] = relationship(
        "ApprovalStep",
        lazy="selectin"
    )
    decisions: Mapped[List["ApprovalDecision"]] = relationship(
        "ApprovalDecision",
        back_populates="instance",
        lazy="selectin",
        order_by="ApprovalDecision.decided_at"
    )

    def __repr__(self) -> str:
        return f"<ApprovalInstance(id={self.id}, entity_type={self.entity_type}, status={self.status})>"

    @property
    def is_pending(self) -> bool:
        """Check if instance is pending."""
        return self.status == INSTANCE_STATUS_PENDING

    @property
    def is_completed(self) -> bool:
        """Check if instance is completed (approved, rejected, or cancelled)."""
        return self.status in (INSTANCE_STATUS_APPROVED, INSTANCE_STATUS_REJECTED, INSTANCE_STATUS_CANCELLED)
