"""
MindFlow Training Service - Enrollment Business Logic
Per API_CONTRACT.md Section 8.5.3
"""

from datetime import date, datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import Course, TrainingSession, Enrollment
from ..schemas.enrollment import EnrollmentFilters


class EnrollmentService:
    """Enrollment management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Enrollment CRUD ====================

    async def create_enrollment(
        self,
        tenant_id: UUID,
        course_id: UUID,
        employee_id: UUID,
        enrolled_by: UUID,
        session_id: Optional[UUID] = None,
        due_date: Optional[date] = None
    ) -> Enrollment:
        """Create a new enrollment."""
        # Validate course exists and is published
        stmt = select(Course).where(
            Course.id == course_id,
            Course.tenant_id == tenant_id,
            Course.is_deleted == False
        )
        result = await self.db.execute(stmt)
        course = result.scalar_one_or_none()
        if not course:
            raise ResourceNotFoundException("Course", str(course_id))

        if course.status != "PUBLISHED":
            raise BusinessRuleViolationException(
                "Cannot enroll in unpublished course"
            )

        # Check for existing enrollment
        stmt = select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.employee_id == employee_id,
            Enrollment.tenant_id == tenant_id,
            Enrollment.is_deleted == False
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.status in ["ENROLLED", "IN_PROGRESS"]:
                raise ResourceAlreadyExistsException(
                    "Enrollment",
                    f"course={course_id}, employee={employee_id}"
                )

        # Validate session if provided
        if session_id:
            stmt = select(TrainingSession).where(
                TrainingSession.id == session_id,
                TrainingSession.tenant_id == tenant_id,
                TrainingSession.course_id == course_id,
                TrainingSession.is_deleted == False
            )
            result = await self.db.execute(stmt)
            session = result.scalar_one_or_none()
            if not session:
                raise ResourceNotFoundException("TrainingSession", str(session_id))

            if session.is_full:
                raise BusinessRuleViolationException(
                    "Session has reached maximum participants"
                )

        enrollment = Enrollment(
            tenant_id=tenant_id,
            course_id=course_id,
            employee_id=employee_id,
            session_id=session_id,
            due_date=due_date,
            status="ENROLLED",
            enrolled_by=enrolled_by,
            created_by=enrolled_by,
            updated_by=enrolled_by
        )
        self.db.add(enrollment)
        await self.db.commit()
        await self.db.refresh(enrollment)

        return enrollment

    async def bulk_enroll(
        self,
        tenant_id: UUID,
        course_id: UUID,
        employee_ids: List[UUID],
        enrolled_by: UUID,
        session_id: Optional[UUID] = None,
        due_date: Optional[date] = None
    ) -> List[Enrollment]:
        """Bulk enroll multiple employees."""
        results = []
        for emp_id in employee_ids:
            try:
                enrollment = await self.create_enrollment(
                    tenant_id=tenant_id,
                    course_id=course_id,
                    employee_id=emp_id,
                    enrolled_by=enrolled_by,
                    session_id=session_id,
                    due_date=due_date
                )
                results.append(enrollment)
            except (ResourceAlreadyExistsException, BusinessRuleViolationException):
                # Skip employees who are already enrolled or if session is full
                continue
        return results

    async def get_enrollment(
        self,
        enrollment_id: UUID,
        tenant_id: UUID
    ) -> Enrollment:
        """Get enrollment by ID."""
        stmt = select(Enrollment).where(
            Enrollment.id == enrollment_id,
            Enrollment.tenant_id == tenant_id,
            Enrollment.is_deleted == False
        ).options(
            selectinload(Enrollment.course),
            selectinload(Enrollment.session),
            selectinload(Enrollment.certificates)
        )
        result = await self.db.execute(stmt)
        enrollment = result.scalar_one_or_none()

        if not enrollment:
            raise ResourceNotFoundException("Enrollment", str(enrollment_id))

        return enrollment

    async def list_enrollments(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[EnrollmentFilters] = None
    ) -> Tuple[List[Enrollment], int]:
        """List enrollments with pagination and filters."""
        base_query = select(Enrollment).where(
            Enrollment.tenant_id == tenant_id,
            Enrollment.is_deleted == False
        )

        if filters:
            if filters.course_id:
                base_query = base_query.where(Enrollment.course_id == filters.course_id)
            if filters.employee_id:
                base_query = base_query.where(Enrollment.employee_id == filters.employee_id)
            if filters.session_id:
                base_query = base_query.where(Enrollment.session_id == filters.session_id)
            if filters.status:
                base_query = base_query.where(Enrollment.status == filters.status)
            if filters.is_overdue:
                today = date.today()
                base_query = base_query.where(
                    Enrollment.due_date < today,
                    Enrollment.completed_at.is_(None)
                )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Enrollment.course),
            selectinload(Enrollment.session)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(Enrollment, pagination.sort_by):
            order_col = getattr(Enrollment, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())
        else:
            stmt = stmt.order_by(Enrollment.enrolled_at.desc())

        result = await self.db.execute(stmt)
        enrollments = list(result.scalars().unique().all())

        return enrollments, total

    async def update_enrollment(
        self,
        enrollment_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        status: Optional[str] = None,
        progress_percentage: Optional[int] = None,
        due_date: Optional[date] = None
    ) -> Enrollment:
        """Update enrollment."""
        enrollment = await self.get_enrollment(enrollment_id, tenant_id)

        if status is not None:
            # Validate state transitions
            valid_transitions = {
                "ENROLLED": ["IN_PROGRESS", "DROPPED"],
                "IN_PROGRESS": ["COMPLETED", "DROPPED", "FAILED"],
                "COMPLETED": [],
                "DROPPED": [],
                "FAILED": ["ENROLLED", "IN_PROGRESS"]
            }
            if status not in valid_transitions.get(enrollment.status, []):
                raise ResourceStateConflictException(
                    f"Cannot transition from {enrollment.status} to {status}",
                    current_state=enrollment.status,
                    target_state=status
                )

            enrollment.status = status

            if status == "COMPLETED":
                enrollment.completed_at = datetime.now(timezone.utc)
                enrollment.progress_percentage = 100

        if progress_percentage is not None:
            enrollment.progress_percentage = progress_percentage
            if progress_percentage > 0 and enrollment.status == "ENROLLED":
                enrollment.status = "IN_PROGRESS"

        if due_date is not None:
            enrollment.due_date = due_date

        enrollment.updated_by = updated_by
        enrollment.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(enrollment)

        return enrollment

    async def cancel_enrollment(
        self,
        enrollment_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Cancel/soft delete enrollment."""
        enrollment = await self.get_enrollment(enrollment_id, tenant_id)

        if enrollment.status == "COMPLETED":
            raise ResourceStateConflictException(
                "Cannot cancel completed enrollment",
                current_state=enrollment.status,
                target_state="CANCELLED"
            )

        enrollment.is_deleted = True
        enrollment.deleted_at = datetime.now(timezone.utc)
        enrollment.deletion_reason = reason
        enrollment.updated_by = deleted_by
        enrollment.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def get_my_enrollments(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Enrollment], int]:
        """Get enrollments for current employee."""
        filters = EnrollmentFilters(employee_id=employee_id)
        return await self.list_enrollments(tenant_id, pagination, filters)
