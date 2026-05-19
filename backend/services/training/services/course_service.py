"""
MindFlow Training Service - Course Business Logic
Per API_CONTRACT.md Section 8.5.1
"""

from datetime import datetime, timezone
from decimal import Decimal
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

from ..models import Course, TrainingContent, Enrollment
from ..schemas.course import CourseFilters


class CourseService:
    """Course management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Course CRUD ====================

    async def create_course(
        self,
        tenant_id: UUID,
        title: str,
        code: str,
        created_by: UUID,
        description: Optional[str] = None,
        objective: Optional[str] = None,
        duration_hours: Optional[Decimal] = None,
        is_mandatory: bool = False,
        passing_score: int = 70,
        max_attempts: int = 3,
        validity_months: Optional[int] = None,
        category: Optional[str] = None
    ) -> Course:
        """Create a new course."""
        # Check for duplicate code
        stmt = select(Course).where(
            Course.tenant_id == tenant_id,
            Course.code == code,
            Course.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Course", f"code={code}")

        course = Course(
            tenant_id=tenant_id,
            title=title,
            code=code,
            description=description,
            objective=objective,
            duration_hours=duration_hours,
            is_mandatory=is_mandatory,
            passing_score=passing_score,
            max_attempts=max_attempts,
            validity_months=validity_months,
            category=category,
            status="DRAFT",
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(course)
        await self.db.commit()
        await self.db.refresh(course)

        return course

    async def get_course(
        self,
        course_id: UUID,
        tenant_id: UUID,
        include_content: bool = False
    ) -> Course:
        """Get course by ID."""
        stmt = select(Course).where(
            Course.id == course_id,
            Course.tenant_id == tenant_id,
            Course.is_deleted == False
        )
        if include_content:
            stmt = stmt.options(
                selectinload(Course.contents),
                selectinload(Course.exams)
            )
        result = await self.db.execute(stmt)
        course = result.scalar_one_or_none()

        if not course:
            raise ResourceNotFoundException("Course", str(course_id))

        return course

    async def list_courses(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[CourseFilters] = None
    ) -> Tuple[List[Course], int]:
        """List courses with pagination and filters."""
        base_query = select(Course).where(
            Course.tenant_id == tenant_id,
            Course.is_deleted == False
        )

        if filters:
            if filters.status:
                base_query = base_query.where(Course.status == filters.status)
            if filters.category:
                base_query = base_query.where(Course.category == filters.category)
            if filters.is_mandatory is not None:
                base_query = base_query.where(Course.is_mandatory == filters.is_mandatory)
            if filters.search:
                search_term = f"%{filters.search}%"
                base_query = base_query.where(
                    or_(
                        Course.title.ilike(search_term),
                        Course.code.ilike(search_term),
                        Course.description.ilike(search_term)
                    )
                )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Course.contents),
            selectinload(Course.exams)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(Course, pagination.sort_by):
            order_col = getattr(Course, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        courses = list(result.scalars().unique().all())

        return courses, total

    async def update_course(
        self,
        course_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        objective: Optional[str] = None,
        duration_hours: Optional[Decimal] = None,
        is_mandatory: Optional[bool] = None,
        passing_score: Optional[int] = None,
        max_attempts: Optional[int] = None,
        validity_months: Optional[int] = None,
        category: Optional[str] = None
    ) -> Course:
        """Update course."""
        course = await self.get_course(course_id, tenant_id)

        if title is not None:
            course.title = title
        if description is not None:
            course.description = description
        if objective is not None:
            course.objective = objective
        if duration_hours is not None:
            course.duration_hours = duration_hours
        if is_mandatory is not None:
            course.is_mandatory = is_mandatory
        if passing_score is not None:
            course.passing_score = passing_score
        if max_attempts is not None:
            course.max_attempts = max_attempts
        if validity_months is not None:
            course.validity_months = validity_months
        if category is not None:
            course.category = category

        course.updated_by = updated_by
        course.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(course)

        return course

    async def delete_course(
        self,
        course_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Soft delete course."""
        course = await self.get_course(course_id, tenant_id)

        # Check for active enrollments
        stmt = select(func.count()).where(
            Enrollment.course_id == course_id,
            Enrollment.tenant_id == tenant_id,
            Enrollment.is_deleted == False,
            Enrollment.status.in_(["ENROLLED", "IN_PROGRESS"])
        )
        result = await self.db.execute(stmt)
        active_count = result.scalar() or 0

        if active_count > 0:
            raise BusinessRuleViolationException(
                f"Cannot delete course with {active_count} active enrollments"
            )

        course.is_deleted = True
        course.deleted_at = datetime.now(timezone.utc)
        course.deletion_reason = reason
        course.updated_by = deleted_by
        course.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def publish_course(
        self,
        course_id: UUID,
        tenant_id: UUID,
        updated_by: UUID
    ) -> Course:
        """Publish a course."""
        course = await self.get_course(course_id, tenant_id, include_content=True)

        if course.status != "DRAFT":
            raise ResourceStateConflictException(
                "Only DRAFT courses can be published",
                current_state=course.status,
                target_state="PUBLISHED"
            )

        # Validate course has content
        if not course.contents or len(course.contents) == 0:
            raise BusinessRuleViolationException(
                "Cannot publish course without any content"
            )

        course.status = "PUBLISHED"
        course.updated_by = updated_by
        course.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(course)

        return course

    async def archive_course(
        self,
        course_id: UUID,
        tenant_id: UUID,
        updated_by: UUID
    ) -> Course:
        """Archive a course."""
        course = await self.get_course(course_id, tenant_id)

        if course.status not in ["DRAFT", "PUBLISHED"]:
            raise ResourceStateConflictException(
                "Cannot archive course in current state",
                current_state=course.status,
                target_state="ARCHIVED"
            )

        course.status = "ARCHIVED"
        course.updated_by = updated_by
        course.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(course)

        return course

    # ==================== Content Management ====================

    async def add_content(
        self,
        course_id: UUID,
        tenant_id: UUID,
        title: str,
        content_type: str,
        created_by: UUID,
        file_id: Optional[UUID] = None,
        external_url: Optional[str] = None,
        display_order: int = 0,
        duration_minutes: Optional[int] = None,
        is_mandatory: bool = True
    ) -> TrainingContent:
        """Add content to course."""
        await self.get_course(course_id, tenant_id)

        # Validate either file_id or external_url is provided
        if not file_id and not external_url:
            raise BusinessRuleViolationException(
                "Either fileId or externalUrl must be provided"
            )

        content = TrainingContent(
            tenant_id=tenant_id,
            course_id=course_id,
            title=title,
            content_type=content_type,
            file_id=file_id,
            external_url=external_url,
            display_order=display_order,
            duration_minutes=duration_minutes,
            is_mandatory=is_mandatory,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(content)
        await self.db.commit()
        await self.db.refresh(content)

        return content

    async def get_content(
        self,
        content_id: UUID,
        tenant_id: UUID
    ) -> TrainingContent:
        """Get content by ID."""
        stmt = select(TrainingContent).where(
            TrainingContent.id == content_id,
            TrainingContent.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        content = result.scalar_one_or_none()

        if not content:
            raise ResourceNotFoundException("TrainingContent", str(content_id))

        return content

    async def list_content(
        self,
        course_id: UUID,
        tenant_id: UUID
    ) -> List[TrainingContent]:
        """List content for a course."""
        await self.get_course(course_id, tenant_id)

        stmt = select(TrainingContent).where(
            TrainingContent.course_id == course_id,
            TrainingContent.tenant_id == tenant_id
        ).order_by(TrainingContent.display_order.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_content(
        self,
        content_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        title: Optional[str] = None,
        content_type: Optional[str] = None,
        file_id: Optional[UUID] = None,
        external_url: Optional[str] = None,
        display_order: Optional[int] = None,
        duration_minutes: Optional[int] = None,
        is_mandatory: Optional[bool] = None
    ) -> TrainingContent:
        """Update content."""
        content = await self.get_content(content_id, tenant_id)

        if title is not None:
            content.title = title
        if content_type is not None:
            content.content_type = content_type
        if file_id is not None:
            content.file_id = file_id
        if external_url is not None:
            content.external_url = external_url
        if display_order is not None:
            content.display_order = display_order
        if duration_minutes is not None:
            content.duration_minutes = duration_minutes
        if is_mandatory is not None:
            content.is_mandatory = is_mandatory

        content.updated_by = updated_by
        content.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(content)

        return content

    async def delete_content(
        self,
        content_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete content."""
        content = await self.get_content(content_id, tenant_id)

        await self.db.delete(content)
        await self.db.commit()
