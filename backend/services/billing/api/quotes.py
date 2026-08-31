"""
MindFlow Billing Service - Quote API Routes
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import (
    get_current_user,
    get_db_session,
    require_any_permission,
    CurrentUser,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas.quote import (
    QuoteCreateRequest,
    QuoteUpdateRequest,
    QuoteResponse,
    QuoteFilters,
    QuoteItemCreateRequest,
    QuoteItemUpdateRequest,
)
from ..schemas.currency import get_currency_symbol
from ..services.quote_service import QuoteService
from ..services.pdf_service import BillingPDFService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quotes", tags=["quotes"])

# Permissions: Super Admin, HR Admin, Manager
BILLING_WRITE_PERMISSIONS = [
    "billing:create:all",
    "billing:update:all",
    "hr:manage:all",
]
BILLING_READ_PERMISSIONS = [
    "billing:read:all",
    "billing:read:own",
    "hr:read:all",
]


def _build_pagination_meta(page: int, page_size: int, total: int) -> PaginationMeta:
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return PaginationMeta(
        page=page,
        page_size=page_size,
        total_items=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
    )


def _quote_to_response(quote) -> dict:
    """Convert Quote model to response dict with camelCase keys."""
    items = []
    if quote.items:
        items = [
            {
                "id": i.id,
                "itemName": i.item_name,
                "description": i.description,
                "quantity": float(i.quantity) if i.quantity else 0,
                "rate": float(i.rate) if i.rate else 0,
                "amount": float(i.amount) if i.amount else 0,
                "sortOrder": i.sort_order,
            }
            for i in sorted(quote.items, key=lambda x: x.sort_order)
        ]

    return {
        "id": quote.id,
        "tenantId": quote.tenant_id,
        "clientId": quote.client_id,
        "quoteNumber": quote.quote_number,
        "title": quote.title,
        "description": quote.description,
        "billToName": quote.bill_to_name,
        "billToAddress": quote.bill_to_address,
        "billToEmail": quote.bill_to_email,
        "billToPhone": quote.bill_to_phone,
        "currency": quote.currency,
        "currencySymbol": get_currency_symbol(quote.currency),
        "subtotal": float(quote.subtotal) if quote.subtotal else 0,
        "taxPercentage": float(quote.tax_percentage) if quote.tax_percentage else 0,
        "taxAmount": float(quote.tax_amount) if quote.tax_amount else 0,
        "totalAmount": float(quote.total_amount) if quote.total_amount else 0,
        "status": quote.status,
        "validUntil": str(quote.valid_until) if quote.valid_until else None,
        "notes": quote.notes,
        "terms": quote.terms,
        "itemCount": quote.item_count,
        "items": items,
        "issuedAt": quote.issued_at.isoformat() if quote.issued_at else None,
        "acceptedAt": quote.accepted_at.isoformat() if quote.accepted_at else None,
        "rejectedAt": quote.rejected_at.isoformat() if quote.rejected_at else None,
        "rejectionReason": quote.rejection_reason,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
        "updatedAt": quote.updated_at.isoformat() if quote.updated_at else None,
        "createdBy": quote.created_by,
    }


# ==================== Next Number ====================


@router.get("/next-number", response_model=ApiResponse)
async def get_next_quote_number(
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Get the next auto-generated quote number."""
    service = QuoteService(db)
    next_number = await service._generate_quote_number(user.tenant_id)
    return ApiResponse(
        success=True,
        data={"nextNumber": next_number},
        message="Next quote number",
        request_id=uuid4(),
    )


# ==================== CRUD ====================


@router.post("", response_model=ApiResponse, status_code=201)
async def create_quote(
    data: QuoteCreateRequest,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new quote."""
    service = QuoteService(db)
    quote = await service.create_quote(user.tenant_id, user.user_id, data)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Quote created successfully",
        request_id=uuid4(),
    )


@router.get("", response_model=ApiResponse)
async def list_quotes(
    user: CurrentUser = Depends(require_any_permission(BILLING_READ_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    client_id: Optional[UUID] = Query(None, alias="clientId"),
    status: Optional[str] = None,
    currency: Optional[str] = None,
    start_date: Optional[date] = Query(None, alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    min_amount: Optional[Decimal] = Query(None, alias="minAmount"),
    max_amount: Optional[Decimal] = Query(None, alias="maxAmount"),
    search: Optional[str] = None,
):
    """List quotes with pagination and filters."""
    pagination = PaginationParams(
        page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order
    )
    filters = QuoteFilters(
        client_id=client_id,
        status=status,
        currency=currency,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
    )

    service = QuoteService(db)
    quotes, total = await service.list_quotes(user.tenant_id, pagination, filters)

    return ApiResponse(
        success=True,
        data={
            "items": [_quote_to_response(q) for q in quotes],
            "pagination": _build_pagination_meta(page, page_size, total).model_dump(by_alias=True),
        },
        message="Quotes retrieved",
        request_id=uuid4(),
    )


@router.get("/{quote_id}", response_model=ApiResponse)
async def get_quote(
    quote_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_READ_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Get a single quote by ID."""
    service = QuoteService(db)
    quote = await service.get_quote(quote_id, user.tenant_id)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Quote retrieved",
        request_id=uuid4(),
    )


