"""
MindFlow Training Service - Training Session Schemas
Per API_CONTRACT.md Section 8.5.2
"""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class TrainingSessionCreateRequest(BaseModel):
    """POST /sessions request body."""
    course_id: UUID = Field(alias="courseId")
    title: str = Field(max_length=255)
    session_date: date = Field(alias="sessionDate")
    start_time: time = Field(alias="startTime")
    end_time: time = Field(alias="endTime")
    location: Optional[str] = Field(None, max_length=255)
    trainer_employee_id: Optional[UUID] = Field(None, alias="trainerEmployeeId")
    max_participants: Optional[int] = Field(None, alias="maxParticipants", ge=1)
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class TrainingSessionUpdateRequest(BaseModel):
    """PUT /sessions/{session_id} request body."""
    title: Optional[str] = Field(None, max_length=255)
    session_date: Optional[date] = Field(None, alias="sessionDate")
    start_time: Optional[time] = Field(None, alias="startTime")
    end_time: Optional[time] = Field(None, alias="endTime")
    location: Optional[str] = Field(None, max_length=255)
    trainer_employee_id: Optional[UUID] = Field(None, alias="trainerEmployeeId")
    max_participants: Optional[int] = Field(None, alias="maxParticipants", ge=1)
    status: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class TrainingSessionFilters(BaseModel):
    """Query filters for session list."""
    course_id: Optional[UUID] = Field(None, alias="courseId")
    status: Optional[str] = None
    trainer_employee_id: Optional[UUID] = Field(None, alias="trainerEmployeeId")
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")

    model_config = ConfigDict(populate_by_name=True)


class CourseInfo(BaseModel):
    """Course info embedded in session response."""
    id: UUID
    title: str
    code: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TrainingSessionResponse(BaseModel):
    """Training session response schema."""
    id: UUID
    course_id: UUID = Field(alias="courseId")
    course: Optional[CourseInfo] = None
    title: str
    session_date: date = Field(alias="sessionDate")
    start_time: time = Field(alias="startTime")
    end_time: time = Field(alias="endTime")
    location: Optional[str] = None
    trainer_employee_id: Optional[UUID] = Field(None, alias="trainerEmployeeId")
    trainer_name: Optional[str] = Field(None, alias="trainerName")
    max_participants: Optional[int] = Field(None, alias="maxParticipants")
    participant_count: int = Field(default=0, alias="participantCount")
    is_full: bool = Field(default=False, alias="isFull")
    status: str
    notes: Optional[str] = None
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TrainingSessionListResponse(PaginatedData[TrainingSessionResponse]):
    """Paginated list of training sessions."""
    pass
