"""
MindFlow Training Service - Enrollment Model
Per DATABASE_SCHEMA.md Section 3.5.4

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    session_id UUID REFERENCES training_sessions(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ENROLLED',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enrolled_by UUID NOT NULL REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    due_date DATE,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, course_id, employee_id)
);
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .course import Course
    from .training_session import TrainingSession
    from .exam_attempt import ExamAttempt
    from .certificate import Certificate


class Enrollment(Base):
    """
    Enrollment entity - tracks employee's progress in a course.
    Status: ENROLLED, IN_PROGRESS, COMPLETED, DROPPED, FAILED
    """

    __tablename__ = "enrollments"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id"),
        nullable=False,
        index=True
    )
    course_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("courses.id"),
        nullable=False,
        index=True
    )
    employee_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )
    session_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("training_sessions.id"),
        nullable=True,
        index=True
    )

    # Enrollment details
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ENROLLED")
    enrolled_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    enrolled_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    progress_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    updated_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    # Relationships
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="enrollments",
        lazy="selectin"
    )
    session: Mapped[Optional["TrainingSession"]] = relationship(
        "TrainingSession",
        back_populates="enrollments",
        lazy="selectin"
    )
    exam_attempts: Mapped[List["ExamAttempt"]] = relationship(
        "ExamAttempt",
        back_populates="enrollment",
        lazy="selectin"
    )
    certificates: Mapped[List["Certificate"]] = relationship(
        "Certificate",
        back_populates="enrollment",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Enrollment(id={self.id}, course_id={self.course_id}, employee_id={self.employee_id})>"

    @property
    def is_overdue(self) -> bool:
        """Check if enrollment is overdue."""
        if not self.due_date:
            return False
        if self.completed_at:
            return False
        return date.today() > self.due_date

    @property
    def is_completed(self) -> bool:
        """Check if enrollment is completed."""
        return self.status == "COMPLETED"
