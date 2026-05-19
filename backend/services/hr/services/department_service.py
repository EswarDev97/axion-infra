"""
MindFlow HR Service - Department Business Logic
Per API_CONTRACT.md Section 8.2.2
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

from ..models import Department, Employee


class DepartmentService:
    """Department management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_department(
        self,
        tenant_id: UUID,
        code: str,
        name: str,
        created_by: UUID,
        description: Optional[str] = None,
        parent_id: Optional[UUID] = None,
        manager_id: Optional[UUID] = None
    ) -> Department:
        """Create a new department."""
        # Check if code exists
        stmt = select(Department).where(
            Department.tenant_id == tenant_id,
            Department.code == code
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Department", code)

        # Validate parent exists if provided
        if parent_id:
            await self._validate_department_exists(parent_id, tenant_id)

        # Validate manager exists if provided
        if manager_id:
            await self._validate_employee_exists(manager_id, tenant_id)

        department = Department(
            tenant_id=tenant_id,
            code=code,
            name=name,
            description=description,
            parent_id=parent_id,
            manager_id=manager_id,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(department)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Department).where(Department.id == department.id).options(
            selectinload(Department.manager),
            selectinload(Department.parent),
            selectinload(Department.children)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_department(
        self,
        department_id: UUID,
        tenant_id: UUID
    ) -> Department:
        """Get department by ID."""
        stmt = select(Department).where(
            Department.id == department_id,
            Department.tenant_id == tenant_id
        ).options(
            selectinload(Department.manager),
            selectinload(Department.parent),
            selectinload(Department.children)
        )
        result = await self.db.execute(stmt)
        department = result.scalar_one_or_none()

        if not department:
            raise ResourceNotFoundException("Department", str(department_id))

        return department

    async def list_departments(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        parent_id: Optional[UUID] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Department], int]:
        """List departments with pagination."""
        base_query = select(Department).where(
            Department.tenant_id == tenant_id
        )

        if parent_id is not None:
            base_query = base_query.where(Department.parent_id == parent_id)
        if is_active is not None:
            base_query = base_query.where(Department.is_active == is_active)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Department.manager)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(Department, pagination.sort_by):
            order_col = getattr(Department, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        departments = list(result.scalars().all())

        return departments, total

    async def update_department(
        self,
        department_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        parent_id: Optional[UUID] = None,
        manager_id: Optional[UUID] = None,
        is_active: Optional[bool] = None
    ) -> Department:
        """Update department."""
        department = await self.get_department(department_id, tenant_id)

        if name is not None:
            department.name = name
        if description is not None:
            department.description = description
        if parent_id is not None:
            # Prevent circular reference
            if parent_id == department_id:
                raise BusinessRuleViolationException(
                    "Department cannot be its own parent"
                )
            await self._validate_department_exists(parent_id, tenant_id)
            department.parent_id = parent_id
        if manager_id is not None:
            await self._validate_employee_exists(manager_id, tenant_id)
            department.manager_id = manager_id
        if is_active is not None:
            department.is_active = is_active

        department.updated_by = updated_by
        department.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Department).where(Department.id == department.id).options(
            selectinload(Department.manager),
            selectinload(Department.parent),
            selectinload(Department.children)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_department(
        self,
        department_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete department (hard delete - no PII)."""
        department = await self.get_department(department_id, tenant_id)

        # Check if has employees
        stmt = select(func.count()).where(
            Employee.department_id == department_id,
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        employee_count = result.scalar() or 0

        if employee_count > 0:
            raise BusinessRuleViolationException(
                f"Cannot delete department with {employee_count} employees"
            )

        # Check if has children
        stmt = select(func.count()).where(
            Department.parent_id == department_id
        )
        result = await self.db.execute(stmt)
        children_count = result.scalar() or 0

        if children_count > 0:
            raise BusinessRuleViolationException(
                f"Cannot delete department with {children_count} sub-departments"
            )

        await self.db.delete(department)
        await self.db.commit()

    async def get_department_employees(
        self,
        department_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Employee], int]:
        """Get employees in a department."""
        await self.get_department(department_id, tenant_id)

        base_query = select(Employee).where(
            Employee.department_id == department_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Employee.position)
        ).offset(pagination.offset).limit(pagination.page_size)

        result = await self.db.execute(stmt)
        employees = list(result.scalars().all())

        return employees, total

    async def _validate_department_exists(
        self,
        department_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Validate department exists."""
        stmt = select(Department).where(
            Department.id == department_id,
            Department.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ResourceNotFoundException("Department", str(department_id))

    async def _validate_employee_exists(
        self,
        employee_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Validate employee exists."""
        stmt = select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ResourceNotFoundException("Employee", str(employee_id))
