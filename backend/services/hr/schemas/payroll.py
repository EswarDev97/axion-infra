"""
MindFlow HR Service - Payroll Schemas
Per API_CONTRACT.md Section 8.2.6
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class PayrollCreateRequest(BaseModel):
    """POST /hr/payroll/references request body."""
    employee_id: UUID = Field(alias="employeeId")
    effective_from: date = Field(alias="effectiveFrom")
    effective_to: Optional[date] = Field(None, alias="effectiveTo")
    base_salary: Decimal = Field(alias="baseSalary", ge=0)
    currency: str = Field(default="USD", max_length=3)
    pay_frequency: str = Field(default="MONTHLY", alias="payFrequency")
    bank_name: Optional[str] = Field(None, alias="bankName", max_length=100)
    bank_account: Optional[str] = Field(None, alias="bankAccount", max_length=50)
    tax_id: Optional[str] = Field(None, alias="taxId", max_length=50)

    model_config = ConfigDict(populate_by_name=True)


class PayrollUpdateRequest(BaseModel):
    """PUT /hr/payroll/references/{id} request body."""
    effective_from: Optional[date] = Field(None, alias="effectiveFrom")
    effective_to: Optional[date] = Field(None, alias="effectiveTo")
    base_salary: Optional[Decimal] = Field(None, alias="baseSalary", ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    pay_frequency: Optional[str] = Field(None, alias="payFrequency")
    bank_name: Optional[str] = Field(None, alias="bankName", max_length=100)
    bank_account: Optional[str] = Field(None, alias="bankAccount", max_length=50)
    tax_id: Optional[str] = Field(None, alias="taxId", max_length=50)

    model_config = ConfigDict(populate_by_name=True)


class PayrollResponse(BaseModel):
    """Payroll reference response schema."""
    id: UUID
    employee_id: UUID = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    employee_code: str = Field(alias="employeeCode")
    effective_from: date = Field(alias="effectiveFrom")
    effective_to: Optional[date] = Field(None, alias="effectiveTo")
    base_salary: Decimal = Field(alias="baseSalary")
    currency: str
    pay_frequency: str = Field(alias="payFrequency")
    bank_name: Optional[str] = Field(None, alias="bankName")
    bank_account_masked: Optional[str] = Field(None, alias="bankAccountMasked")
    tax_id_masked: Optional[str] = Field(None, alias="taxIdMasked")
    is_current: bool = Field(alias="isCurrent")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PayrollListResponse(PaginatedData[PayrollResponse]):
    """Paginated list of payroll references."""
    pass
