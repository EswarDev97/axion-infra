"""
MindFlow HR Service - Pydantic Schemas
Per API_CONTRACT.md Section 8.2 (HR Module)
"""

from .department import (
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    DepartmentResponse,
    DepartmentListResponse,
)
from .position import (
    PositionCreateRequest,
    PositionUpdateRequest,
    PositionResponse,
    PositionListResponse,
)
from .employee import (
    EmployeeCreateRequest,
    EmployeeUpdateRequest,
    EmployeeChangePasswordRequest,
    EmployeeStatusRequest,
    EmployeeResponse,
    EmployeeListResponse,
    EmployeeFilters,
)
from .leave import (
    LeaveTypeCreateRequest,
    LeaveTypeUpdateRequest,
    LeaveTypeResponse,
    LeaveTypeListResponse,
    LeaveBalanceResponse,
    LeaveBalanceListResponse,
    LeaveRequestCreateRequest,
    LeaveRequestResponse,
    LeaveRequestListResponse,
    LeaveApprovalRequest,
)
from .attendance import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceRecordResponse,
    AttendanceListResponse,
    AttendanceBulkImportRequest,
    AttendanceReportResponse,
    AttendanceConfigResponse,
    AttendanceConfigUpdateRequest,
    AttendanceCorrectionRequest,
    TeamTodayStatusResponse,
    DashboardStatsResponse,
    MarkAbsentRequest,
)
from .holiday import (
    HolidayCreateRequest,
    HolidayUpdateRequest,
    HolidayResponse,
    HolidayListResponse,
    WeeklyOffConfigResponse,
    WeeklyOffDayResponse,
    WeeklyOffUpdateRequest,
)
from .payroll import (
    PayrollCreateRequest,
    PayrollUpdateRequest,
    PayrollResponse,
    PayrollListResponse,
)
from .candidate import (
    CandidateCreateRequest,
    CandidateUpdateRequest,
    CandidateResponse,
    CandidateListResponse,
    CandidateConvertRequest,
)

__all__ = [
    # Department
    "DepartmentCreateRequest",
    "DepartmentUpdateRequest",
    "DepartmentResponse",
    "DepartmentListResponse",
    # Position
    "PositionCreateRequest",
    "PositionUpdateRequest",
    "PositionResponse",
    "PositionListResponse",
    # Employee
    "EmployeeCreateRequest",
    "EmployeeUpdateRequest",
    "EmployeeResponse",
    "EmployeeListResponse",
    "EmployeeFilters",
    "EmployeeChangePasswordRequest",
    "EmployeeStatusRequest",
    # Leave
    "LeaveTypeCreateRequest",
    "LeaveTypeUpdateRequest",
    "LeaveTypeResponse",
    "LeaveTypeListResponse",
    "LeaveBalanceResponse",
    "LeaveBalanceListResponse",
    "LeaveRequestCreateRequest",
    "LeaveRequestResponse",
    "LeaveRequestListResponse",
    "LeaveApprovalRequest",
    # Attendance
    "AttendanceCheckInRequest",
    "AttendanceCheckOutRequest",
    "AttendanceRecordResponse",
    "AttendanceListResponse",
    "AttendanceBulkImportRequest",
    "AttendanceReportResponse",
    "AttendanceConfigResponse",
    "AttendanceConfigUpdateRequest",
    "AttendanceCorrectionRequest",
    "TeamTodayStatusResponse",
    "DashboardStatsResponse",
    "MarkAbsentRequest",
    # Holiday
    "HolidayCreateRequest",
    "HolidayUpdateRequest",
    "HolidayResponse",
    "HolidayListResponse",
    "WeeklyOffConfigResponse",
    "WeeklyOffDayResponse",
    "WeeklyOffUpdateRequest",
    # Payroll
    "PayrollCreateRequest",
    "PayrollUpdateRequest",
    "PayrollResponse",
    "PayrollListResponse",
    # Candidate
    "CandidateCreateRequest",
    "CandidateUpdateRequest",
    "CandidateResponse",
    "CandidateListResponse",
    "CandidateConvertRequest",
]
