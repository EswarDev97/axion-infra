"""
MindFlow Training Service - Exam Question Model
Per DATABASE_SCHEMA.md Section 3.5.7

CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    exam_id UUID NOT NULL REFERENCES exams(id),
    question_type VARCHAR(30) NOT NULL DEFAULT 'MCQ',
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    points INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .exam import Exam
    from .exam_response import ExamResponse


class ExamQuestion(Base):
    """
    Exam question entity.
    Question type: MCQ (multiple choice), MSQ (multi-select), TRUE_FALSE, SHORT_ANSWER
    """

    __tablename__ = "exam_questions"

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

    # Question details
    question_type: Mapped[str] = mapped_column(String(30), nullable=False, default="MCQ")
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list
    )
    correct_answer: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False
    )
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Scoring and display
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

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
    exam: Mapped["Exam"] = relationship(
        "Exam",
        back_populates="questions",
        lazy="selectin"
    )
    responses: Mapped[List["ExamResponse"]] = relationship(
        "ExamResponse",
        back_populates="question",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ExamQuestion(id={self.id}, type={self.question_type})>"

    def check_answer(self, selected_answer: Any) -> bool:
        """Check if the selected answer is correct."""
        if self.question_type == "MCQ":
            return selected_answer == self.correct_answer.get("answer")
        elif self.question_type == "MSQ":
            correct_set = set(self.correct_answer.get("answers", []))
            selected_set = set(selected_answer) if isinstance(selected_answer, list) else set()
            return correct_set == selected_set
        elif self.question_type == "TRUE_FALSE":
            return selected_answer == self.correct_answer.get("answer")
        elif self.question_type == "SHORT_ANSWER":
            # Case-insensitive comparison for short answer
            correct = str(self.correct_answer.get("answer", "")).lower().strip()
            selected = str(selected_answer).lower().strip()
            return correct == selected
        return False
