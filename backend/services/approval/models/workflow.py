"""
MindFlow Approval Service - Approval Workflow Model
Per DATABASE_SCHEMA.md Section 3.8.1

CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    description TEXT,
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
    from .step import ApprovalStep
    from .instance import ApprovalInstance


# Entity types that can have approval workflows
ENTITY_TYPE_LEAVE_REQUEST = "LEAVE_REQUEST"
ENTITY_TYPE_EXPENSE_REQUEST = "EXPENSE_REQUEST"
ENTITY_TYPE_TRAINING_ENROLLMENT = "TRAINING_ENROLLMENT"
ENTITY_TYPE_COMPLAINT = "COMPLAINT"
ENTITY_TYPE_DOCUMENT = "DOCUMENT"


class ApprovalWorkflow(Base):
    """
    Approval workflow definitions.
    Defines multi-step approval processes for various entity types.
    """

    __tablename__ = "approval_workflows"

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
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)

    # Entity type this workflow applies to
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    steps: Mapped[List["ApprovalStep"]] = relationship(
        "ApprovalStep",
        back_populates="workflow",
        lazy="selectin",
        order_by="ApprovalStep.step_order"
    )
    instances: Mapped[List["ApprovalInstance"]] = relationship(
        "ApprovalInstance",
        back_populates="workflow",
        lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<ApprovalWorkflow(id={self.id}, code={self.code}, entity_type={self.entity_type})>"

    @property
    def first_step(self) -> Optional["ApprovalStep"]:
        """Get the first step of the workflow."""
        if self.steps:
            return min(self.steps, key=lambda s: s.step_order)
        return None

    def get_step_by_order(self, order: int) -> Optional["ApprovalStep"]:
        """Get a step by its order number."""
        for step in self.steps:
            if step.step_order == order:
                return step
        return None
