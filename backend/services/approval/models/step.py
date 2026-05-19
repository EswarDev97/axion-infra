"""
MindFlow Approval Service - Approval Step Model
Per DATABASE_SCHEMA.md Section 3.8.2

CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
    step_order INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    approver_type VARCHAR(30) NOT NULL,
    approver_role VARCHAR(50),
    approver_position_id UUID REFERENCES positions(id),
    use_hierarchy BOOLEAN NOT NULL DEFAULT TRUE,
    hierarchy_level INTEGER,
    timeout_hours INTEGER,
    auto_approve_on_timeout BOOLEAN NOT NULL DEFAULT FALSE,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, workflow_id, step_order)
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .workflow import ApprovalWorkflow


# Approver types
APPROVER_TYPE_REPORTING_MANAGER = "REPORTING_MANAGER"
APPROVER_TYPE_ROLE = "ROLE"
APPROVER_TYPE_POSITION = "POSITION"
APPROVER_TYPE_SPECIFIC_USER = "SPECIFIC_USER"
APPROVER_TYPE_DEPARTMENT_HEAD = "DEPARTMENT_HEAD"


class ApprovalStep(Base):
    """
    Workflow step definitions.
    Defines individual approval steps within a workflow.
    """

    __tablename__ = "approval_steps"

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

    # Step order (1, 2, 3, etc.)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Approver type: REPORTING_MANAGER, ROLE, POSITION, SPECIFIC_USER, DEPARTMENT_HEAD
    approver_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # For ROLE type
    approver_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # For POSITION type
    approver_position_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("positions.id"),
        nullable=True
    )

    # Hierarchy settings (for REPORTING_MANAGER type)
    use_hierarchy: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hierarchy_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Timeout and auto-approval
    timeout_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    auto_approve_on_timeout: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Step is optional (can be skipped)
    is_optional: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

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
    workflow: Mapped["ApprovalWorkflow"] = relationship(
        "ApprovalWorkflow",
        back_populates="steps",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ApprovalStep(id={self.id}, workflow_id={self.workflow_id}, order={self.step_order})>"
