"""
MindFlow Billing Service - Invoice API Routes
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

from ..schemas.invoice import (
    InvoiceCreateRequest,
    InvoiceUpdateRequest,
    InvoiceResponse,
    InvoiceFilters,
    InvoiceItemCreateRequest,
)
from ..schemas.currency import get_currency_symbol
from ..services.invoice_service import InvoiceService
from ..services.pdf_service import BillingPDFService
from ..models import Quote as QuoteModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])


async def _get_quote_number(db: AsyncSession, quote_id) -> str | None:
    """Look up quote_number for an invoice's linked quote."""
    if not quote_id:
        return None
    from sqlalchemy import select
    result = await db.execute(
        select(QuoteModel.quote_number).where(QuoteModel.id == quote_id)
    )
    row = result.scalar_one_or_none()
    return row

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


def _invoice_to_response(invoice, quote_number: str = None) -> dict:
    """Convert Invoice model to response dict with camelCase keys."""
    items = []
    if invoice.items:
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
            for i in sorted(invoice.items, key=lambda x: x.sort_order)
        ]

    return {
        "id": invoice.id,
        "tenantId": invoice.tenant_id,
        "clientId": invoice.client_id,
        "quoteId": invoice.quote_id,
        "quoteNumber": quote_number,
        "quoteDate": str(invoice.quote_date) if invoice.quote_date else None,
        "poNumber": invoice.po_number,
        "poDate": str(invoice.po_date) if invoice.po_date else None,
        "invoiceNumber": invoice.invoice_number,
        "title": invoice.title,
        "description": invoice.description,
        "billToName": invoice.bill_to_name,
        "billToAddress": invoice.bill_to_address,
        "billToEmail": invoice.bill_to_email,
        "billToPhone": invoice.bill_to_phone,
        "currency": invoice.currency,
        "currencySymbol": get_currency_symbol(invoice.currency),
        "subtotal": float(invoice.subtotal) if invoice.subtotal else 0,
        "taxPercentage": float(invoice.tax_percentage) if invoice.tax_percentage else 0,
        "taxAmount": float(invoice.tax_amount) if invoice.tax_amount else 0,
        "totalAmount": float(invoice.total_amount) if invoice.total_amount else 0,
        "igstPercentage": float(invoice.igst_percentage) if getattr(invoice, 'igst_percentage', None) else 0,
        "cgstPercentage": float(invoice.cgst_percentage) if getattr(invoice, 'cgst_percentage', None) else 0,
        "sgstPercentage": float(invoice.sgst_percentage) if getattr(invoice, 'sgst_percentage', None) else 0,
        "status": invoice.status,
        "dueDate": str(invoice.due_date) if invoice.due_date else None,
        "notes": invoice.notes,
        "terms": invoice.terms,
        "itemCount": invoice.item_count,
        "items": items,
        "issuedAt": invoice.issued_at.isoformat() if invoice.issued_at else None,
        "paidAt": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "cancelledAt": invoice.cancelled_at.isoformat() if invoice.cancelled_at else None,
        "cancellationReason": invoice.cancellation_reason,
        "createdAt": invoice.created_at.isoformat() if invoice.created_at else None,
        "updatedAt": invoice.updated_at.isoformat() if invoice.updated_at else None,
        "createdBy": invoice.created_by,
    }


# ==================== CRUD ====================


@router.get("/next-number", response_model=ApiResponse)
async def get_next_invoice_number(
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Get the next auto-generated invoice number."""
    service = InvoiceService(db)
    next_number = await service._generate_invoice_number(user.tenant_id)
    return ApiResponse(
        success=True,
        data={"nextNumber": next_number},
        message="Next invoice number",
        request_id=uuid4(),
    )


@router.post("", response_model=ApiResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreateRequest,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new invoice. Optionally from an accepted quote."""
    service = InvoiceService(db)
    invoice = await service.create_invoice(user.tenant_id, user.user_id, data)
    qn = await _get_quote_number(db, invoice.quote_id)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice, quote_number=qn),
        message="Invoice created successfully",
        request_id=uuid4(),
    )


