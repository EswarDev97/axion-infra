"""
MindFlow Training Service - Course Schemas
Per API_CONTRACT.md Section 8.5.1
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class CourseCreateRequest(BaseModel):
    """POST /courses request body."""
    title: str = Field(max_length=255)
    code: str = Field(max_length=50)
    description: Optional[str] = None
    objective: Optional[str] = None
    duration_hours: Optional[Decimal] = Field(None, alias="durationHours", ge=0)
    is_mandatory: bool = Field(default=False, alias="isMandatory")
    passing_score: int = Field(default=70, alias="passingScore", ge=0, le=100)
    max_attempts: int = Field(default=3, alias="maxAttempts", ge=1)
    validity_months: Optional[int] = Field(None, alias="validityMonths", ge=1)
    category: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CourseUpdateRequest(BaseModel):
    """PUT /courses/{id} request body."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    objective: Optional[str] = None
    duration_hours: Optional[Decimal] = Field(None, alias="durationHours", ge=0)
    is_mandatory: Optional[bool] = Field(None, alias="isMandatory")
    passing_score: Optional[int] = Field(None, alias="passingScore", ge=0, le=100)
    max_attempts: Optional[int] = Field(None, alias="maxAttempts", ge=1)
    validity_months: Optional[int] = Field(None, alias="validityMonths", ge=1)
    category: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CourseFilters(BaseModel):
    """Query filters for course list."""
    status: Optional[str] = None
    category: Optional[str] = None
    is_mandatory: Optional[bool] = Field(None, alias="isMandatory")
    search: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class TrainingContentInfo(BaseModel):
    """Content info embedded in course response."""
    id: UUID
    title: str
    content_type: str = Field(alias="contentType")
    display_order: int = Field(alias="displayOrder")
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes")
    is_mandatory: bool = Field(alias="isMandatory")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExamInfo(BaseModel):
    """Exam info embedded in course response."""
    id: UUID
    title: str
    duration_minutes: int = Field(alias="durationMinutes")
    passing_score: int = Field(alias="passingScore")
    question_count: int = Field(alias="questionCount")
    is_active: bool = Field(alias="isActive")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CourseResponse(BaseModel):
    """Course response schema."""
    id: UUID
    title: str
    code: str
    description: Optional[str] = None
    objective: Optional[str] = None
    duration_hours: Optional[Decimal] = Field(None, alias="durationHours")
    is_mandatory: bool = Field(alias="isMandatory")
    passing_score: int = Field(alias="passingScore")
    max_attempts: int = Field(alias="maxAttempts")
    validity_months: Optional[int] = Field(None, alias="validityMonths")
    status: str
    category: Optional[str] = None
    content_count: int = Field(default=0, alias="contentCount")
    enrollment_count: int = Field(default=0, alias="enrollmentCount")
    contents: List[TrainingContentInfo] = Field(default_factory=list)
    exams: List[ExamInfo] = Field(default_factory=list)
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CourseListResponse(PaginatedData[CourseResponse]):
    """Paginated list of courses."""
    pass
