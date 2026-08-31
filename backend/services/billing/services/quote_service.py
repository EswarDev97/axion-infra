"""
MindFlow Billing Service - Quote Business Logic
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

from ..models import Quote, QuoteItem
from ..schemas.quote import (
    QuoteCreateRequest,
    QuoteUpdateRequest,
    QuoteFilters,
    QuoteItemCreateRequest,
    QuoteItemUpdateRequest,
)
from ..schemas.currency import VALID_CURRENCY_CODES


def _get_financial_year() -> str:
    """Get Indian financial year string e.g. '2526' for dates between Apr 2025 - Mar 2026."""
    today = date.today()
    if today.month >= 4:
        return f"{str(today.year)[2:]}{str(today.year + 1)[2:]}"
    else:
        return f"{str(today.year - 1)[2:]}{str(today.year)[2:]}"


class QuoteService:
    """Quote management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _generate_quote_number(self, tenant_id: UUID) -> str:
        """Generate sequential quote number: AXN-QT-FY-SNO."""
        fy = _get_financial_year()
        prefix = f"AXN-QT-{fy}-"

        # Find the highest existing serial for this FY and tenant
        result = await self.db.execute(
            select(Quote.quote_number)
            .where(
                Quote.tenant_id == tenant_id,
                Quote.quote_number.like(f"{prefix}%"),
            )
            .order_by(Quote.quote_number.desc())
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

    async def create_quote(
        self,
        tenant_id: UUID,
        user_id: UUID,
        data: QuoteCreateRequest,
    ) -> Quote:
        """Create a new quote with optional items."""
        quote_number = data.quote_number or await self._generate_quote_number(tenant_id)
        quote = Quote(
            tenant_id=tenant_id,
            quote_number=quote_number,
            client_id=data.client_id,
            title=data.title,
            description=data.description,
            bill_to_name=data.bill_to_name,
            bill_to_address=data.bill_to_address,
            bill_to_email=data.bill_to_email,
            bill_to_phone=data.bill_to_phone,
            currency=data.currency,
            tax_percentage=data.tax_percentage,
            valid_until=data.valid_until,
            notes=data.notes,
            terms=data.terms,
            status="DRAFT",
            created_by=user_id,
            updated_by=user_id,
        )

        self.db.add(quote)
        await self.db.flush()

        # Add items if provided
        for idx, item_data in enumerate(data.items):
            item = QuoteItem(
                tenant_id=tenant_id,
                quote_id=quote.id,
                item_name=item_data.item_name,
                description=item_data.description or item_data.item_name,
                quantity=item_data.quantity,
                rate=item_data.rate,
                amount=item_data.quantity * item_data.rate,
                sort_order=item_data.sort_order or idx,
                created_by=user_id,
                updated_by=user_id,
            )
            self.db.add(item)

        await self.db.flush()

        # Refresh to load items relationship
        await self.db.refresh(quote, ["items"])
        quote.calculate_totals()
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def get_quote(self, quote_id: UUID, tenant_id: UUID) -> Quote:
        """Get quote by ID."""
        stmt = (
            select(Quote)
            .options(selectinload(Quote.items))
            .where(
                Quote.id == quote_id,
                Quote.tenant_id == tenant_id,
                Quote.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        quote = result.scalar_one_or_none()
        if not quote:
            raise ResourceNotFoundException("Quote", str(quote_id))
        return quote

    async def list_quotes(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[QuoteFilters] = None,
    ) -> Tuple[List[Quote], int]:
        """List quotes with pagination and filters."""
        query = select(Quote).where(
            Quote.tenant_id == tenant_id,
            Quote.is_deleted == False,
        )

        if filters:
            if filters.client_id:
                query = query.where(Quote.client_id == filters.client_id)
            if filters.status:
                query = query.where(Quote.status == filters.status.upper())
            if filters.currency:
                query = query.where(Quote.currency == filters.currency.upper())
            if filters.start_date:
                query = query.where(Quote.created_at >= filters.start_date)
            if filters.end_date:
                query = query.where(Quote.created_at <= filters.end_date)
            if filters.min_amount is not None:
                query = query.where(Quote.total_amount >= filters.min_amount)
            if filters.max_amount is not None:
                query = query.where(Quote.total_amount <= filters.max_amount)
            if filters.search:
                search = f"%{filters.search}%"
                query = query.where(
                    or_(
                        Quote.title.ilike(search),
                        Quote.quote_number.ilike(search),
                    )
                )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Apply sorting and pagination
        sort_col = getattr(Quote, pagination.sort_by, Quote.created_at)
        if pagination.sort_order == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

        query = query.offset(pagination.offset).limit(pagination.page_size)
        query = query.options(selectinload(Quote.items))

        result = await self.db.execute(query)
        quotes = list(result.scalars().all())
        return quotes, total

    async def update_quote(
        self,
        quote_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        data: QuoteUpdateRequest,
    ) -> Quote:
        """Update a quote (only DRAFT quotes can be edited)."""
        quote = await self.get_quote(quote_id, tenant_id)

        if quote.status != "DRAFT":
            raise ResourceStateConflictException(
                "Quote", str(quote_id),
                f"Cannot edit quote in '{quote.status}' status. Only DRAFT quotes can be edited."
            )

        update_fields = data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(quote, field, value)

        quote.updated_by = user_id

        # Recalculate totals if tax changed
        if "tax_percentage" in update_fields:
            quote.calculate_totals()

        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def delete_quote(
        self,
        quote_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None,
    ) -> None:
        """Soft delete a quote."""
        quote = await self.get_quote(quote_id, tenant_id)
        quote.is_deleted = True
        quote.deleted_at = datetime.utcnow()
        quote.deletion_reason = reason
        quote.updated_by = user_id
        await self.db.commit()

    # ==================== Items ====================

    async def add_item(
        self,
        quote_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        data: QuoteItemCreateRequest,
    ) -> Quote:
        """Add a line item to a quote."""
        quote = await self.get_quote(quote_id, tenant_id)

        if quote.status != "DRAFT":
            raise ResourceStateConflictException(
                "Quote", str(quote_id),
                "Cannot add items to a non-DRAFT quote."
            )

        item = QuoteItem(
            tenant_id=tenant_id,
            quote_id=quote_id,
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

        await self.db.refresh(quote, ["items"])
        quote.calculate_totals()
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def update_item(
        self,
        quote_id: UUID,
        item_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        data: QuoteItemUpdateRequest,
    ) -> Quote:
        """Update a line item on a quote."""
        quote = await self.get_quote(quote_id, tenant_id)

        if quote.status != "DRAFT":
            raise ResourceStateConflictException(
                "Quote", str(quote_id),
                "Cannot update items on a non-DRAFT quote."
            )

        item = next((i for i in quote.items if i.id == item_id), None)
        if not item:
            raise ResourceNotFoundException("QuoteItem", str(item_id))

        update_fields = data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(item, field, value)
        item.updated_by = user_id
        item.calculate_amount()
        await self.db.flush()

        await self.db.refresh(quote, ["items"])
        quote.calculate_totals()
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def remove_item(
        self,
        quote_id: UUID,
        item_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> Quote:
        """Remove a line item from a quote."""
        quote = await self.get_quote(quote_id, tenant_id)

        if quote.status != "DRAFT":
            raise ResourceStateConflictException(
                "Quote", str(quote_id),
                "Cannot remove items from a non-DRAFT quote."
            )

        item = next((i for i in quote.items if i.id == item_id), None)
        if not item:
            raise ResourceNotFoundException("QuoteItem", str(item_id))

        await self.db.delete(item)
        await self.db.flush()

        await self.db.refresh(quote, ["items"])
        quote.calculate_totals()
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    # ==================== Status Transitions ====================

    async def send_quote(self, quote_id: UUID, tenant_id: UUID, user_id: UUID) -> Quote:
        """Mark quote as SENT."""
        quote = await self.get_quote(quote_id, tenant_id)
        if quote.status != "DRAFT":
            raise ResourceStateConflictException(
                "Quote", str(quote_id), "Only DRAFT quotes can be sent."
            )
        if not quote.items:
            raise BusinessRuleViolationException("Cannot send a quote with no items.")

        quote.status = "SENT"
        quote.issued_at = datetime.utcnow()
        quote.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def accept_quote(self, quote_id: UUID, tenant_id: UUID, user_id: UUID) -> Quote:
        """Mark quote as ACCEPTED."""
        quote = await self.get_quote(quote_id, tenant_id)
        if quote.status != "SENT":
            raise ResourceStateConflictException(
                "Quote", str(quote_id), "Only SENT quotes can be accepted."
            )
        quote.status = "ACCEPTED"
        quote.accepted_at = datetime.utcnow()
        quote.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(quote)
        return quote

    async def reject_quote(
        self, quote_id: UUID, tenant_id: UUID, user_id: UUID, reason: Optional[str] = None
    ) -> Quote:
        """Mark quote as REJECTED."""
        quote = await self.get_quote(quote_id, tenant_id)
        if quote.status != "SENT":
            raise ResourceStateConflictException(
                "Quote", str(quote_id), "Only SENT quotes can be rejected."
            )
        quote.status = "REJECTED"
        quote.rejected_at = datetime.utcnow()
        quote.rejection_reason = reason
        quote.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(quote)
        return quote
