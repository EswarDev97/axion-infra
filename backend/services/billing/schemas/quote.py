"""
MindFlow Billing Service - Quote Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from shared.schemas import PaginatedData

from .currency import VALID_CURRENCY_CODES


# ============================================================================
# Quote Item Schemas
# ============================================================================

class QuoteItemCreateRequest(BaseModel):
    """Create a line item in a quote."""
    item_name: str = Field(max_length=255, alias="itemName")
    description: Optional[str] = Field(None, max_length=500)
    quantity: Decimal = Field(default=Decimal("1.00"), gt=0)
    rate: Decimal = Field(gt=0)
    sort_order: int = Field(default=0, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class QuoteItemUpdateRequest(BaseModel):
    """Update a line item in a quote."""
    item_name: Optional[str] = Field(None, max_length=255, alias="itemName")
    description: Optional[str] = Field(None, max_length=500)
    quantity: Optional[Decimal] = Field(None, gt=0)
    rate: Optional[Decimal] = Field(None, gt=0)
    sort_order: Optional[int] = Field(None, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class QuoteItemResponse(BaseModel):
    """Quote item response."""
    id: UUID
    item_name: Optional[str] = Field(None, alias="itemName")
    description: Optional[str] = None
    quantity: Decimal
    rate: Decimal
    amount: Decimal
    sort_order: int = Field(alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ============================================================================
# Quote Schemas
# ============================================================================

class QuoteCreateRequest(BaseModel):
    """POST /quotes request body."""
    quote_number: Optional[str] = Field(None, max_length=50, alias="quoteNumber")
    client_id: UUID = Field(alias="clientId")
    title: str = Field(max_length=255)
    description: Optional[str] = None
    bill_to_name: Optional[str] = Field(None, max_length=255, alias="billToName")
    bill_to_address: Optional[str] = Field(None, alias="billToAddress")
    bill_to_email: Optional[str] = Field(None, max_length=255, alias="billToEmail")
    bill_to_phone: Optional[str] = Field(None, max_length=50, alias="billToPhone")
    currency: str = Field(default="INR", max_length=3)
    tax_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, alias="taxPercentage")
    valid_until: Optional[date] = Field(None, alias="validUntil")
    notes: Optional[str] = None
    terms: Optional[str] = None
    items: List[QuoteItemCreateRequest] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_CURRENCY_CODES:
            raise ValueError(f"Currency must be one of: {', '.join(VALID_CURRENCY_CODES)}")
        return v


class QuoteUpdateRequest(BaseModel):
    """PUT /quotes/{quote_id} request body."""
    quote_number: Optional[str] = Field(None, max_length=50, alias="quoteNumber")
    client_id: Optional[UUID] = Field(None, alias="clientId")
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    bill_to_name: Optional[str] = Field(None, max_length=255, alias="billToName")
    bill_to_address: Optional[str] = Field(None, alias="billToAddress")
    bill_to_email: Optional[str] = Field(None, max_length=255, alias="billToEmail")
    bill_to_phone: Optional[str] = Field(None, max_length=50, alias="billToPhone")
    currency: Optional[str] = Field(None, max_length=3)
    tax_percentage: Optional[Decimal] = Field(None, ge=0, alias="taxPercentage")
    valid_until: Optional[date] = Field(None, alias="validUntil")
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


class QuoteFilters(BaseModel):
    """Query filters for quote list."""
    client_id: Optional[UUID] = Field(None, alias="clientId")
    status: Optional[str] = None
    currency: Optional[str] = None
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    min_amount: Optional[Decimal] = Field(None, alias="minAmount")
    max_amount: Optional[Decimal] = Field(None, alias="maxAmount")
    search: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ClientInfo(BaseModel):
    """Embedded client info in quote response."""
    id: UUID
    name: str
    code: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class QuoteResponse(BaseModel):
    """Quote response schema."""
    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    client_id: UUID = Field(alias="clientId")
    client: Optional[ClientInfo] = None
    quote_number: str = Field(alias="quoteNumber")
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
    valid_until: Optional[date] = Field(None, alias="validUntil")
    notes: Optional[str] = None
    terms: Optional[str] = None
    item_count: int = Field(default=0, alias="itemCount")
    items: List[QuoteItemResponse] = Field(default_factory=list)
    issued_at: Optional[datetime] = Field(None, alias="issuedAt")
    accepted_at: Optional[datetime] = Field(None, alias="acceptedAt")
    rejected_at: Optional[datetime] = Field(None, alias="rejectedAt")
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class QuoteListResponse(PaginatedData[QuoteResponse]):
    """Paginated list of quotes."""
    pass
