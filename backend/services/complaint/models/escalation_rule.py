"""
MindFlow Complaint Service - Escalation Rule Model
Per DATABASE_SCHEMA.md Section 3.7.3

CREATE TABLE escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category_id UUID REFERENCES complaint_categories(id),
    escalation_level INTEGER NOT NULL DEFAULT 1,
    time_threshold_hours INTEGER NOT NULL,
    escalate_to_position_id UUID REFERENCES positions(id),
    escalate_to_role VARCHAR(50),
    notification_template VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
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
    from .category import ComplaintCategory


class EscalationRule(Base):
    """
    Auto-escalation configuration.
    Defines when and to whom complaints should be escalated.
    """

    __tablename__ = "escalation_rules"

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
    category_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("complaint_categories.id"),
        nullable=True,
        index=True
    )

    # Escalation level (1, 2, 3, etc.) - higher = more senior
    escalation_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Time threshold before escalation (in hours)
    time_threshold_hours: Mapped[int] = mapped_column(Integer, nullable=False)

    # Target for escalation (either position or role)
    # Note: No ForeignKey as positions table is in HR service
    escalate_to_position_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True
    )
    escalate_to_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Notification template to use
    notification_template: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Notification targets
    notify_department_head: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notify_hr_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

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

    # Relationships
    category: Mapped[Optional["ComplaintCategory"]] = relationship(
        "ComplaintCategory",
        back_populates="escalation_rules",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<EscalationRule(id={self.id}, level={self.escalation_level}, threshold={self.time_threshold_hours}h)>"
