"""
MindFlow Billing Service - Invoice Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from shared.schemas import PaginatedData

from .currency import VALID_CURRENCY_CODES


# ============================================================================
# Invoice Item Schemas
# ============================================================================

class InvoiceItemCreateRequest(BaseModel):
    """Create a line item in an invoice."""
    item_name: str = Field(max_length=255, alias="itemName")
    description: Optional[str] = Field(None, max_length=500)
    quantity: Decimal = Field(default=Decimal("1.00"), gt=0)
    rate: Decimal = Field(gt=0)
    sort_order: int = Field(default=0, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class InvoiceItemUpdateRequest(BaseModel):
    """Update a line item in an invoice."""
    item_name: Optional[str] = Field(None, max_length=255, alias="itemName")
    description: Optional[str] = Field(None, max_length=500)
    quantity: Optional[Decimal] = Field(None, gt=0)
    rate: Optional[Decimal] = Field(None, gt=0)
    sort_order: Optional[int] = Field(None, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class InvoiceItemResponse(BaseModel):
    """Invoice item response."""
    id: UUID
    item_name: Optional[str] = Field(None, alias="itemName")
    description: Optional[str] = None
    quantity: Decimal
    rate: Decimal
    amount: Decimal
    sort_order: int = Field(alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ============================================================================
# Invoice Schemas
# ============================================================================

class InvoiceCreateRequest(BaseModel):
    """POST /invoices request body."""
    invoice_number: Optional[str] = Field(None, max_length=50, alias="invoiceNumber")
    client_id: UUID = Field(alias="clientId")
    quote_id: Optional[UUID] = Field(None, alias="quoteId")
    quote_date: Optional[date] = Field(None, alias="quoteDate")
    po_number: Optional[str] = Field(None, max_length=50, alias="poNumber")
    po_date: Optional[date] = Field(None, alias="poDate")
    title: str = Field(max_length=255)
    description: Optional[str] = None
    bill_to_name: Optional[str] = Field(None, max_length=255, alias="billToName")
    bill_to_address: Optional[str] = Field(None, alias="billToAddress")
    bill_to_email: Optional[str] = Field(None, max_length=255, alias="billToEmail")
    bill_to_phone: Optional[str] = Field(None, max_length=50, alias="billToPhone")
    currency: str = Field(default="INR", max_length=3)
    tax_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, alias="taxPercentage")
    due_date: Optional[date] = Field(None, alias="dueDate")
    notes: Optional[str] = None
    terms: Optional[str] = None
    items: List[InvoiceItemCreateRequest] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_CURRENCY_CODES:
            raise ValueError(f"Currency must be one of: {', '.join(VALID_CURRENCY_CODES)}")
        return v


class InvoiceUpdateRequest(BaseModel):
    """PUT /invoices/{invoice_id} request body."""
    invoice_number: Optional[str] = Field(None, max_length=50, alias="invoiceNumber")
    client_id: Optional[UUID] = Field(None, alias="clientId")
    po_number: Optional[str] = Field(None, max_length=50, alias="poNumber")
    po_date: Optional[date] = Field(None, alias="poDate")
    quote_date: Optional[date] = Field(None, alias="quoteDate")
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    bill_to_name: Optional[str] = Field(None, max_length=255, alias="billToName")
    bill_to_address: Optional[str] = Field(None, alias="billToAddress")
    bill_to_email: Optional[str] = Field(None, max_length=255, alias="billToEmail")
    bill_to_phone: Optional[str] = Field(None, max_length=50, alias="billToPhone")
    currency: Optional[str] = Field(None, max_length=3)
    tax_percentage: Optional[Decimal] = Field(None, ge=0, alias="taxPercentage")
    due_date: Optional[date] = Field(None, alias="dueDate")
    notes: Optional[str] = None
    terms: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper()
        if v not in VALID_CURRENCY_CODES:
            raise ValueError(f"Currency must be one of: {', '.join(VALID_CURRENCY_CODES)}")
        return v


class InvoiceFilters(BaseModel):
    """Query filters for invoice list."""
    client_id: Optional[UUID] = Field(None, alias="clientId")
    quote_id: Optional[UUID] = Field(None, alias="quoteId")
    status: Optional[str] = None
    currency: Optional[str] = None
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    due_start_date: Optional[date] = Field(None, alias="dueStartDate")
    due_end_date: Optional[date] = Field(None, alias="dueEndDate")
    min_amount: Optional[Decimal] = Field(None, alias="minAmount")
    max_amount: Optional[Decimal] = Field(None, alias="maxAmount")
    search: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ClientInfo(BaseModel):
    """Embedded client info in invoice response."""
    id: UUID
    name: str
    code: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class QuoteInfo(BaseModel):
    """Embedded quote info in invoice response."""
    id: UUID
    quote_number: str = Field(alias="quoteNumber")
    title: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class InvoiceResponse(BaseModel):
    """Invoice response schema."""
    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    client_id: UUID = Field(alias="clientId")
    client: Optional[ClientInfo] = None
    quote_id: Optional[UUID] = Field(None, alias="quoteId")
    quote: Optional[QuoteInfo] = None
    invoice_number: str = Field(alias="invoiceNumber")
    quote_date: Optional[date] = Field(None, alias="quoteDate")
    po_number: Optional[str] = Field(None, alias="poNumber")
    po_date: Optional[date] = Field(None, alias="poDate")
    title: str
    description: Optional[str] = None
    bill_to_name: Optional[str] = Field(None, alias="billToName")
    bill_to_address: Optional[str] = Field(None, alias="billToAddress")
    bill_to_email: Optional[str] = Field(None, alias="billToEmail")
    bill_to_phone: Optional[str] = Field(None, alias="billToPhone")
    currency: str
    currency_symbol: Optional[str] = Field(None, alias="currencySymbol")
    subtotal: Decimal
    tax_percentage: Decimal = Field(alias="taxPercentage")
    tax_amount: Decimal = Field(alias="taxAmount")
    total_amount: Decimal = Field(alias="totalAmount")
    status: str
    due_date: Optional[date] = Field(None, alias="dueDate")
    notes: Optional[str] = None
    terms: Optional[str] = None
    item_count: int = Field(default=0, alias="itemCount")
    items: List[InvoiceItemResponse] = Field(default_factory=list)
    issued_at: Optional[datetime] = Field(None, alias="issuedAt")
    paid_at: Optional[datetime] = Field(None, alias="paidAt")
    cancelled_at: Optional[datetime] = Field(None, alias="cancelledAt")
    cancellation_reason: Optional[str] = Field(None, alias="cancellationReason")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class InvoiceListResponse(PaginatedData[InvoiceResponse]):
    """Paginated list of invoices."""
    pass
