"""
MindFlow HR Service - Employee Business Logic
Per API_CONTRACT.md Section 8.2.1
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid import uuid4 as generate_uuid

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams
from shared.security import hash_password

from ..models import Employee, Position, Department
from ..schemas.employee import EmployeeFilters


class EmployeeService:
    """Employee management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_employee(
        self,
        tenant_id: UUID,
        employee_code: str,
        first_name: str,
        last_name: str,
        email: str,
        position_id: UUID,
        date_of_joining: date,
        created_by: UUID,
        phone: Optional[str] = None,
        password: Optional[str] = None,
        role: Optional[str] = None,
        department_id: Optional[UUID] = None,
        manager_id: Optional[UUID] = None,
        employment_type: str = "FULL_TIME",
        salary: Optional[Decimal] = None,
        user_id: Optional[UUID] = None
    ) -> Employee:
        """Create a new employee."""
        # Check if employee code exists
        stmt = select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.employee_code == employee_code,
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Employee", employee_code)

        # Check if email exists
        stmt = select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.email.ilike(email),
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Employee", email)

        # Validate position exists
        stmt = select(Position).where(
            Position.id == position_id,
            Position.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ResourceNotFoundException("Position", str(position_id))

        # Validate department exists if provided
        if department_id:
            stmt = select(Department).where(
                Department.id == department_id,
                Department.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Department", str(department_id))

        # Validate manager exists if provided
        if manager_id:
            stmt = select(Employee).where(
                Employee.id == manager_id,
                Employee.tenant_id == tenant_id,
                Employee.is_deleted == False
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Manager", str(manager_id))

        # Hash password if provided
        hashed_password = hash_password(password) if password else None

        # Create a user record for login if password is provided and no user_id given
        if hashed_password and not user_id:
            new_user_id = generate_uuid()
            await self.db.execute(
                text("""
                    INSERT INTO users (id, tenant_id, email, password_hash, is_active, is_locked,
                        failed_login_attempts, created_at, updated_at, created_by, updated_by, is_deleted)
                    VALUES (:id, :tenant_id, :email, :password_hash, true, false,
                        0, NOW(), NOW(), :created_by, :created_by, false)
                """),
                {
                    "id": str(new_user_id),
                    "tenant_id": str(tenant_id),
                    "email": email.lower(),
                    "password_hash": hashed_password,
                    "created_by": str(created_by),
                }
            )
            user_id = new_user_id

            # Assign role to the new user (default to EMPLOYEE if not specified)
            role_code = role or "EMPLOYEE"
            await self.db.execute(
                text("""
                    INSERT INTO user_tenant_roles (id, user_id, tenant_id, role_id, assigned_at, assigned_by, created_at, updated_at)
                    SELECT gen_random_uuid(), CAST(:user_id AS UUID), CAST(:tenant_id AS UUID), r.id, NOW(), CAST(:assigned_by AS UUID), NOW(), NOW()
                    FROM roles r
                    WHERE r.code = :role_code AND r.tenant_id = CAST(:tenant_id AS UUID)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "user_id": str(new_user_id),
                    "tenant_id": str(tenant_id),
                    "role_code": role_code,
                    "assigned_by": str(created_by),
                }
            )

        employee = Employee(
            tenant_id=tenant_id,
            employee_code=employee_code,
            first_name=first_name,
            last_name=last_name,
            email=email.lower(),
            phone=phone,
            password_hash=hashed_password,
            position_id=position_id,
            department_id=department_id,
            manager_id=manager_id,
            date_of_joining=date_of_joining,
            employment_type=employment_type,
            salary=salary,
            user_id=user_id,
            status="ACTIVE",
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(employee)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Employee).where(Employee.id == employee.id).options(
            selectinload(Employee.position),
            selectinload(Employee.department),
            selectinload(Employee.manager)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_employee(
        self,
        employee_id: UUID,
        tenant_id: UUID
    ) -> Employee:
        """Get employee by ID."""
        stmt = select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        ).options(
            selectinload(Employee.position),
            selectinload(Employee.department),
            selectinload(Employee.manager)
        )
        result = await self.db.execute(stmt)
        employee = result.scalar_one_or_none()

        if not employee:
            raise ResourceNotFoundException("Employee", str(employee_id))

        return employee

    async def get_employee_by_user_id(
        self,
        user_id: UUID,
        tenant_id: UUID
    ) -> Optional[Employee]:
        """Get employee by user ID."""
        stmt = select(Employee).where(
            Employee.user_id == user_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        ).options(
            selectinload(Employee.position),
            selectinload(Employee.department),
            selectinload(Employee.manager)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_employees(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[EmployeeFilters] = None
    ) -> Tuple[List[Employee], int]:
        """List employees with pagination and filters."""
        base_query = select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        )

        if filters:
            if filters.department_id:
                base_query = base_query.where(
                    Employee.department_id == filters.department_id
                )
            if filters.position_id:
                base_query = base_query.where(
                    Employee.position_id == filters.position_id
                )
            if filters.manager_id:
                base_query = base_query.where(
                    Employee.manager_id == filters.manager_id
                )
            if filters.status:
                base_query = base_query.where(Employee.status == filters.status)
            if filters.employment_type:
                base_query = base_query.where(
                    Employee.employment_type == filters.employment_type
                )
            if filters.search:
                search_term = f"%{filters.search}%"
                base_query = base_query.where(
                    or_(
                        Employee.first_name.ilike(search_term),
                        Employee.last_name.ilike(search_term),
                        Employee.email.ilike(search_term),
                        Employee.employee_code.ilike(search_term)
                    )
                )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Employee.position),
            selectinload(Employee.department),
            selectinload(Employee.manager)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(Employee, pagination.sort_by):
            order_col = getattr(Employee, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        employees = list(result.scalars().all())

        return employees, total

    async def update_employee(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        password: Optional[str] = None,
        position_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        manager_id: Optional[UUID] = None,
        status: Optional[str] = None,
        employment_type: Optional[str] = None,
        salary: Optional[Decimal] = None,
        date_of_exit: Optional[date] = None
    ) -> Employee:
        """Update employee."""
        employee = await self.get_employee(employee_id, tenant_id)

        if first_name is not None:
            employee.first_name = first_name
        if last_name is not None:
            employee.last_name = last_name
        if email is not None and email.lower() != employee.email.lower():
            # Check if email exists
            stmt = select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.email.ilike(email),
                Employee.is_deleted == False,
                Employee.id != employee_id
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ResourceAlreadyExistsException("Employee", email)
            employee.email = email.lower()
        if phone is not None:
            employee.phone = phone
        if position_id is not None:
            # Validate position exists
            stmt = select(Position).where(
                Position.id == position_id,
                Position.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Position", str(position_id))
            employee.position_id = position_id
        if department_id is not None:
            # Validate department exists
            stmt = select(Department).where(
                Department.id == department_id,
                Department.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Department", str(department_id))
            employee.department_id = department_id
        if manager_id is not None:
            if manager_id == employee_id:
                raise BusinessRuleViolationException(
                    "Employee cannot be their own manager"
                )
            # Validate manager exists
            stmt = select(Employee).where(
                Employee.id == manager_id,
                Employee.tenant_id == tenant_id,
                Employee.is_deleted == False
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Manager", str(manager_id))
            employee.manager_id = manager_id
        if status is not None:
            employee.status = status
        if employment_type is not None:
            employee.employment_type = employment_type
        if salary is not None:
            employee.salary = salary
        if date_of_exit is not None:
            employee.date_of_exit = date_of_exit
        if password is not None:
            employee.password_hash = hash_password(password)

        employee.updated_by = updated_by
        employee.updated_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Employee).where(Employee.id == employee.id).options(
            selectinload(Employee.position),
            selectinload(Employee.department),
            selectinload(Employee.manager)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_employee(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Soft delete employee (PII entity)."""
        employee = await self.get_employee(employee_id, tenant_id)

        employee.is_deleted = True
        employee.deleted_at = datetime.utcnow()
        employee.deletion_reason = reason
        employee.updated_by = deleted_by
        employee.updated_at = datetime.utcnow()

        await self.db.commit()

    async def get_subordinates(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Employee], int]:
        """Get direct subordinates of an employee."""
        await self.get_employee(employee_id, tenant_id)

        base_query = select(Employee).where(
            Employee.manager_id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Employee.position),
            selectinload(Employee.department)
        ).offset(pagination.offset).limit(pagination.page_size)

        result = await self.db.execute(stmt)
        employees = list(result.scalars().all())

        return employees, total

    async def get_hierarchy(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        depth: int = 3
    ) -> Employee:
        """Get employee with subordinates hierarchy (recursive)."""
        employee = await self.get_employee(employee_id, tenant_id)

        # Load subordinates recursively up to depth
        if depth > 0:
            await self._load_subordinates(employee, tenant_id, depth)

        return employee

    async def _load_subordinates(
        self,
        employee: Employee,
        tenant_id: UUID,
        depth: int
    ) -> None:
        """Recursively load subordinates."""
        if depth <= 0:
            return

        stmt = select(Employee).where(
            Employee.manager_id == employee.id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        ).options(
            selectinload(Employee.position)
        )
        result = await self.db.execute(stmt)
        subordinates = list(result.scalars().all())

        employee.subordinates = subordinates

        for sub in subordinates:
            await self._load_subordinates(sub, tenant_id, depth - 1)
