"""
MindFlow HR Service - Attendance Schemas
Per API_CONTRACT.md Section 8.2.5
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class AttendanceCheckInRequest(BaseModel):
    """POST /hr/attendance/check-in request body."""
    employee_id: Optional[UUID] = Field(None, alias="employeeId")
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class AttendanceCheckOutRequest(BaseModel):
    """POST /hr/attendance/check-out request body."""
    employee_id: Optional[UUID] = Field(None, alias="employeeId")
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class AttendanceRecordResponse(BaseModel):
    """Attendance record response schema."""
    id: UUID
    employee_id: UUID = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    date: date
    check_in: Optional[datetime] = Field(None, alias="checkIn")
    check_out: Optional[datetime] = Field(None, alias="checkOut")
    work_hours: Optional[Decimal] = Field(None, alias="workHours")
    overtime_hours: Optional[Decimal] = Field(None, alias="overtimeHours")
    status: str
    notes: Optional[str] = None
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AttendanceListResponse(PaginatedData[AttendanceRecordResponse]):
    """Paginated list of attendance records."""
    pass


class AttendanceBulkImportItem(BaseModel):
    """Single item in bulk import."""
    employee_code: str = Field(alias="employeeCode")
    date: date
    check_in: Optional[datetime] = Field(None, alias="checkIn")
    check_out: Optional[datetime] = Field(None, alias="checkOut")
    status: str = "PRESENT"
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class AttendanceBulkImportRequest(BaseModel):
    """POST /hr/attendance/bulk-import request body."""
    records: List[AttendanceBulkImportItem]


class AttendanceBulkImportResult(BaseModel):
    """Result of bulk import operation."""
    total: int
    successful: int
    failed: int
    errors: List[Dict[str, str]] = Field(default_factory=list)


class AttendanceReportFilters(BaseModel):
    """Query filters for attendance report."""
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    employee_id: Optional[UUID] = Field(None, alias="employeeId")

    model_config = ConfigDict(populate_by_name=True)


class EmployeeAttendanceSummary(BaseModel):
    """Attendance summary for a single employee."""
    employee_id: UUID = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    employee_code: str = Field(alias="employeeCode")
    department_name: Optional[str] = Field(None, alias="departmentName")
    total_days: int = Field(alias="totalDays")
    present_days: int = Field(alias="presentDays")
    absent_days: int = Field(alias="absentDays")
    late_days: int = Field(alias="lateDays")
    leave_days: int = Field(alias="leaveDays")
    half_days: int = Field(alias="halfDays")
    total_work_hours: Decimal = Field(alias="totalWorkHours")
    average_work_hours: Decimal = Field(alias="averageWorkHours")

    model_config = ConfigDict(populate_by_name=True)


class AttendanceReportResponse(BaseModel):
    """Attendance report response schema."""
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    total_employees: int = Field(alias="totalEmployees")
    summary: List[EmployeeAttendanceSummary]

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# Attendance Configuration
# ============================================================================

class AttendanceConfigResponse(BaseModel):
    """Attendance config response schema."""
    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    office_start_time: str = Field(alias="officeStartTime")
    office_end_time: str = Field(alias="officeEndTime")
    grace_period_minutes: int = Field(alias="gracePeriodMinutes")
    min_work_hours: Decimal = Field(alias="minWorkHours")
    half_day_hours: Decimal = Field(alias="halfDayHours")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AttendanceConfigUpdateRequest(BaseModel):
    """PUT /hr/attendance/config request body."""
    office_start_time: Optional[str] = Field(None, alias="officeStartTime")
    office_end_time: Optional[str] = Field(None, alias="officeEndTime")
    grace_period_minutes: Optional[int] = Field(None, alias="gracePeriodMinutes", ge=0, le=120)
    min_work_hours: Optional[Decimal] = Field(None, alias="minWorkHours", ge=0, le=24)
    half_day_hours: Optional[Decimal] = Field(None, alias="halfDayHours", ge=0, le=24)

    model_config = ConfigDict(populate_by_name=True)


class AttendanceCorrectionRequest(BaseModel):
    """PUT /hr/attendance/{id} request body for HR admin corrections."""
    check_in: Optional[datetime] = Field(None, alias="checkIn")
    check_out: Optional[datetime] = Field(None, alias="checkOut")
    status: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class TeamTodayStatusResponse(BaseModel):
    """Response for GET /attendance/team/today."""
    employee_id: UUID = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    employee_code: str = Field(alias="employeeCode")
    department_name: Optional[str] = Field(None, alias="departmentName")
    status: Optional[str] = None
    check_in: Optional[datetime] = Field(None, alias="checkIn")
    check_out: Optional[datetime] = Field(None, alias="checkOut")
    work_hours: Optional[Decimal] = Field(None, alias="workHours")

    model_config = ConfigDict(populate_by_name=True)


class DashboardStatsResponse(BaseModel):
    """Response for GET /attendance/dashboard-stats."""
    total_employees: int = Field(alias="totalEmployees")
    present_today: int = Field(alias="presentToday")
    absent_today: int = Field(alias="absentToday")
    late_today: int = Field(alias="lateToday")
    on_leave_today: int = Field(alias="onLeaveToday")
    attendance_percentage: Decimal = Field(alias="attendancePercentage")

    model_config = ConfigDict(populate_by_name=True)


class MarkAbsentRequest(BaseModel):
    """POST /hr/attendance/mark-absent request body."""
    target_date: date = Field(alias="targetDate")

    model_config = ConfigDict(populate_by_name=True)
