"""
MindFlow Training Service - Session Business Logic
Per API_CONTRACT.md Section 8.5.2
"""

from datetime import date, datetime, time, timezone
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

from ..models import Course, TrainingSession, TrainingAttendance
from ..schemas.training_session import TrainingSessionFilters


class SessionService:
    """Training session management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Session CRUD ====================

    async def create_session(
        self,
        tenant_id: UUID,
        course_id: UUID,
        title: str,
        session_date: date,
        start_time: time,
        end_time: time,
        created_by: UUID,
        location: Optional[str] = None,
        trainer_employee_id: Optional[UUID] = None,
        max_participants: Optional[int] = None,
        notes: Optional[str] = None
    ) -> TrainingSession:
        """Create a new training session."""
        # Validate course exists
        stmt = select(Course).where(
            Course.id == course_id,
            Course.tenant_id == tenant_id,
            Course.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ResourceNotFoundException("Course", str(course_id))

        session = TrainingSession(
            tenant_id=tenant_id,
            course_id=course_id,
            title=title,
            session_date=session_date,
            start_time=start_time,
            end_time=end_time,
            location=location,
            trainer_employee_id=trainer_employee_id,
            max_participants=max_participants,
            notes=notes,
            status="SCHEDULED",
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def get_session(
        self,
        session_id: UUID,
        tenant_id: UUID
    ) -> TrainingSession:
        """Get session by ID."""
        stmt = select(TrainingSession).where(
            TrainingSession.id == session_id,
            TrainingSession.tenant_id == tenant_id,
            TrainingSession.is_deleted == False
        ).options(
            selectinload(TrainingSession.course),
            selectinload(TrainingSession.attendances)
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ResourceNotFoundException("TrainingSession", str(session_id))

        return session

    async def list_sessions(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[TrainingSessionFilters] = None
    ) -> Tuple[List[TrainingSession], int]:
        """List sessions with pagination and filters."""
        base_query = select(TrainingSession).where(
            TrainingSession.tenant_id == tenant_id,
            TrainingSession.is_deleted == False
        )

        if filters:
            if filters.course_id:
                base_query = base_query.where(TrainingSession.course_id == filters.course_id)
            if filters.status:
                base_query = base_query.where(TrainingSession.status == filters.status)
            if filters.trainer_employee_id:
                base_query = base_query.where(
                    TrainingSession.trainer_employee_id == filters.trainer_employee_id
                )
            if filters.start_date:
                base_query = base_query.where(
                    TrainingSession.session_date >= filters.start_date
                )
            if filters.end_date:
                base_query = base_query.where(
                    TrainingSession.session_date <= filters.end_date
                )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(TrainingSession.course),
            selectinload(TrainingSession.attendances)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(TrainingSession, pagination.sort_by):
            order_col = getattr(TrainingSession, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())
        else:
            stmt = stmt.order_by(TrainingSession.session_date.asc())

        result = await self.db.execute(stmt)
        sessions = list(result.scalars().unique().all())

        return sessions, total

    async def update_session(
        self,
        session_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        title: Optional[str] = None,
        session_date: Optional[date] = None,
        start_time: Optional[time] = None,
        end_time: Optional[time] = None,
        location: Optional[str] = None,
        trainer_employee_id: Optional[UUID] = None,
        max_participants: Optional[int] = None,
        status: Optional[str] = None,
        notes: Optional[str] = None
    ) -> TrainingSession:
        """Update session."""
        session = await self.get_session(session_id, tenant_id)

        if title is not None:
            session.title = title
        if session_date is not None:
            session.session_date = session_date
        if start_time is not None:
            session.start_time = start_time
        if end_time is not None:
            session.end_time = end_time
        if location is not None:
            session.location = location
        if trainer_employee_id is not None:
            session.trainer_employee_id = trainer_employee_id
        if max_participants is not None:
            session.max_participants = max_participants
        if status is not None:
            session.status = status
        if notes is not None:
            session.notes = notes

        session.updated_by = updated_by
        session.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def cancel_session(
        self,
        session_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Cancel/soft delete session."""
        session = await self.get_session(session_id, tenant_id)

        if session.status == "COMPLETED":
            raise ResourceStateConflictException(
                "Cannot cancel completed session",
                current_state=session.status,
                target_state="CANCELLED"
            )

        session.status = "CANCELLED"
        session.is_deleted = True
        session.deleted_at = datetime.now(timezone.utc)
        session.deletion_reason = reason
        session.updated_by = deleted_by
        session.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

    # ==================== Attendance Management ====================

    async def get_attendance(
        self,
        session_id: UUID,
        tenant_id: UUID
    ) -> List[TrainingAttendance]:
        """Get attendance for a session."""
        await self.get_session(session_id, tenant_id)

        stmt = select(TrainingAttendance).where(
            TrainingAttendance.session_id == session_id,
            TrainingAttendance.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def mark_attendance(
        self,
        session_id: UUID,
        employee_id: UUID,
        tenant_id: UUID,
        marked_by: UUID,
        status: str = "PRESENT",
        check_in_time: Optional[time] = None,
        check_out_time: Optional[time] = None,
        remarks: Optional[str] = None
    ) -> TrainingAttendance:
        """Mark attendance for an employee."""
        session = await self.get_session(session_id, tenant_id)

        # Check if already marked
        stmt = select(TrainingAttendance).where(
            TrainingAttendance.session_id == session_id,
            TrainingAttendance.employee_id == employee_id,
            TrainingAttendance.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing attendance
            existing.status = status
            existing.check_in_time = check_in_time
            existing.check_out_time = check_out_time
            existing.remarks = remarks
            existing.marked_by = marked_by
            existing.updated_by = marked_by
            existing.updated_at = datetime.now(timezone.utc)

            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        # Check session capacity
        if session.max_participants and status == "PRESENT":
            if session.participant_count >= session.max_participants:
                raise BusinessRuleViolationException(
                    "Session has reached maximum participants"
                )

        attendance = TrainingAttendance(
            tenant_id=tenant_id,
            session_id=session_id,
            employee_id=employee_id,
            status=status,
            check_in_time=check_in_time,
            check_out_time=check_out_time,
            remarks=remarks,
            marked_by=marked_by,
            created_by=marked_by,
            updated_by=marked_by
        )
        self.db.add(attendance)
        await self.db.commit()
        await self.db.refresh(attendance)

        return attendance

    async def bulk_mark_attendance(
        self,
        session_id: UUID,
        tenant_id: UUID,
        marked_by: UUID,
        attendances: List[dict]
    ) -> List[TrainingAttendance]:
        """Mark attendance for multiple employees."""
        results = []
        for att in attendances:
            result = await self.mark_attendance(
                session_id=session_id,
                employee_id=att["employee_id"],
                tenant_id=tenant_id,
                marked_by=marked_by,
                status=att.get("status", "PRESENT"),
                check_in_time=att.get("check_in_time"),
                check_out_time=att.get("check_out_time"),
                remarks=att.get("remarks")
            )
            results.append(result)
        return results
