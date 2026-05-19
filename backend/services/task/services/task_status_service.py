"""
MindFlow Task Service - Task Status Business Logic
Per API_CONTRACT.md Section 8.3.6
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

from ..models import TaskStatus, Task


class TaskStatusService:
    """Task status management service."""

    # Default statuses per API_CONTRACT.md
    DEFAULT_STATUSES = [
        {
            "code": "NOT_STARTED",
            "name": "Not Started",
            "color": "#6B7280",
            "sort_order": 0,
            "is_default": True,
            "is_terminal": False,
            "allowed_transitions": ["IN_PROGRESS", "BLOCKED", "DROPPED"]
        },
        {
            "code": "IN_PROGRESS",
            "name": "In Progress",
            "color": "#3B82F6",
            "sort_order": 1,
            "is_default": False,
            "is_terminal": False,
            "allowed_transitions": ["REVIEW", "BLOCKED", "DROPPED", "NOT_STARTED"]
        },
        {
            "code": "REVIEW",
            "name": "Review",
            "color": "#F59E0B",
            "sort_order": 2,
            "is_default": False,
            "is_terminal": False,
            "allowed_transitions": ["COMPLETED", "IN_PROGRESS", "BLOCKED"]
        },
        {
            "code": "COMPLETED",
            "name": "Completed",
            "color": "#10B981",
            "sort_order": 3,
            "is_default": False,
            "is_terminal": True,
            "allowed_transitions": []
        },
        {
            "code": "BLOCKED",
            "name": "Blocked",
            "color": "#EF4444",
            "sort_order": 4,
            "is_default": False,
            "is_terminal": False,
            "allowed_transitions": ["IN_PROGRESS", "DROPPED"]
        },
        {
            "code": "DROPPED",
            "name": "Dropped",
            "color": "#9CA3AF",
            "sort_order": 5,
            "is_default": False,
            "is_terminal": True,
            "allowed_transitions": []
        }
    ]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def initialize_default_statuses(
        self,
        tenant_id: UUID,
        created_by: UUID
    ) -> List[TaskStatus]:
        """Initialize default task statuses for a tenant."""
        statuses = []
        for status_data in self.DEFAULT_STATUSES:
            # Check if exists
            stmt = select(TaskStatus).where(
                TaskStatus.tenant_id == tenant_id,
                TaskStatus.code == status_data["code"]
            )
            result = await self.db.execute(stmt)
            existing = result.scalar_one_or_none()

            if not existing:
                status = TaskStatus(
                    tenant_id=tenant_id,
                    code=status_data["code"],
                    name=status_data["name"],
                    color=status_data["color"],
                    sort_order=status_data["sort_order"],
                    is_default=status_data["is_default"],
                    is_terminal=status_data["is_terminal"],
                    allowed_transitions=status_data["allowed_transitions"],
                    created_by=created_by,
                    updated_by=created_by
                )
                self.db.add(status)
                statuses.append(status)
            else:
                statuses.append(existing)

        await self.db.commit()
        return statuses

    async def create_status(
        self,
        tenant_id: UUID,
        code: str,
        name: str,
        created_by: UUID,
        description: Optional[str] = None,
        color: str = "#6B7280",
        sort_order: int = 0,
        is_default: bool = False,
        is_terminal: bool = False,
        allowed_transitions: List[str] = None
    ) -> TaskStatus:
        """Create a new task status."""
        # Check if code exists
        stmt = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id,
            TaskStatus.code == code
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("TaskStatus", code)

        # If setting as default, unset other defaults
        if is_default:
            await self._unset_default(tenant_id)

        status = TaskStatus(
            tenant_id=tenant_id,
            code=code,
            name=name,
            description=description,
            color=color,
            sort_order=sort_order,
            is_default=is_default,
            is_terminal=is_terminal,
            allowed_transitions=allowed_transitions or [],
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(status)
        await self.db.commit()

        # Re-fetch to avoid lazy loading issues
        stmt = select(TaskStatus).where(TaskStatus.id == status.id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_status(
        self,
        status_id: UUID,
        tenant_id: UUID
    ) -> TaskStatus:
        """Get task status by ID."""
        stmt = select(TaskStatus).where(
            TaskStatus.id == status_id,
            TaskStatus.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        status = result.scalar_one_or_none()

        if not status:
            raise ResourceNotFoundException("TaskStatus", str(status_id))

        return status

    async def get_status_by_code(
        self,
        code: str,
        tenant_id: UUID
    ) -> Optional[TaskStatus]:
        """Get task status by code."""
        stmt = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id,
            TaskStatus.code == code
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_default_status(
        self,
        tenant_id: UUID
    ) -> Optional[TaskStatus]:
        """Get the default task status."""
        stmt = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id,
            TaskStatus.is_default == True,
            TaskStatus.is_active == True
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_statuses(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        is_active: Optional[bool] = None
    ) -> Tuple[List[TaskStatus], int]:
        """List task statuses with pagination."""
        base_query = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id
        )

        if is_active is not None:
            base_query = base_query.where(TaskStatus.is_active == is_active)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(TaskStatus.sort_order.asc())

        result = await self.db.execute(stmt)
        statuses = list(result.scalars().all())

        return statuses, total

    async def update_status(
        self,
        status_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        sort_order: Optional[int] = None,
        is_default: Optional[bool] = None,
        is_terminal: Optional[bool] = None,
        allowed_transitions: Optional[List[str]] = None,
        is_active: Optional[bool] = None
    ) -> TaskStatus:
        """Update task status."""
        status = await self.get_status(status_id, tenant_id)

        if name is not None:
            status.name = name
        if description is not None:
            status.description = description
        if color is not None:
            status.color = color
        if sort_order is not None:
            status.sort_order = sort_order
        if is_default is not None and is_default:
            await self._unset_default(tenant_id)
            status.is_default = True
        if is_terminal is not None:
            status.is_terminal = is_terminal
        if allowed_transitions is not None:
            status.allowed_transitions = allowed_transitions
        if is_active is not None:
            status.is_active = is_active

        status.updated_by = updated_by
        status.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch to avoid lazy loading issues
        stmt = select(TaskStatus).where(TaskStatus.id == status.id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_status(
        self,
        status_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete task status."""
        status = await self.get_status(status_id, tenant_id)

        # Check if has tasks
        stmt = select(func.count()).where(
            Task.status_id == status_id,
            Task.is_deleted == False
        )
        result = await self.db.execute(stmt)
        task_count = result.scalar() or 0

        if task_count > 0:
            raise BusinessRuleViolationException(
                f"Cannot delete status with {task_count} tasks"
            )

        await self.db.delete(status)
        await self.db.commit()

    async def validate_transition(
        self,
        from_status_id: UUID,
        to_status_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """Validate if status transition is allowed."""
        from_status = await self.get_status(from_status_id, tenant_id)
        to_status = await self.get_status(to_status_id, tenant_id)

        return from_status.can_transition_to(to_status.code)

    async def _unset_default(self, tenant_id: UUID) -> None:
        """Unset default flag from all statuses."""
        stmt = select(TaskStatus).where(
            TaskStatus.tenant_id == tenant_id,
            TaskStatus.is_default == True
        )
        result = await self.db.execute(stmt)
        for status in result.scalars().all():
            status.is_default = False
