"""
MindFlow HR Service - Leave Schemas
Per API_CONTRACT.md Section 8.2.4
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


# Leave Type Schemas
class LeaveTypeCreateRequest(BaseModel):
    """POST /hr/leave/types request body."""
    code: str = Field(max_length=30)
    name: str = Field(max_length=100)
    description: Optional[str] = None
    default_days: int = Field(default=0, ge=0, alias="defaultDays")
    is_paid: bool = Field(default=True, alias="isPaid")
    requires_approval: bool = Field(default=True, alias="requiresApproval")

    model_config = ConfigDict(populate_by_name=True)


class LeaveTypeUpdateRequest(BaseModel):
    """PUT /hr/leave/types/{id} request body."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    default_days: Optional[int] = Field(None, ge=0, alias="defaultDays")
    is_paid: Optional[bool] = Field(None, alias="isPaid")
    requires_approval: Optional[bool] = Field(None, alias="requiresApproval")
    is_active: Optional[bool] = Field(None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class LeaveTypeResponse(BaseModel):
    """Leave type response schema."""
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    default_days: int = Field(alias="defaultDays")
    is_paid: bool = Field(alias="isPaid")
    requires_approval: bool = Field(alias="requiresApproval")
    is_active: bool = Field(alias="isActive")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LeaveTypeListResponse(PaginatedData[LeaveTypeResponse]):
    """Paginated list of leave types."""
    pass


# Leave Balance Schemas
class LeaveBalanceResponse(BaseModel):
    """Leave balance response schema."""
    id: UUID
    employee_id: UUID = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    leave_type_id: UUID = Field(alias="leaveTypeId")
    leave_type_name: str = Field(alias="leaveTypeName")
    year: int
    total_days: Decimal = Field(alias="totalDays")
    used_days: Decimal = Field(alias="usedDays")
    pending_days: Decimal = Field(alias="pendingDays")
    carried_over_days: Decimal = Field(alias="carriedOverDays")
    available_days: Decimal = Field(alias="availableDays")
    tenant_id: UUID = Field(alias="tenantId")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LeaveBalanceListResponse(PaginatedData[LeaveBalanceResponse]):
    """Paginated list of leave balances."""
    pass


# Leave Request Schemas
class LeaveRequestCreateRequest(BaseModel):
    """POST /hr/leave/requests request body."""
    employee_id: Optional[UUID] = Field(None, alias="employeeId")
    leave_type_id: UUID = Field(alias="leaveTypeId")
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    reason: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class LeaveRequestResponse(BaseModel):
    """Leave request response schema."""
    id: UUID
    employee_id: UUID = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    leave_type_id: UUID = Field(alias="leaveTypeId")
    leave_type_name: str = Field(alias="leaveTypeName")
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    days_requested: Decimal = Field(alias="daysRequested")
    reason: Optional[str] = None
    status: str
    approved_by: Optional[UUID] = Field(None, alias="approvedBy")
    approver_name: Optional[str] = Field(None, alias="approverName")
    approved_at: Optional[datetime] = Field(None, alias="approvedAt")
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class LeaveRequestListResponse(PaginatedData[LeaveRequestResponse]):
    """Paginated list of leave requests."""
    pass


class LeaveApprovalRequest(BaseModel):
    """POST /hr/leave/requests/{id}/approve or /reject request body."""
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")

    model_config = ConfigDict(populate_by_name=True)
