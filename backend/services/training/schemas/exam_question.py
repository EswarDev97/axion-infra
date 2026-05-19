"""
MindFlow Training Service - Exam Question Schemas
Per API_CONTRACT.md Section 8.5.4
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuestionOption(BaseModel):
    """Option for MCQ/MSQ questions."""
    id: str
    text: str


class ExamQuestionCreateRequest(BaseModel):
    """POST /exams/{exam_id}/questions request body."""
    question_type: str = Field(default="MCQ", alias="questionType")
    question_text: str = Field(alias="questionText")
    options: List[QuestionOption] = Field(default_factory=list)
    correct_answer: Dict[str, Any] = Field(alias="correctAnswer")
    explanation: Optional[str] = None
    points: int = Field(default=1, ge=1)
    display_order: int = Field(default=0, alias="displayOrder", ge=0)

    model_config = ConfigDict(populate_by_name=True)


class ExamQuestionUpdateRequest(BaseModel):
    """PUT /exams/{exam_id}/questions/{question_id} request body."""
    question_type: Optional[str] = Field(None, alias="questionType")
    question_text: Optional[str] = Field(None, alias="questionText")
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[Dict[str, Any]] = Field(None, alias="correctAnswer")
    explanation: Optional[str] = None
    points: Optional[int] = Field(None, ge=1)
    display_order: Optional[int] = Field(None, alias="displayOrder", ge=0)

    model_config = ConfigDict(populate_by_name=True)


class ExamQuestionResponse(BaseModel):
    """Exam question response schema."""
    id: UUID
    exam_id: UUID = Field(alias="examId")
    question_type: str = Field(alias="questionType")
    question_text: str = Field(alias="questionText")
    options: List[QuestionOption]
    correct_answer: Dict[str, Any] = Field(alias="correctAnswer")
    explanation: Optional[str] = None
    points: int
    display_order: int = Field(alias="displayOrder")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExamQuestionForAttempt(BaseModel):
    """Question schema for exam attempt (without correct answer)."""
    id: UUID
    question_number: int = Field(alias="questionNumber")
    question_type: str = Field(alias="questionType")
    question_text: str = Field(alias="questionText")
    options: List[QuestionOption]
    points: int

    model_config = ConfigDict(populate_by_name=True)
