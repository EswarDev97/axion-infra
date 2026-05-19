"""
MindFlow Training Service - Enrollment Schemas
Per API_CONTRACT.md Section 8.5.3
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class EnrollmentCreateRequest(BaseModel):
    """POST /enrollments request body."""
    course_id: UUID = Field(alias="courseId")
    employee_id: UUID = Field(alias="employeeId")
    session_id: Optional[UUID] = Field(None, alias="sessionId")
    due_date: Optional[date] = Field(None, alias="dueDate")

    model_config = ConfigDict(populate_by_name=True)


class BulkEnrollmentRequest(BaseModel):
    """POST /enrollments/bulk request body."""
    course_id: UUID = Field(alias="courseId")
    employee_ids: List[UUID] = Field(alias="employeeIds")
    session_id: Optional[UUID] = Field(None, alias="sessionId")
    due_date: Optional[date] = Field(None, alias="dueDate")

    model_config = ConfigDict(populate_by_name=True)


class EnrollmentUpdateRequest(BaseModel):
    """PUT /enrollments/{enrollment_id} request body."""
    status: Optional[str] = None
    progress_percentage: Optional[int] = Field(None, alias="progressPercentage", ge=0, le=100)
    due_date: Optional[date] = Field(None, alias="dueDate")

    model_config = ConfigDict(populate_by_name=True)


class EnrollmentFilters(BaseModel):
    """Query filters for enrollment list."""
    course_id: Optional[UUID] = Field(None, alias="courseId")
    employee_id: Optional[UUID] = Field(None, alias="employeeId")
    session_id: Optional[UUID] = Field(None, alias="sessionId")
    status: Optional[str] = None
    is_overdue: Optional[bool] = Field(None, alias="isOverdue")

    model_config = ConfigDict(populate_by_name=True)


class CourseInfo(BaseModel):
    """Course info embedded in enrollment response."""
    id: UUID
    title: str
    code: str
    is_mandatory: bool = Field(alias="isMandatory")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EmployeeInfo(BaseModel):
    """Employee info embedded in enrollment response."""
    id: UUID
    employee_code: str = Field(alias="employeeCode")
    full_name: str = Field(alias="fullName")
    department: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EnrollmentResponse(BaseModel):
    """Enrollment response schema."""
    id: UUID
    course_id: UUID = Field(alias="courseId")
    course: Optional[CourseInfo] = None
    employee_id: UUID = Field(alias="employeeId")
    employee: Optional[EmployeeInfo] = None
    session_id: Optional[UUID] = Field(None, alias="sessionId")
    status: str
    enrolled_at: datetime = Field(alias="enrolledAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    due_date: Optional[date] = Field(None, alias="dueDate")
    progress_percentage: int = Field(alias="progressPercentage")
    is_overdue: bool = Field(default=False, alias="isOverdue")
    is_completed: bool = Field(default=False, alias="isCompleted")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EnrollmentListResponse(PaginatedData[EnrollmentResponse]):
    """Paginated list of enrollments."""
    pass
