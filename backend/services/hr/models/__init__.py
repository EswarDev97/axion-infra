"""
MindFlow HR Service - Database Models
Per DATABASE_SCHEMA.md Section 3.3 (HR Module Tables)
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before HR models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .department import Department
from .position import Position
from .employee import Employee
from .leave_type import LeaveType
from .leave_balance import LeaveBalance
from .leave_request import LeaveRequest
from .attendance import AttendanceRecord
from .attendance_config import AttendanceConfig
from .holiday import Holiday
from .weekly_off_config import WeeklyOffConfig
from .payroll import PayrollReference
from .candidate import Candidate
from .crm_lead import CrmLead, CrmLeadContact, DiscussionSummary, InterestLevel

__all__ = [
    "Department",
    "Position",
    "Employee",
    "LeaveType",
    "LeaveBalance",
    "LeaveRequest",
    "AttendanceRecord",
    "AttendanceConfig",
    "Holiday",
    "WeeklyOffConfig",
    "PayrollReference",
    "Candidate",
    "CrmLead",
    "CrmLeadContact",
    "DiscussionSummary",
    "InterestLevel",
]
