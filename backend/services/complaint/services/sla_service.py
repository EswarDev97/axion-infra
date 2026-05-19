"""
MindFlow Complaint Service - SLA Service
Business logic for SLA configuration management.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.sla_config import SLAConfiguration
from ..schemas.sla_config import (
    SLAConfigCreateRequest,
    SLAConfigUpdateRequest,
    SLAConfigResponse,
    SLAConfigListResponse,
)


# Default SLA hours by severity (used when no config exists)
DEFAULT_SLA = {
    "CRITICAL": {"response": 1, "resolution": 4, "escalation": 2},
    "HIGH": {"response": 4, "resolution": 24, "escalation": 12},
    "MEDIUM": {"response": 8, "resolution": 72, "escalation": 48},
    "LOW": {"response": 24, "resolution": 168, "escalation": 96},  # 168h = 7 days
}


class SLAService:
    """Service for managing SLA configurations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        data: SLAConfigCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> SLAConfiguration:
        """Create a new SLA configuration."""
        sla_config = SLAConfiguration(
            tenant_id=tenant_id,
            category_id=data.category_id,
            severity=data.severity,
            response_time_hours=data.response_time_hours,
            resolution_time_hours=data.resolution_time_hours,
            escalation_time_hours=data.escalation_time_hours,
            is_active=data.is_active,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(sla_config)
        await self.db.commit()
        await self.db.refresh(sla_config)
        return sla_config

    async def get_by_id(
        self,
        sla_id: UUID,
        tenant_id: UUID
    ) -> Optional[SLAConfiguration]:
        """Get an SLA configuration by ID."""
        result = await self.db.execute(
            select(SLAConfiguration).where(
                SLAConfiguration.id == sla_id,
                SLAConfiguration.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        sla_config: SLAConfiguration,
        data: SLAConfigUpdateRequest,
        user_id: UUID
    ) -> SLAConfiguration:
        """Update an existing SLA configuration."""
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(sla_config, field, value)
        sla_config.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(sla_config)
        return sla_config

    async def delete(
        self,
        sla_config: SLAConfiguration
    ) -> None:
        """Delete an SLA configuration."""
        await self.db.delete(sla_config)
        await self.db.commit()

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        limit: int = 20,
        category_id: Optional[UUID] = None,
        severity: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> SLAConfigListResponse:
        """List SLA configurations with pagination."""
        query = select(SLAConfiguration).where(
            SLAConfiguration.tenant_id == tenant_id
        )

        if category_id is not None:
            query = query.where(SLAConfiguration.category_id == category_id)

        if severity is not None:
            query = query.where(SLAConfiguration.severity == severity)

        if is_active is not None:
            query = query.where(SLAConfiguration.is_active == is_active)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(SLAConfiguration.severity, SLAConfiguration.category_id)
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        configs = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        return SLAConfigListResponse(
            items=[SLAConfigResponse.model_validate(c) for c in configs],
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_sla_for_complaint(
        self,
        tenant_id: UUID,
        category_id: UUID,
        severity: str
    ) -> dict:
        """
        Get SLA times for a complaint based on category and severity.
        Falls back to default values if no specific config exists.
        """
        # Try to find specific SLA config for category and severity
        result = await self.db.execute(
            select(SLAConfiguration).where(
                SLAConfiguration.tenant_id == tenant_id,
                SLAConfiguration.category_id == category_id,
                SLAConfiguration.severity == severity,
                SLAConfiguration.is_active == True
            )
        )
        sla_config = result.scalar_one_or_none()

        if sla_config:
            return {
                "response_hours": sla_config.response_time_hours,
                "resolution_hours": sla_config.resolution_time_hours,
                "escalation_hours": sla_config.escalation_time_hours,
            }

        # Try to find default SLA config for just severity (no category)
        result = await self.db.execute(
            select(SLAConfiguration).where(
                SLAConfiguration.tenant_id == tenant_id,
                SLAConfiguration.category_id.is_(None),
                SLAConfiguration.severity == severity,
                SLAConfiguration.is_active == True
            )
        )
        sla_config = result.scalar_one_or_none()

        if sla_config:
            return {
                "response_hours": sla_config.response_time_hours,
                "resolution_hours": sla_config.resolution_time_hours,
                "escalation_hours": sla_config.escalation_time_hours,
            }

        # Fall back to hardcoded defaults
        defaults = DEFAULT_SLA.get(severity, DEFAULT_SLA["MEDIUM"])
        return {
            "response_hours": defaults["response"],
            "resolution_hours": defaults["resolution"],
            "escalation_hours": defaults["escalation"],
        }

    def calculate_due_dates(
        self,
        created_at: datetime,
        sla: dict
    ) -> dict:
        """
        Calculate SLA due dates from creation time.
        Returns response_due_at and resolution_due_at.
        """
        return {
            "response_due_at": created_at + timedelta(hours=sla["response_hours"]),
            "resolution_due_at": created_at + timedelta(hours=sla["resolution_hours"]),
        }
