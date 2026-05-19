"""
MindFlow Training Service - Exam Attempt Schemas
Per API_CONTRACT.md Section 8.5.5
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData
from .exam_question import ExamQuestionForAttempt


class ExamAttemptStartResponse(BaseModel):
    """POST /exams/{exam_id}/start response."""
    attempt_id: UUID = Field(alias="attemptId")
    exam_id: UUID = Field(alias="examId")
    exam_title: str = Field(alias="examTitle")
    started_at: datetime = Field(alias="startedAt")
    time_limit: int = Field(alias="timeLimit")  # in minutes
    expires_at: datetime = Field(alias="expiresAt")
    questions: List[ExamQuestionForAttempt]
    total_questions: int = Field(alias="totalQuestions")
    total_points: int = Field(alias="totalPoints")

    model_config = ConfigDict(populate_by_name=True)


class QuestionAnswer(BaseModel):
    """Single question answer in submission."""
    question_id: UUID = Field(alias="questionId")
    selected_answer: Any = Field(alias="selectedAnswer")


class ExamSubmitRequest(BaseModel):
    """POST /attempts/{attempt_id}/submit request body."""
    answers: List[QuestionAnswer]

    model_config = ConfigDict(populate_by_name=True)


class ExamAttemptResponse(BaseModel):
    """Exam attempt response schema."""
    id: UUID
    exam_id: UUID = Field(alias="examId")
    exam_title: Optional[str] = Field(None, alias="examTitle")
    employee_id: UUID = Field(alias="employeeId")
    enrollment_id: UUID = Field(alias="enrollmentId")
    attempt_number: int = Field(alias="attemptNumber")
    started_at: datetime = Field(alias="startedAt")
    submitted_at: Optional[datetime] = Field(None, alias="submittedAt")
    time_spent_seconds: Optional[int] = Field(None, alias="timeSpentSeconds")
    score: Optional[int] = None
    max_score: Optional[int] = Field(None, alias="maxScore")
    percentage: Optional[Decimal] = None
    status: str
    is_passed: Optional[bool] = Field(None, alias="isPassed")
    expires_at: Optional[datetime] = Field(None, alias="expiresAt")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class QuestionResultInfo(BaseModel):
    """Question result in exam result response."""
    question_id: UUID = Field(alias="questionId")
    question_text: str = Field(alias="questionText")
    question_type: str = Field(alias="questionType")
    selected_answer: Any = Field(None, alias="selectedAnswer")
    correct_answer: Dict[str, Any] = Field(alias="correctAnswer")
    is_correct: bool = Field(alias="isCorrect")
    points_earned: int = Field(alias="pointsEarned")
    max_points: int = Field(alias="maxPoints")
    explanation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ExamResultResponse(BaseModel):
    """GET /attempts/{attempt_id}/results response."""
    attempt_id: UUID = Field(alias="attemptId")
    exam_id: UUID = Field(alias="examId")
    exam_title: str = Field(alias="examTitle")
    attempt_number: int = Field(alias="attemptNumber")
    started_at: datetime = Field(alias="startedAt")
    submitted_at: datetime = Field(alias="submittedAt")
    time_spent_seconds: int = Field(alias="timeSpentSeconds")
    score: int
    max_score: int = Field(alias="maxScore")
    percentage: Decimal
    passing_score: int = Field(alias="passingScore")
    is_passed: bool = Field(alias="isPassed")
    questions: List[QuestionResultInfo]

    model_config = ConfigDict(populate_by_name=True)


class ExamAttemptListResponse(PaginatedData[ExamAttemptResponse]):
    """Paginated list of exam attempts."""
    pass
