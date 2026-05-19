"""
MindFlow HR Service - Holiday Management Business Logic
"""

from datetime import date
from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.exceptions import (
    BusinessRuleViolationException,
    ResourceNotFoundException,
)
from shared.schemas import PaginationParams

from ..models.holiday import Holiday
from ..models.weekly_off_config import DAY_NAMES, WeeklyOffConfig


class HolidayService:
    """Holiday and weekly-off management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Holiday CRUD
    # ========================================================================

    async def create_holiday(
        self,
        tenant_id: UUID,
        holiday_name: str,
        holiday_date: date,
        holiday_type: str = "PUBLIC",
        is_recurring: bool = False,
        description: Optional[str] = None,
        created_by: Optional[UUID] = None,
    ) -> Holiday:
        """Create a holiday. One per date per tenant."""
        # Validate type
        if holiday_type not in ("PUBLIC", "COMPANY", "OPTIONAL"):
            raise BusinessRuleViolationException(
                "holiday_type must be PUBLIC, COMPANY, or OPTIONAL"
            )

        # Check duplicate
        stmt = select(Holiday).where(
            Holiday.tenant_id == tenant_id,
            Holiday.holiday_date == holiday_date,
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise BusinessRuleViolationException(
                f"A holiday already exists for {holiday_date}"
            )

        holiday = Holiday(
            tenant_id=tenant_id,
            holiday_name=holiday_name,
            holiday_date=holiday_date,
            holiday_type=holiday_type,
            is_recurring=is_recurring,
            description=description,
            created_by=created_by,
        )
        self.db.add(holiday)
        await self.db.commit()
        await self.db.refresh(holiday)
        return holiday

    async def update_holiday(
        self,
        holiday_id: UUID,
        tenant_id: UUID,
        holiday_name: Optional[str] = None,
        holiday_date: Optional[date] = None,
        holiday_type: Optional[str] = None,
        is_recurring: Optional[bool] = None,
        description: Optional[str] = None,
    ) -> Holiday:
        """Update a holiday."""
        holiday = await self.get_holiday(holiday_id, tenant_id)

        if holiday_type and holiday_type not in ("PUBLIC", "COMPANY", "OPTIONAL"):
            raise BusinessRuleViolationException(
                "holiday_type must be PUBLIC, COMPANY, or OPTIONAL"
            )

        # If date is changing, check for duplicate
        if holiday_date and holiday_date != holiday.holiday_date:
            dup_stmt = select(Holiday).where(
                Holiday.tenant_id == tenant_id,
                Holiday.holiday_date == holiday_date,
                Holiday.id != holiday_id,
            )
            dup_result = await self.db.execute(dup_stmt)
            if dup_result.scalar_one_or_none():
                raise BusinessRuleViolationException(
                    f"A holiday already exists for {holiday_date}"
                )

        if holiday_name is not None:
            holiday.holiday_name = holiday_name
        if holiday_date is not None:
            holiday.holiday_date = holiday_date
        if holiday_type is not None:
            holiday.holiday_type = holiday_type
        if is_recurring is not None:
            holiday.is_recurring = is_recurring
        if description is not None:
            holiday.description = description

        await self.db.commit()
        await self.db.refresh(holiday)
        return holiday

    async def delete_holiday(self, holiday_id: UUID, tenant_id: UUID) -> None:
        """Delete a holiday."""
        holiday = await self.get_holiday(holiday_id, tenant_id)
        await self.db.delete(holiday)
        await self.db.commit()

    async def get_holiday(self, holiday_id: UUID, tenant_id: UUID) -> Holiday:
        """Get a single holiday by ID."""
        stmt = select(Holiday).where(
            Holiday.id == holiday_id,
            Holiday.tenant_id == tenant_id,
        )
        result = await self.db.execute(stmt)
        holiday = result.scalar_one_or_none()
        if not holiday:
            raise ResourceNotFoundException("Holiday", str(holiday_id))
        return holiday

    async def list_holidays(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        year: Optional[int] = None,
        holiday_type: Optional[str] = None,
    ) -> Tuple[List[Holiday], int]:
        """List holidays with optional year and type filters."""
        base_query = select(Holiday).where(Holiday.tenant_id == tenant_id)

        if year:
            from sqlalchemy import extract
            base_query = base_query.where(
                extract("year", Holiday.holiday_date) == year
            )
        if holiday_type:
            base_query = base_query.where(Holiday.holiday_type == holiday_type)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        # Paginate
        stmt = base_query.offset(pagination.offset).limit(
            pagination.page_size
        ).order_by(Holiday.holiday_date.asc())

        result = await self.db.execute(stmt)
        holidays = list(result.scalars().all())
        return holidays, total

    async def get_holidays_for_date(
        self, tenant_id: UUID, target_date: date
    ) -> Optional[Holiday]:
        """Check if a specific date is a holiday for the tenant."""
        stmt = select(Holiday).where(
            Holiday.tenant_id == tenant_id,
            Holiday.holiday_date == target_date,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_holiday_dates_in_range(
        self, tenant_id: UUID, start_date: date, end_date: date
    ) -> Set[date]:
        """Get all holiday dates within a range."""
        stmt = select(Holiday.holiday_date).where(
            Holiday.tenant_id == tenant_id,
            Holiday.holiday_date >= start_date,
            Holiday.holiday_date <= end_date,
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result.fetchall()}

    # ========================================================================
    # Weekly Off Config
    # ========================================================================

    async def get_weekly_offs(self, tenant_id: UUID) -> List[WeeklyOffConfig]:
        """Get all weekly off days for a tenant."""
        stmt = select(WeeklyOffConfig).where(
            WeeklyOffConfig.tenant_id == tenant_id
        ).order_by(WeeklyOffConfig.day_of_week)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_weekly_off_days(self, tenant_id: UUID) -> Set[int]:
        """Get weekly off day numbers (0-6) for a tenant.
        Returns default {5, 6} (Sat, Sun) if none configured."""
        stmt = select(WeeklyOffConfig.day_of_week).where(
            WeeklyOffConfig.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        days = {row[0] for row in result.fetchall()}
        if not days:
            # Default to Saturday + Sunday
            return {5, 6}
        return days

    async def set_weekly_offs(
        self, tenant_id: UUID, days_of_week: List[int]
    ) -> List[WeeklyOffConfig]:
        """Replace all weekly off days for a tenant."""
        # Validate
        for d in days_of_week:
            if d < 0 or d > 6:
                raise BusinessRuleViolationException(
                    f"Invalid day_of_week: {d}. Must be 0 (Mon) to 6 (Sun)."
                )

        # Delete existing
        await self.db.execute(
            delete(WeeklyOffConfig).where(
                WeeklyOffConfig.tenant_id == tenant_id
            )
        )

        # Insert new
        configs = []
        for d in sorted(set(days_of_week)):
            cfg = WeeklyOffConfig(tenant_id=tenant_id, day_of_week=d)
            self.db.add(cfg)
            configs.append(cfg)

        await self.db.commit()
        # Refresh all
        for cfg in configs:
            await self.db.refresh(cfg)
        return configs

    async def is_weekly_off(self, tenant_id: UUID, target_date: date) -> bool:
        """Check if a date falls on a weekly off day."""
        weekly_offs = await self.get_weekly_off_days(tenant_id)
        return target_date.weekday() in weekly_offs