@router.get("", response_model=ApiResponse)
async def list_invoices(
    user: CurrentUser = Depends(require_any_permission(BILLING_READ_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    client_id: Optional[UUID] = Query(None, alias="clientId"),
    quote_id: Optional[UUID] = Query(None, alias="quoteId"),
    status: Optional[str] = None,
    currency: Optional[str] = None,
    start_date: Optional[date] = Query(None, alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    due_start_date: Optional[date] = Query(None, alias="dueStartDate"),
    due_end_date: Optional[date] = Query(None, alias="dueEndDate"),
    min_amount: Optional[Decimal] = Query(None, alias="minAmount"),
    max_amount: Optional[Decimal] = Query(None, alias="maxAmount"),
    search: Optional[str] = None,
):
    """List invoices with pagination and filters."""
    pagination = PaginationParams(
        page=page, page_size=page_size, sort_by=sort_by, sort_order=sort_order
    )
    filters = InvoiceFilters(
        client_id=client_id,
        quote_id=quote_id,
        status=status,
        currency=currency,
        start_date=start_date,
        end_date=end_date,
        due_start_date=due_start_date,
        due_end_date=due_end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
    )

    service = InvoiceService(db)
    invoices, total = await service.list_invoices(user.tenant_id, pagination, filters)

    return ApiResponse(
        success=True,
        data={
            "items": [_invoice_to_response(inv) for inv in invoices],
            "pagination": _build_pagination_meta(page, page_size, total).model_dump(by_alias=True),
        },
        message="Invoices retrieved",
        request_id=uuid4(),
    )


@router.get("/{invoice_id}", response_model=ApiResponse)
async def get_invoice(
    invoice_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_READ_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Get a single invoice by ID."""
    service = InvoiceService(db)
    invoice = await service.get_invoice(invoice_id, user.tenant_id)
    qn = await _get_quote_number(db, invoice.quote_id)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice, quote_number=qn),
        message="Invoice retrieved",
        request_id=uuid4(),
    )


@router.put("/{invoice_id}", response_model=ApiResponse)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdateRequest,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Update an invoice (DRAFT only)."""
    service = InvoiceService(db)
    invoice = await service.update_invoice(invoice_id, user.tenant_id, user.user_id, data)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice),
        message="Invoice updated",
        request_id=uuid4(),
    )


@router.delete("/{invoice_id}", response_model=ApiResponse)
async def delete_invoice(
    invoice_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
    reason: Optional[str] = Query(None),
):
    """Soft-delete an invoice."""
    service = InvoiceService(db)
    await service.delete_invoice(invoice_id, user.tenant_id, user.user_id, reason)
    return ApiResponse(
        success=True,
        data=None,
        message="Invoice deleted",
        request_id=uuid4(),
    )


# ==================== Items ====================


@router.post("/{invoice_id}/items", response_model=ApiResponse, status_code=201)
async def add_invoice_item(
    invoice_id: UUID,
    data: InvoiceItemCreateRequest,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Add a line item to an invoice."""
    service = InvoiceService(db)
    invoice = await service.add_item(invoice_id, user.tenant_id, user.user_id, data)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice),
        message="Item added to invoice",
        request_id=uuid4(),
    )


@router.delete("/{invoice_id}/items/{item_id}", response_model=ApiResponse)
async def remove_invoice_item(
    invoice_id: UUID,
    item_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Remove a line item from an invoice."""
    service = InvoiceService(db)
    invoice = await service.remove_item(invoice_id, item_id, user.tenant_id, user.user_id)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice),
        message="Item removed from invoice",
        request_id=uuid4(),
    )


# ==================== Status Transitions ====================


@router.post("/{invoice_id}/send", response_model=ApiResponse)
async def send_invoice(
    invoice_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Send an invoice (DRAFT -> SENT)."""
    service = InvoiceService(db)
    invoice = await service.send_invoice(invoice_id, user.tenant_id, user.user_id)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice),
        message="Invoice sent",
        request_id=uuid4(),
    )


@router.post("/{invoice_id}/mark-paid", response_model=ApiResponse)
async def mark_invoice_paid(
    invoice_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Mark an invoice as paid (SENT -> PAID)."""
    service = InvoiceService(db)
    invoice = await service.mark_paid(invoice_id, user.tenant_id, user.user_id)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice),
        message="Invoice marked as paid",
        request_id=uuid4(),
    )


@router.post("/{invoice_id}/cancel", response_model=ApiResponse)
async def cancel_invoice(
    invoice_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_WRITE_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
    reason: Optional[str] = Query(None),
):
    """Cancel an invoice."""
    service = InvoiceService(db)
    invoice = await service.cancel_invoice(invoice_id, user.tenant_id, user.user_id, reason)
    return ApiResponse(
        success=True,
        data=_invoice_to_response(invoice),
        message="Invoice cancelled",
        request_id=uuid4(),
    )


# ==================== PDF ====================


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: UUID,
    user: CurrentUser = Depends(require_any_permission(BILLING_READ_PERMISSIONS)),
    db: AsyncSession = Depends(get_db_session),
):
    """Download invoice as PDF with currency symbols."""
    service = InvoiceService(db)
    invoice = await service.get_invoice(invoice_id, user.tenant_id)
    qn = await _get_quote_number(db, invoice.quote_id)

    pdf_service = BillingPDFService()
    pdf_buffer = pdf_service.generate_invoice_pdf(invoice, quote_number=qn)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
        },
    )
