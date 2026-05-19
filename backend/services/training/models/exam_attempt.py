"""
MindFlow Training Service - Exam Attempt Model
Per DATABASE_SCHEMA.md Section 3.5.8

CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    exam_id UUID NOT NULL REFERENCES exams(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    score INTEGER,
    max_score INTEGER,
    percentage DECIMAL(5,2),
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    is_passed BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .exam import Exam
    from .enrollment import Enrollment
    from .exam_response import ExamResponse


class ExamAttempt(Base):
    """
    Exam attempt entity - tracks a single attempt at an exam.
    Status: IN_PROGRESS, SUBMITTED, GRADED, EXPIRED
    """

    __tablename__ = "exam_attempts"

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
    exam_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("exams.id"),
        nullable=False,
        index=True
    )
    employee_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )
    enrollment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("enrollments.id"),
        nullable=False,
        index=True
    )

    # Attempt details
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    started_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    time_spent_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Scoring
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )

    # Status
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="IN_PROGRESS")
    is_passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

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

    # Relationships
    exam: Mapped["Exam"] = relationship(
        "Exam",
        back_populates="attempts",
        lazy="selectin"
    )
    enrollment: Mapped["Enrollment"] = relationship(
        "Enrollment",
        back_populates="exam_attempts",
        lazy="selectin"
    )
    responses: Mapped[List["ExamResponse"]] = relationship(
        "ExamResponse",
        back_populates="attempt",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ExamAttempt(id={self.id}, exam_id={self.exam_id}, attempt={self.attempt_number})>"

    @property
    def is_expired(self) -> bool:
        """Check if attempt has expired based on exam duration."""
        if self.status != "IN_PROGRESS":
            return False
        if not self.exam or not self.exam.duration_minutes:
            return False
        from datetime import timezone, timedelta
        now = datetime.now(timezone.utc)
        expiry = self.started_at.replace(tzinfo=timezone.utc) + timedelta(minutes=self.exam.duration_minutes)
        return now > expiry

    @property
    def expires_at(self) -> Optional[datetime]:
        """Get expiry time for this attempt."""
        if not self.exam or not self.exam.duration_minutes:
            return None
        from datetime import timedelta
        return self.started_at + timedelta(minutes=self.exam.duration_minutes)
