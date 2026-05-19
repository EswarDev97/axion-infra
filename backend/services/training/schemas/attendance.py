"""
MindFlow Training Service - Attendance Schemas
Per API_CONTRACT.md Section 8.5.2
"""

from datetime import datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class AttendanceMarkRequest(BaseModel):
    """POST /sessions/{session_id}/attendance request body."""
    employee_id: UUID = Field(alias="employeeId")
    status: str = Field(default="PRESENT")  # PRESENT, ABSENT, LATE, EXCUSED
    check_in_time: Optional[time] = Field(None, alias="checkInTime")
    check_out_time: Optional[time] = Field(None, alias="checkOutTime")
    remarks: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class BulkAttendanceMarkRequest(BaseModel):
    """POST /sessions/{session_id}/attendance/bulk request body."""
    attendances: List[AttendanceMarkRequest]

    model_config = ConfigDict(populate_by_name=True)


class EmployeeInfo(BaseModel):
    """Employee info embedded in attendance response."""
    id: UUID
    employee_code: str = Field(alias="employeeCode")
    full_name: str = Field(alias="fullName")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AttendanceResponse(BaseModel):
    """Attendance response schema."""
    id: UUID
    session_id: UUID = Field(alias="sessionId")
    employee_id: UUID = Field(alias="employeeId")
    employee: Optional[EmployeeInfo] = None
    status: str
    check_in_time: Optional[time] = Field(None, alias="checkInTime")
    check_out_time: Optional[time] = Field(None, alias="checkOutTime")
    remarks: Optional[str] = None
    marked_by: UUID = Field(alias="markedBy")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AttendanceListResponse(PaginatedData[AttendanceResponse]):
    """Paginated list of attendance records."""
    pass
