"""
MindFlow HR Service - Candidate Management Business Logic
Per API_CONTRACT.md Section 8.2.7
"""

from datetime import date, datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import Candidate, Employee, Position


class CandidateService:
    """Candidate management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_candidate(
        self,
        tenant_id: UUID,
        first_name: str,
        last_name: str,
        email: str,
        created_by: UUID,
        phone: Optional[str] = None,
        position_id: Optional[UUID] = None,
        resume_file_id: Optional[UUID] = None,
        source: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Candidate:
        """Create a new candidate."""
        # Check if candidate with same email for same position exists
        stmt = select(Candidate).where(
            Candidate.tenant_id == tenant_id,
            Candidate.email.ilike(email),
            Candidate.position_id == position_id,
            Candidate.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Candidate", email)

        # Validate position if provided
        if position_id:
            stmt = select(Position).where(
                Position.id == position_id,
                Position.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Position", str(position_id))

        candidate = Candidate(
            tenant_id=tenant_id,
            first_name=first_name,
            last_name=last_name,
            email=email.lower(),
            phone=phone,
            position_id=position_id,
            resume_file_id=resume_file_id,
            source=source,
            notes=notes,
            status="APPLIED",
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(candidate)
        await self.db.commit()
        await self.db.refresh(candidate)

        return candidate

    async def get_candidate(
        self,
        candidate_id: UUID,
        tenant_id: UUID
    ) -> Candidate:
        """Get candidate by ID."""
        stmt = select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.tenant_id == tenant_id,
            Candidate.is_deleted == False
        ).options(
            selectinload(Candidate.position)
        )
        result = await self.db.execute(stmt)
        candidate = result.scalar_one_or_none()

        if not candidate:
            raise ResourceNotFoundException("Candidate", str(candidate_id))

        return candidate

    async def list_candidates(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        position_id: Optional[UUID] = None,
        status: Optional[str] = None,
        source: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Candidate], int]:
        """List candidates with pagination and filters."""
        base_query = select(Candidate).where(
            Candidate.tenant_id == tenant_id,
            Candidate.is_deleted == False
        )

        if position_id:
            base_query = base_query.where(Candidate.position_id == position_id)
        if status:
            base_query = base_query.where(Candidate.status == status)
        if source:
            base_query = base_query.where(Candidate.source == source)
        if search:
            search_term = f"%{search}%"
            base_query = base_query.where(
                or_(
                    Candidate.first_name.ilike(search_term),
                    Candidate.last_name.ilike(search_term),
                    Candidate.email.ilike(search_term)
                )
            )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Candidate.position)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(Candidate, pagination.sort_by):
            order_col = getattr(Candidate, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        candidates = list(result.scalars().all())

        return candidates, total

    async def update_candidate(
        self,
        candidate_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        position_id: Optional[UUID] = None,
        resume_file_id: Optional[UUID] = None,
        status: Optional[str] = None,
        source: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Candidate:
        """Update candidate."""
        candidate = await self.get_candidate(candidate_id, tenant_id)

        if first_name is not None:
            candidate.first_name = first_name
        if last_name is not None:
            candidate.last_name = last_name
        if email is not None and email.lower() != candidate.email.lower():
            # Check for duplicate
            stmt = select(Candidate).where(
                Candidate.tenant_id == tenant_id,
                Candidate.email.ilike(email),
                Candidate.position_id == candidate.position_id,
                Candidate.is_deleted == False,
                Candidate.id != candidate_id
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ResourceAlreadyExistsException("Candidate", email)
            candidate.email = email.lower()
        if phone is not None:
            candidate.phone = phone
        if position_id is not None:
            # Validate position
            stmt = select(Position).where(
                Position.id == position_id,
                Position.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("Position", str(position_id))
            candidate.position_id = position_id
        if resume_file_id is not None:
            candidate.resume_file_id = resume_file_id
        if status is not None:
            # Validate status transition
            valid_statuses = [
                "APPLIED", "SCREENING", "INTERVIEW",
                "OFFER", "HIRED", "REJECTED", "WITHDRAWN"
            ]
            if status not in valid_statuses:
                raise BusinessRuleViolationException(
                    f"Invalid status: {status}"
                )
            candidate.status = status
        if source is not None:
            candidate.source = source
        if notes is not None:
            candidate.notes = notes

        candidate.updated_by = updated_by
        candidate.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(candidate)

        return candidate

    async def delete_candidate(
        self,
        candidate_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Soft delete candidate (PII entity)."""
        candidate = await self.get_candidate(candidate_id, tenant_id)

        candidate.is_deleted = True
        candidate.deleted_at = datetime.now(timezone.utc)
        candidate.deletion_reason = reason
        candidate.updated_by = deleted_by
        candidate.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def convert_to_employee(
        self,
        candidate_id: UUID,
        tenant_id: UUID,
        employee_code: str,
        date_of_joining: date,
        created_by: UUID,
        department_id: Optional[UUID] = None,
        manager_id: Optional[UUID] = None,
        employment_type: str = "FULL_TIME",
        create_user_account: bool = False
    ) -> Employee:
        """Convert a hired candidate to an employee."""
        candidate = await self.get_candidate(candidate_id, tenant_id)

        if not candidate.can_be_converted:
            raise ResourceStateConflictException(
                "Only HIRED candidates can be converted to employees",
                current_state=candidate.status,
                target_state="EMPLOYEE"
            )

        if not candidate.position_id:
            raise BusinessRuleViolationException(
                "Candidate must have a position to be converted"
            )

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
            Employee.email.ilike(candidate.email),
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Employee", candidate.email)

        # Create employee
        employee = Employee(
            tenant_id=tenant_id,
            employee_code=employee_code,
            first_name=candidate.first_name,
            last_name=candidate.last_name,
            email=candidate.email,
            phone=candidate.phone,
            position_id=candidate.position_id,
            department_id=department_id,
            manager_id=manager_id,
            date_of_joining=date_of_joining,
            employment_type=employment_type,
            status="ACTIVE",
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(employee)

        # Mark candidate as converted (soft delete with reason)
        candidate.is_deleted = True
        candidate.deleted_at = datetime.now(timezone.utc)
        candidate.deletion_reason = "Converted to employee"
        candidate.updated_by = created_by
        candidate.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(employee)

        return employee
