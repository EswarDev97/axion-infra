"""
MindFlow Training Service - Exam Response Model
Per DATABASE_SCHEMA.md Section 3.5.9

CREATE TABLE exam_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id),
    question_id UUID NOT NULL REFERENCES exam_questions(id),
    selected_answer JSONB,
    is_correct BOOLEAN,
    points_earned INTEGER NOT NULL DEFAULT 0,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .exam_attempt import ExamAttempt
    from .exam_question import ExamQuestion


class ExamResponse(Base):
    """
    Exam response entity - individual question response.
    """

    __tablename__ = "exam_responses"

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
    attempt_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("exam_attempts.id"),
        nullable=False,
        index=True
    )
    question_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("exam_questions.id"),
        nullable=False,
        index=True
    )

    # Response details
    selected_answer: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    points_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    answered_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    attempt: Mapped["ExamAttempt"] = relationship(
        "ExamAttempt",
        back_populates="responses",
        lazy="selectin"
    )
    question: Mapped["ExamQuestion"] = relationship(
        "ExamQuestion",
        back_populates="responses",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ExamResponse(id={self.id}, attempt_id={self.attempt_id}, question_id={self.question_id})>"
