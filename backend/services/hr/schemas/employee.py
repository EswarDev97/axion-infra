"""
MindFlow HR Service - Employee Schemas
Per API_CONTRACT.md Section 8.2.1
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from shared.schemas import PaginatedData


class LeaveBalanceInput(BaseModel):
    """Leave balance input for employee creation/update."""
    leave_type_code: str = Field(alias="leaveTypeCode")
    days: Decimal = Field(ge=0, alias="days")

    model_config = ConfigDict(populate_by_name=True)


class EmployeeCreateRequest(BaseModel):
    """POST /hr/employees request body."""
    employee_code: str = Field(alias="employeeCode", max_length=50)
    first_name: str = Field(alias="firstName", max_length=100)
    last_name: str = Field(alias="lastName", max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(min_length=6)
    role: Optional[str] = Field(None)
    position_id: UUID = Field(alias="positionId")
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    manager_id: Optional[UUID] = Field(None, alias="managerId")
    date_of_joining: date = Field(alias="dateOfJoining")
    employment_type: str = Field(default="FULL_TIME", alias="employmentType")
    salary: Optional[Decimal] = Field(None, ge=0)
    user_id: Optional[UUID] = Field(None, alias="userId")
    leave_balances: Optional[List[LeaveBalanceInput]] = Field(None, alias="leaveBalances")

    model_config = ConfigDict(populate_by_name=True)


class EmployeeUpdateRequest(BaseModel):
    """PUT /hr/employees/{id} request body."""
    first_name: Optional[str] = Field(None, alias="firstName", max_length=100)
    last_name: Optional[str] = Field(None, alias="lastName", max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=6)
    position_id: Optional[UUID] = Field(None, alias="positionId")
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    manager_id: Optional[UUID] = Field(None, alias="managerId")
    status: Optional[str] = None
    employment_type: Optional[str] = Field(None, alias="employmentType")
    salary: Optional[Decimal] = Field(None, ge=0)
    date_of_exit: Optional[date] = Field(None, alias="dateOfExit")
    leave_balances: Optional[List[LeaveBalanceInput]] = Field(None, alias="leaveBalances")

    model_config = ConfigDict(populate_by_name=True)


class EmployeeChangePasswordRequest(BaseModel):
    """PUT /hr/employees/{id}/change-password request body."""
    password: str = Field(min_length=6)

    model_config = ConfigDict(populate_by_name=True)


class EmployeeStatusRequest(BaseModel):
    """PUT /hr/employees/{id}/status request body."""
    status: str

    model_config = ConfigDict(populate_by_name=True)


class EmployeeFilters(BaseModel):
    """Query filters for employee list."""
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    position_id: Optional[UUID] = Field(None, alias="positionId")
    manager_id: Optional[UUID] = Field(None, alias="managerId")
    status: Optional[str] = None
    employment_type: Optional[str] = Field(None, alias="employmentType")
    search: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class EmployeeResponse(BaseModel):
    """Employee response schema."""
    id: UUID
    employee_code: str = Field(alias="employeeCode")
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    full_name: str = Field(alias="fullName")
    email: EmailStr
    phone: Optional[str] = None
    position_id: UUID = Field(alias="positionId")
    position_title: str = Field(alias="positionTitle")
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    department_name: Optional[str] = Field(None, alias="departmentName")
    manager_id: Optional[UUID] = Field(None, alias="managerId")
    manager_name: Optional[str] = Field(None, alias="managerName")
    date_of_joining: date = Field(alias="dateOfJoining")
    date_of_exit: Optional[date] = Field(None, alias="dateOfExit")
    status: str
    employment_type: str = Field(alias="employmentType")
    salary: Optional[Decimal] = None
    role: Optional[str] = None
    user_id: Optional[UUID] = Field(None, alias="userId")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EmployeeHierarchyNode(BaseModel):
    """Employee in hierarchy structure."""
    id: UUID
    employee_code: str = Field(alias="employeeCode")
    full_name: str = Field(alias="fullName")
    position_title: str = Field(alias="positionTitle")
    department_name: Optional[str] = Field(None, alias="departmentName")
    subordinates: List["EmployeeHierarchyNode"] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class EmployeeListResponse(PaginatedData[EmployeeResponse]):
    """Paginated list of employees."""
    pass
