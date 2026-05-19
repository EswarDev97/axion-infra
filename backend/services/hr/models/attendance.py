"""
MindFlow HR Service - Attendance Record Model
Per DATABASE_SCHEMA.md Section 3.3.7

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    work_hours DECIMAL(4,2),
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, date)
);
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .employee import Employee


class AttendanceRecord(Base):
    """
    Daily attendance record for employees.
    Status: PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, HOLIDAY, WORK_FROM_HOME
    """

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "employee_id",
            "date",
            name="uq_attendance_employee_date"
        ),
    )

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

    # Attendance info
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_in: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    check_out: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    work_hours: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 2),
        nullable=True
    )
    overtime_hours: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(4, 2),
        nullable=True
    )

    # Status
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PRESENT")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="attendance_records",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<AttendanceRecord(id={self.id}, employee_id={self.employee_id}, date={self.date})>"

    def calculate_work_hours(self) -> Optional[Decimal]:
        """Calculate work hours from check-in and check-out."""
        if self.check_in and self.check_out:
            delta = self.check_out - self.check_in
            hours = Decimal(str(delta.total_seconds() / 3600))
            return round(hours, 2)
        return None
