"""
MindFlow Training Service - Exam Schemas
Per API_CONTRACT.md Section 8.5.4
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class ExamCreateRequest(BaseModel):
    """POST /exams request body."""
    course_id: UUID = Field(alias="courseId")
    title: str = Field(max_length=255)
    description: Optional[str] = None
    duration_minutes: int = Field(default=60, alias="durationMinutes", ge=1)
    passing_score: int = Field(default=70, alias="passingScore", ge=0, le=100)
    max_attempts: int = Field(default=3, alias="maxAttempts", ge=1)
    shuffle_questions: bool = Field(default=True, alias="shuffleQuestions")
    shuffle_options: bool = Field(default=True, alias="shuffleOptions")
    show_results_immediately: bool = Field(default=True, alias="showResultsImmediately")

    model_config = ConfigDict(populate_by_name=True)


class ExamUpdateRequest(BaseModel):
    """PUT /exams/{exam_id} request body."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes", ge=1)
    passing_score: Optional[int] = Field(None, alias="passingScore", ge=0, le=100)
    max_attempts: Optional[int] = Field(None, alias="maxAttempts", ge=1)
    shuffle_questions: Optional[bool] = Field(None, alias="shuffleQuestions")
    shuffle_options: Optional[bool] = Field(None, alias="shuffleOptions")
    show_results_immediately: Optional[bool] = Field(None, alias="showResultsImmediately")
    is_active: Optional[bool] = Field(None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class QuestionInfo(BaseModel):
    """Question info embedded in exam response."""
    id: UUID
    question_type: str = Field(alias="questionType")
    question_text: str = Field(alias="questionText")
    points: int
    display_order: int = Field(alias="displayOrder")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExamResponse(BaseModel):
    """Exam response schema."""
    id: UUID
    course_id: UUID = Field(alias="courseId")
    title: str
    description: Optional[str] = None
    duration_minutes: int = Field(alias="durationMinutes")
    passing_score: int = Field(alias="passingScore")
    max_attempts: int = Field(alias="maxAttempts")
    shuffle_questions: bool = Field(alias="shuffleQuestions")
    shuffle_options: bool = Field(alias="shuffleOptions")
    show_results_immediately: bool = Field(alias="showResultsImmediately")
    is_active: bool = Field(alias="isActive")
    question_count: int = Field(default=0, alias="questionCount")
    total_points: int = Field(default=0, alias="totalPoints")
    questions: List[QuestionInfo] = Field(default_factory=list)
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExamListResponse(PaginatedData[ExamResponse]):
    """Paginated list of exams."""
    pass
