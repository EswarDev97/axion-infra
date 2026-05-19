"""
MindFlow Expense Service - Report Schemas
Per API_CONTRACT.md Section 8.6.6
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseSummaryResponse(BaseModel):
    """Expense summary report response."""
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    total_requests: int = Field(alias="totalRequests")
    total_amount: Decimal = Field(alias="totalAmount")
    approved_amount: Decimal = Field(alias="approvedAmount")
    pending_amount: Decimal = Field(alias="pendingAmount")
    rejected_amount: Decimal = Field(alias="rejectedAmount")
    paid_amount: Decimal = Field(alias="paidAmount")
    by_status: dict = Field(alias="byStatus")

    model_config = ConfigDict(populate_by_name=True)


class CategorySummary(BaseModel):
    """Category expense summary."""
    category_id: UUID = Field(alias="categoryId")
    category_name: str = Field(alias="categoryName")
    category_code: str = Field(alias="categoryCode")
    total_amount: Decimal = Field(alias="totalAmount")
    item_count: int = Field(alias="itemCount")
    percentage: Decimal

    model_config = ConfigDict(populate_by_name=True)


class ExpenseByCategoryResponse(BaseModel):
    """Expenses by category report response."""
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    total_amount: Decimal = Field(alias="totalAmount")
    categories: List[CategorySummary]

    model_config = ConfigDict(populate_by_name=True)


class EmployeeSummary(BaseModel):
    """Employee expense summary."""
    employee_id: UUID = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    employee_code: str = Field(alias="employeeCode")
    department: Optional[str] = None
    total_amount: Decimal = Field(alias="totalAmount")
    request_count: int = Field(alias="requestCount")

    model_config = ConfigDict(populate_by_name=True)


class ExpenseByEmployeeResponse(BaseModel):
    """Expenses by employee report response."""
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    total_amount: Decimal = Field(alias="totalAmount")
    employees: List[EmployeeSummary]

    model_config = ConfigDict(populate_by_name=True)
