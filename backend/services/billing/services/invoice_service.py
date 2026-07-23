"""
MindFlow Billing Service - Invoice Business Logic
"""

from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import Invoice, InvoiceItem, Quote
from ..schemas.invoice import (
    InvoiceCreateRequest,
    InvoiceUpdateRequest,
    InvoiceFilters,
    InvoiceItemCreateRequest,
)


def _get_financial_year() -> str:
    """Get Indian financial year string e.g. '2526' for dates between Apr 2025 - Mar 2026."""
    today = date.today()
    if today.month >= 4:
        return f"{str(today.year)[2:]}{str(today.year + 1)[2:]}"
    else:
        return f"{str(today.year - 1)[2:]}{str(today.year)[2:]}"


class InvoiceService:
    """Invoice management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _generate_invoice_number(self, tenant_id: UUID) -> str:
        """Generate sequential invoice number: AXN-INV-FY-SNO."""
        fy = _get_financial_year()
        prefix = f"AXN-INV-{fy}-"

        result = await self.db.execute(
            select(Invoice.invoice_number)
            .where(
                Invoice.tenant_id == tenant_id,
                Invoice.invoice_number.like(f"{prefix}%"),
            )
            .order_by(Invoice.invoice_number.desc())
            .limit(1)
        )
        last = result.scalar_one_or_none()

        if last:
            try:
                last_sno = int(last.replace(prefix, ""))
            except ValueError:
                last_sno = 0
        else:
            last_sno = 0

        next_sno = last_sno + 1
        return f"{prefix}{next_sno:02d}"

    # ==================== CRUD ====================

    async def create_invoice(
        self,
        tenant_id: UUID,
        user_id: UUID,
        data: InvoiceCreateRequest,
    ) -> Invoice:
        """Create a new invoice with optional items."""
        # If creating from a quote, validate and copy items
        items_to_create = list(data.items)
        currency = data.currency

        # Bill date = invoice date printed on the document; default to today
        bill_date = data.bill_date or date.today()

        # Quote reference fields (auto-populated when converting)
        quote_date = data.quote_date
        po_number = data.po_number
        po_date = data.po_date
        bill_to_name = data.bill_to_name
        bill_to_address = data.bill_to_address
        bill_to_email = data.bill_to_email
        bill_to_phone = data.bill_to_phone

        if data.quote_id:
            stmt = (
                select(Quote)
                .options(selectinload(Quote.items))
                .where(
                    Quote.id == data.quote_id,
                    Quote.tenant_id == tenant_id,
                    Quote.is_deleted == False,
                )
            )
            result = await self.db.execute(stmt)
            quote = result.scalar_one_or_none()
            if not quote:
                raise ResourceNotFoundException("Quote", str(data.quote_id))
            if quote.status not in ("ACCEPTED", "SENT"):
                raise ResourceStateConflictException(
                    "Quote", str(data.quote_id),
                    "Can only create invoices from ACCEPTED or SENT quotes."
                )

            # Use quote's currency if not overridden
            currency = data.currency or quote.currency

            # Auto-populate quote date from the quote's issued/created date
            if not quote_date:
                quote_date = (quote.issued_at or quote.created_at).date() if (quote.issued_at or quote.created_at) else None

            # Copy bill-to from quote if not provided
            if not bill_to_name:
                bill_to_name = quote.bill_to_name
            if not bill_to_address:
                bill_to_address = quote.bill_to_address
            if not bill_to_email:
                bill_to_email = quote.bill_to_email
            if not bill_to_phone:
                bill_to_phone = quote.bill_to_phone

            # Copy items from quote if no items provided
            if not items_to_create and quote.items:
                items_to_create = [
                    InvoiceItemCreateRequest(
                        item_name=qi.item_name or qi.description,
                        description=qi.description if qi.description != qi.item_name else None,
                        quantity=qi.quantity,
                        rate=qi.rate,
                        sort_order=qi.sort_order,
                    )
                    for qi in quote.items
                ]

            # Mark quote as CONVERTED
            quote.status = "CONVERTED"
            quote.updated_by = user_id

        invoice = Invoice(
            tenant_id=tenant_id,
            invoice_number=data.invoice_number or await self._generate_invoice_number(tenant_id),
            client_id=data.client_id,
            quote_id=data.quote_id,
            bill_date=bill_date,
            quote_date=quote_date,
            po_number=po_number,
            po_date=po_date,
            title=data.title,
            description=data.description,
            bill_to_name=bill_to_name,
            bill_to_address=bill_to_address,
            bill_to_email=bill_to_email,
            bill_to_phone=bill_to_phone,
            currency=currency,
            tax_percentage=data.tax_percentage,
            igst_percentage=getattr(data, 'igst_percentage', Decimal("0.00")),
            cgst_percentage=getattr(data, 'cgst_percentage', Decimal("0.00")),
            sgst_percentage=getattr(data, 'sgst_percentage', Decimal("0.00")),
            due_date=data.due_date,
            notes=data.notes,
            terms=data.terms,
            status="DRAFT",
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(invoice)
        await self.db.flush()

        for idx, item_data in enumerate(items_to_create):
            item = InvoiceItem(
                tenant_id=tenant_id,
                invoice_id=invoice.id,
                item_name=getattr(item_data, 'item_name', None) or item_data.description,
                description=item_data.description or getattr(item_data, 'item_name', ''),
                quantity=item_data.quantity,
                rate=item_data.rate,
                amount=item_data.quantity * item_data.rate,
                sort_order=item_data.sort_order or idx,
                created_by=user_id,
                updated_by=user_id,
            )
            self.db.add(item)

        await self.db.flush()
        await self.db.refresh(invoice, ["items"])
        invoice.calculate_totals()
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    async def get_invoice(self, invoice_id: UUID, tenant_id: UUID) -> Invoice:
        """Get invoice by ID."""
        stmt = (
            select(Invoice)
            .options(selectinload(Invoice.items))
            .where(
                Invoice.id == invoice_id,
                Invoice.tenant_id == tenant_id,
                Invoice.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        invoice = result.scalar_one_or_none()
        if not invoice:
            raise ResourceNotFoundException("Invoice", str(invoice_id))
        return invoice

    async def list_invoices(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[InvoiceFilters] = None,
    ) -> Tuple[List[Invoice], int]:
        """List invoices with pagination and filters."""
        query = select(Invoice).where(
            Invoice.tenant_id == tenant_id,
            Invoice.is_deleted == False,
        )

        if filters:
            if filters.client_id:
                query = query.where(Invoice.client_id == filters.client_id)
            if filters.quote_id:
                query = query.where(Invoice.quote_id == filters.quote_id)
            if filters.status:
                query = query.where(Invoice.status == filters.status.upper())
            if filters.currency:
                query = query.where(Invoice.currency == filters.currency.upper())
            if filters.start_date:
                query = query.where(Invoice.created_at >= filters.start_date)
            if filters.end_date:
                query = query.where(Invoice.created_at <= filters.end_date)
            if filters.due_start_date:
                query = query.where(Invoice.due_date >= filters.due_start_date)
            if filters.due_end_date:
                query = query.where(Invoice.due_date <= filters.due_end_date)
            if filters.min_amount is not None:
                query = query.where(Invoice.total_amount >= filters.min_amount)
            if filters.max_amount is not None:
                query = query.where(Invoice.total_amount <= filters.max_amount)
            if filters.search:
                search = f"%{filters.search}%"
                query = query.where(
                    or_(
                        Invoice.title.ilike(search),
                        Invoice.invoice_number.ilike(search),
                    )
                )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        sort_col = getattr(Invoice, pagination.sort_by, Invoice.created_at)
        if pagination.sort_order == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

        query = query.offset(pagination.offset).limit(pagination.page_size)
        query = query.options(selectinload(Invoice.items))

        result = await self.db.execute(query)
        invoices = list(result.scalars().all())
        return invoices, total

    async def update_invoice(
        self,
        invoice_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        data: InvoiceUpdateRequest,
    ) -> Invoice:
        """Update an invoice (only DRAFT invoices can be edited)."""
        invoice = await self.get_invoice(invoice_id, tenant_id)

        if invoice.status != "DRAFT":
            raise ResourceStateConflictException(
                "Invoice", str(invoice_id),
                f"Cannot edit invoice in '{invoice.status}' status. Only DRAFT invoices can be edited."
            )

        update_fields = data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(invoice, field, value)

        invoice.updated_by = user_id

        if "tax_percentage" in update_fields:
            invoice.calculate_totals()

        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    async def delete_invoice(
        self,
        invoice_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None,
    ) -> None:
        """Soft delete an invoice."""
        invoice = await self.get_invoice(invoice_id, tenant_id)
        invoice.is_deleted = True
        invoice.deleted_at = datetime.utcnow()
        invoice.deletion_reason = reason
        invoice.updated_by = user_id
        await self.db.commit()

    # ==================== Items ====================

    async def add_item(
        self,
        invoice_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        data: InvoiceItemCreateRequest,
    ) -> Invoice:
        """Add a line item to an invoice."""
        invoice = await self.get_invoice(invoice_id, tenant_id)

        if invoice.status != "DRAFT":
            raise ResourceStateConflictException(
                "Invoice", str(invoice_id),
                "Cannot add items to a non-DRAFT invoice."
            )

        item = InvoiceItem(
            tenant_id=tenant_id,
            invoice_id=invoice_id,
            item_name=data.item_name,
            description=data.description or data.item_name,
            quantity=data.quantity,
            rate=data.rate,
            amount=data.quantity * data.rate,
            sort_order=data.sort_order,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(item)
        await self.db.flush()

        await self.db.refresh(invoice, ["items"])
        invoice.calculate_totals()
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    async def remove_item(
        self,
        invoice_id: UUID,
        item_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> Invoice:
        """Remove a line item from an invoice."""
        invoice = await self.get_invoice(invoice_id, tenant_id)

        if invoice.status != "DRAFT":
            raise ResourceStateConflictException(
                "Invoice", str(invoice_id),
                "Cannot remove items from a non-DRAFT invoice."
            )

        item = next((i for i in invoice.items if i.id == item_id), None)
        if not item:
            raise ResourceNotFoundException("InvoiceItem", str(item_id))

        await self.db.delete(item)
        await self.db.flush()

        await self.db.refresh(invoice, ["items"])
        invoice.calculate_totals()
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    # ==================== Status Transitions ====================

    async def send_invoice(self, invoice_id: UUID, tenant_id: UUID, user_id: UUID) -> Invoice:
        """Mark invoice as SENT."""
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if invoice.status != "DRAFT":
            raise ResourceStateConflictException(
                "Invoice", str(invoice_id), "Only DRAFT invoices can be sent."
            )
        if not invoice.items:
            raise BusinessRuleViolationException("Cannot send an invoice with no items.")

        invoice.status = "SENT"
        invoice.issued_at = datetime.utcnow()
        invoice.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    async def mark_paid(self, invoice_id: UUID, tenant_id: UUID, user_id: UUID) -> Invoice:
        """Mark invoice as PAID."""
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if invoice.status != "SENT":
            raise ResourceStateConflictException(
                "Invoice", str(invoice_id), "Only SENT invoices can be marked as paid."
            )
        invoice.status = "PAID"
        invoice.paid_at = datetime.utcnow()
        invoice.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice

    async def cancel_invoice(
        self, invoice_id: UUID, tenant_id: UUID, user_id: UUID, reason: Optional[str] = None
    ) -> Invoice:
        """Cancel an invoice."""
        invoice = await self.get_invoice(invoice_id, tenant_id)
        if invoice.status in ("PAID", "CANCELLED"):
            raise ResourceStateConflictException(
                "Invoice", str(invoice_id),
                f"Cannot cancel an invoice in '{invoice.status}' status."
            )
        invoice.status = "CANCELLED"
        invoice.cancelled_at = datetime.utcnow()
        invoice.cancellation_reason = reason
        invoice.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(invoice)
        return invoice
