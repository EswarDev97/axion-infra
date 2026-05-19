"""
MindFlow HR Service - Attendance Configuration Model
Stores per-tenant attendance settings for late/half-day detection.
"""

from datetime import datetime, time
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Time, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


class AttendanceConfig(Base):
    """
    Per-tenant attendance configuration.
    One row per tenant. Stores office hours, grace period, and thresholds.
    """

    __tablename__ = "attendance_config"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id"),
        nullable=False,
        unique=True,
        index=True
    )

    # Office hours
    office_start_time: Mapped[time] = mapped_column(
        Time, nullable=False, default=time(9, 0)
    )
    office_end_time: Mapped[time] = mapped_column(
        Time, nullable=False, default=time(18, 0)
    )

    # Grace period in minutes before marking LATE
    grace_period_minutes: Mapped[int] = mapped_column(
        nullable=False, default=15
    )

    # Minimum hours for a full day (below this = HALF_DAY)
    min_work_hours: Mapped[Decimal] = mapped_column(
        Numeric(4, 2), nullable=False, default=Decimal("8.00")
    )

    # Hours threshold for half day (below this = ABSENT-equivalent)
    half_day_hours: Mapped[Decimal] = mapped_column(
        Numeric(4, 2), nullable=False, default=Decimal("4.00")
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<AttendanceConfig(tenant_id={self.tenant_id}, start={self.office_start_time})>"
