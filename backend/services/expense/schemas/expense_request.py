"""
MindFlow Expense Service - Expense Request Schemas
Per API_CONTRACT.md Section 8.6.1
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class ExpenseRequestCreateRequest(BaseModel):
    """POST /requests request body."""
    title: str = Field(max_length=255)
    description: Optional[str] = None
    expense_date: date = Field(alias="expenseDate")
    due_date: Optional[date] = Field(None, alias="dueDate")
    category_id: Optional[UUID] = Field(None, alias="categoryId")
    collected_by: Optional[str] = Field(None, alias="collectedBy", max_length=150)
    amount: Optional[Decimal] = Field(None, ge=0)
    currency: str = Field(default="INR", max_length=3)

    model_config = ConfigDict(populate_by_name=True)


class ExpenseRequestUpdateRequest(BaseModel):
    """PUT /requests/{request_id} request body."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    expense_date: Optional[date] = Field(None, alias="expenseDate")
    due_date: Optional[date] = Field(None, alias="dueDate")
    collected_by: Optional[str] = Field(None, alias="collectedBy", max_length=150)
    category_id: Optional[UUID] = Field(None, alias="categoryId")
    amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)

    model_config = ConfigDict(populate_by_name=True)


class ExpenseRequestFilters(BaseModel):
    """Query filters for expense request list."""
    employee_id: Optional[UUID] = Field(None, alias="employeeId")
    status: Optional[str] = None
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    due_start_date: Optional[date] = Field(None, alias="dueStartDate")
    due_end_date: Optional[date] = Field(None, alias="dueEndDate")
    min_amount: Optional[Decimal] = Field(None, alias="minAmount")
    max_amount: Optional[Decimal] = Field(None, alias="maxAmount")
    collected_by: Optional[str] = Field(None, alias="collectedBy")
    category_id: Optional[UUID] = Field(None, alias="categoryId")

    model_config = ConfigDict(populate_by_name=True)


class ExpenseItemInfo(BaseModel):
    """Item info embedded in expense request response."""
    id: UUID
    category_id: UUID = Field(alias="categoryId")
    category_name: str = Field(alias="categoryName")
    description: str
    amount: Decimal
    quantity: int
    expense_date: date = Field(alias="expenseDate")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ReceiptInfo(BaseModel):
    """Receipt info embedded in expense request response."""
    id: UUID
    file_id: UUID = Field(alias="fileId")
    expense_item_id: Optional[UUID] = Field(None, alias="expenseItemId")
    uploaded_at: datetime = Field(alias="uploadedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EmployeeInfo(BaseModel):
    """Employee info embedded in expense request response."""
    id: UUID
    employee_code: str = Field(alias="employeeCode")
    full_name: str = Field(alias="fullName")
    department: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExpenseRequestResponse(BaseModel):
    """Expense request response schema."""
    id: UUID
    request_number: str = Field(alias="requestNumber")
    employee_id: UUID = Field(alias="employeeId")
    employee: Optional[EmployeeInfo] = None
    title: str
    description: Optional[str] = None
    expense_date: date = Field(alias="expenseDate")
    due_date: Optional[date] = Field(None, alias="dueDate")
    collected_by: Optional[str] = Field(None, alias="collectedBy")
    total_amount: Decimal = Field(alias="totalAmount")
    currency: str
    status: str
    item_count: int = Field(default=0, alias="itemCount")
    receipt_count: int = Field(default=0, alias="receiptCount")
    items: List[ExpenseItemInfo] = Field(default_factory=list)
    receipts: List[ReceiptInfo] = Field(default_factory=list)
    submitted_at: Optional[datetime] = Field(None, alias="submittedAt")
    approved_at: Optional[datetime] = Field(None, alias="approvedAt")
    rejected_at: Optional[datetime] = Field(None, alias="rejectedAt")
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")
    paid_at: Optional[datetime] = Field(None, alias="paidAt")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExpenseRequestListResponse(PaginatedData[ExpenseRequestResponse]):
    """Paginated list of expense requests."""
    pass


class MyExpensesSummaryResponse(BaseModel):
    """My expenses summary response for employee dashboard."""
    total_requests: int = Field(alias="totalRequests")
    draft_requests: int = Field(alias="draftRequests")
    pending_approval: int = Field(alias="pendingApproval")
    approved: int
    total_submitted_amount: Decimal = Field(alias="totalSubmittedAmount")
    total_paid_amount: Decimal = Field(alias="totalPaidAmount")
    pending_reimbursement: Decimal = Field(alias="pendingReimbursement")

    model_config = ConfigDict(populate_by_name=True)
