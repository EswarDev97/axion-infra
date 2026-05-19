"""
MindFlow Approval Service - Approval Decision Model
Per DATABASE_SCHEMA.md Section 3.8.4

CREATE TABLE approval_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    instance_id UUID NOT NULL REFERENCES approval_instances(id),
    step_id UUID NOT NULL REFERENCES approval_steps(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL,
    comments TEXT,
    delegated_from_id UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .instance import ApprovalInstance
    from .step import ApprovalStep


# Decision types
DECISION_APPROVED = "APPROVED"
DECISION_REJECTED = "REJECTED"
DECISION_DELEGATED = "DELEGATED"
DECISION_INFO_REQUESTED = "INFO_REQUESTED"


class ApprovalDecision(Base):
    """
    Approval/rejection decisions.
    Records each decision made in an approval workflow.
    """

    __tablename__ = "approval_decisions"

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
    instance_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("approval_instances.id"),
        nullable=False,
        index=True
    )
    step_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("approval_steps.id"),
        nullable=False
    )

    # Who made the decision
    approver_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    # Decision: APPROVED, REJECTED, DELEGATED, INFO_REQUESTED
    decision: Mapped[str] = mapped_column(String(20), nullable=False)

    # Optional comments
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # If delegated, who delegated
    delegated_from_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )

    # When decision was made
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    # Audit columns (immutable)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    instance: Mapped["ApprovalInstance"] = relationship(
        "ApprovalInstance",
        back_populates="decisions",
        lazy="selectin"
    )
    step: Mapped["ApprovalStep"] = relationship(
        "ApprovalStep",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ApprovalDecision(id={self.id}, instance_id={self.instance_id}, decision={self.decision})>"
