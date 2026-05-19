"""
MindFlow Expense Service - Payment Schemas
Per API_CONTRACT.md Section 8.6.5
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class PaymentRecordCreateRequest(BaseModel):
    """POST /payments request body."""
    expense_request_id: UUID = Field(alias="expenseRequestId")
    payment_date: date = Field(alias="paymentDate")
    payment_mode: str = Field(alias="paymentMode")  # BANK_TRANSFER, CASH, CHEQUE, DIGITAL_WALLET
    reference_number: Optional[str] = Field(None, alias="referenceNumber", max_length=100)
    amount_paid: Decimal = Field(alias="amountPaid", gt=0)
    remarks: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ExpenseRequestInfo(BaseModel):
    """Expense request info embedded in payment response."""
    id: UUID
    request_number: str = Field(alias="requestNumber")
    title: str
    total_amount: Decimal = Field(alias="totalAmount")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PaymentRecordResponse(BaseModel):
    """Payment record response schema."""
    id: UUID
    expense_request_id: UUID = Field(alias="expenseRequestId")
    expense_request: Optional[ExpenseRequestInfo] = Field(None, alias="expenseRequest")
    payment_date: date = Field(alias="paymentDate")
    payment_mode: str = Field(alias="paymentMode")
    reference_number: Optional[str] = Field(None, alias="referenceNumber")
    amount_paid: Decimal = Field(alias="amountPaid")
    remarks: Optional[str] = None
    processed_by: UUID = Field(alias="processedBy")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PaymentRecordListResponse(PaginatedData[PaymentRecordResponse]):
    """Paginated list of payment records."""
    pass
