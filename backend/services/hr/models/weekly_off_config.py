"""
MindFlow HR Service - Weekly Off Configuration Model
Configurable weekly off days per tenant (not hardcoded to Sunday).

CREATE TABLE weekly_off_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    day_of_week SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, day_of_week)
);

day_of_week uses Python's weekday(): 0=Monday, 1=Tuesday, ..., 5=Saturday, 6=Sunday
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, SmallInteger, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base

# Human-readable day names indexed by Python weekday()
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class WeeklyOffConfig(Base):
    """
    Weekly off days per tenant.
    day_of_week: 0=Monday .. 6=Sunday (Python weekday convention).
    Multiple rows per tenant allowed (e.g., Saturday + Sunday).
    """

    __tablename__ = "weekly_off_config"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "day_of_week",
            name="uq_weekly_off_tenant_day"
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
    day_of_week: Mapped[int] = mapped_column(
        SmallInteger, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        name = DAY_NAMES[self.day_of_week] if 0 <= self.day_of_week <= 6 else "?"
        return f"<WeeklyOffConfig(tenant={self.tenant_id}, day={name})>"
