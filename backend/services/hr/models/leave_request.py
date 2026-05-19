"""
MindFlow HR Service - Leave Request Model
Per DATABASE_SCHEMA.md Section 3.3.6

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .employee import Employee
    from .leave_type import LeaveType


class LeaveRequest(Base):
    """
    Leave request with approval workflow.
    Status: PENDING, APPROVED, REJECTED, CANCELLED
    """

    __tablename__ = "leave_requests"

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
    employee_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )
    leave_type_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("leave_types.id"),
        nullable=False,
        index=True
    )

    # Leave dates
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_requested: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status (PENDING, APPROVED, REJECTED, CANCELLED)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")

    # Approval info
    approved_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.id"),
        nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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
    created_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )
    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        foreign_keys=[employee_id],
        back_populates="leave_requests",
        lazy="selectin"
    )
    leave_type: Mapped["LeaveType"] = relationship(
        "LeaveType",
        back_populates="requests",
        lazy="selectin"
    )
    approver: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        foreign_keys=[approved_by],
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<LeaveRequest(id={self.id}, employee_id={self.employee_id}, status={self.status})>"

    @property
    def is_pending(self) -> bool:
        """Check if request is pending."""
        return self.status == "PENDING"

    @property
    def can_be_cancelled(self) -> bool:
        """Check if request can be cancelled."""
        return self.status in ("PENDING", "APPROVED") and self.start_date > date.today()
