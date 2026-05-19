"""
MindFlow HR Service - Position Business Logic
Per API_CONTRACT.md Section 8.2.3
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import Position, Employee, Department


class PositionService:
    """Position management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_position(
        self,
        tenant_id: UUID,
        code: str,
        title: str,
        created_by: UUID,
        description: Optional[str] = None,
        department_id: Optional[UUID] = None,
        level: int = 1
    ) -> Position:
        """Create a new position."""
        # Check if code exists
        stmt = select(Position).where(
            Position.tenant_id == tenant_id,
            Position.code == code
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Position", code)

        # Validate department exists if provided
        if department_id:
            stmt = select(Department).where(
                Department.id == department_id,
                Department.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Department", str(department_id))

        position = Position(
            tenant_id=tenant_id,
            code=code,
            title=title,
            description=description,
            department_id=department_id,
            level=level,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(position)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Position).where(Position.id == position.id).options(
            selectinload(Position.department)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_position(
        self,
        position_id: UUID,
        tenant_id: UUID
    ) -> Position:
        """Get position by ID."""
        stmt = select(Position).where(
            Position.id == position_id,
            Position.tenant_id == tenant_id
        ).options(
            selectinload(Position.department)
        )
        result = await self.db.execute(stmt)
        position = result.scalar_one_or_none()

        if not position:
            raise ResourceNotFoundException("Position", str(position_id))

        return position

    async def list_positions(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        department_id: Optional[UUID] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Position], int]:
        """List positions with pagination."""
        base_query = select(Position).where(
            Position.tenant_id == tenant_id
        )

        if department_id is not None:
            base_query = base_query.where(Position.department_id == department_id)
        if is_active is not None:
            base_query = base_query.where(Position.is_active == is_active)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Position.department)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(Position, pagination.sort_by):
            order_col = getattr(Position, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        positions = list(result.scalars().all())

        return positions, total

    async def update_position(
        self,
        position_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        department_id: Optional[UUID] = None,
        level: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Position:
        """Update position."""
        position = await self.get_position(position_id, tenant_id)

        if title is not None:
            position.title = title
        if description is not None:
            position.description = description
        if department_id is not None:
            # Validate department exists
            stmt = select(Department).where(
                Department.id == department_id,
                Department.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Department", str(department_id))
            position.department_id = department_id
        if level is not None:
            position.level = level
        if is_active is not None:
            position.is_active = is_active

        position.updated_by = updated_by
        position.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Position).where(Position.id == position.id).options(
            selectinload(Position.department)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_position(
        self,
        position_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete position (hard delete - no PII)."""
        position = await self.get_position(position_id, tenant_id)

        # Check if has employees
        stmt = select(func.count()).where(
            Employee.position_id == position_id,
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        employee_count = result.scalar() or 0

        if employee_count > 0:
            raise BusinessRuleViolationException(
                f"Cannot delete position with {employee_count} employees"
            )

        await self.db.delete(position)
        await self.db.commit()