@router.put("/{quote_id}", response_model=ApiResponse)
async def update_quote(
    quote_id: UUID,
    data: QuoteUpdateRequest,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Update a quote (DRAFT only)."""
    service = QuoteService(db)
    quote = await service.update_quote(quote_id, user.tenant_id, user.user_id, data)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Quote updated",
        request_id=uuid4(),
    )


@router.delete("/{quote_id}", response_model=ApiResponse)
async def delete_quote(
    quote_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
    reason: Optional[str] = Query(None),
):
    """Soft-delete a quote."""
    service = QuoteService(db)
    await service.delete_quote(quote_id, user.tenant_id, user.user_id, reason)
    return ApiResponse(
        success=True,
        data=None,
        message="Quote deleted",
        request_id=uuid4(),
    )


# ==================== Items ====================


@router.post("/{quote_id}/items", response_model=ApiResponse, status_code=201)
async def add_quote_item(
    quote_id: UUID,
    data: QuoteItemCreateRequest,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Add a line item to a quote."""
    service = QuoteService(db)
    quote = await service.add_item(quote_id, user.tenant_id, user.user_id, data)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Item added to quote",
        request_id=uuid4(),
    )


@router.put("/{quote_id}/items/{item_id}", response_model=ApiResponse)
async def update_quote_item(
    quote_id: UUID,
    item_id: UUID,
    data: QuoteItemUpdateRequest,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Update a line item on a quote."""
    service = QuoteService(db)
    quote = await service.update_item(quote_id, item_id, user.tenant_id, user.user_id, data)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Item updated",
        request_id=uuid4(),
    )


@router.delete("/{quote_id}/items/{item_id}", response_model=ApiResponse)
async def remove_quote_item(
    quote_id: UUID,
    item_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Remove a line item from a quote."""
    service = QuoteService(db)
    quote = await service.remove_item(quote_id, item_id, user.tenant_id, user.user_id)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Item removed from quote",
        request_id=uuid4(),
    )


# ==================== Status Transitions ====================


@router.post("/{quote_id}/send", response_model=ApiResponse)
async def send_quote(
    quote_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Send a quote (DRAFT -> SENT)."""
    service = QuoteService(db)
    quote = await service.send_quote(quote_id, user.tenant_id, user.user_id)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Quote sent",
        request_id=uuid4(),
    )


@router.post("/{quote_id}/accept", response_model=ApiResponse)
async def accept_quote(
    quote_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Accept a quote (SENT -> ACCEPTED)."""
    service = QuoteService(db)
    quote = await service.accept_quote(quote_id, user.tenant_id, user.user_id)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Quote accepted",
        request_id=uuid4(),
    )


@router.post("/{quote_id}/reject", response_model=ApiResponse)
async def reject_quote(
    quote_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
    reason: Optional[str] = Query(None),
):
    """Reject a quote (SENT -> REJECTED)."""
    service = QuoteService(db)
    quote = await service.reject_quote(quote_id, user.tenant_id, user.user_id, reason)
    return ApiResponse(
        success=True,
        data=_quote_to_response(quote),
        message="Quote rejected",
        request_id=uuid4(),
    )


# ==================== PDF ====================


@router.get("/{quote_id}/pdf")
async def download_quote_pdf(
    quote_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_READ_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Download quote as PDF with currency symbols."""
    service = QuoteService(db)
    quote = await service.get_quote(quote_id, user.tenant_id)

    pdf_service = BillingPDFService()
    pdf_buffer = pdf_service.generate_quote_pdf(quote)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{quote.quote_number}.pdf"'
        },
    )
