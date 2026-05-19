"""
MindFlow Expense Service - Payment Business Logic
Per API_CONTRACT.md Section 8.6.5
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import ExpenseRequest, PaymentRecord


class PaymentService:
    """Payment processing service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment(
        self,
        expense_request_id: UUID,
        tenant_id: UUID,
        payment_date: date,
        payment_mode: str,
        amount_paid: Decimal,
        processed_by: UUID,
        reference_number: Optional[str] = None,
        remarks: Optional[str] = None
    ) -> PaymentRecord:
        """Create a payment record."""
        # Get expense request
        stmt = select(ExpenseRequest).where(
            ExpenseRequest.id == expense_request_id,
            ExpenseRequest.tenant_id == tenant_id,
            ExpenseRequest.is_deleted == False
        )
        result = await self.db.execute(stmt)
        expense_request = result.scalar_one_or_none()

        if not expense_request:
            raise ResourceNotFoundException("ExpenseRequest", str(expense_request_id))

        if expense_request.status != "FINANCE_APPROVED":
            raise ResourceStateConflictException(
                "Only FINANCE_APPROVED requests can be paid",
                current_state=expense_request.status,
                target_state="PAID"
            )

        # Validate amount
        if amount_paid > expense_request.total_amount:
            raise BusinessRuleViolationException(
                f"Payment amount exceeds request total of {expense_request.total_amount}"
            )

        payment = PaymentRecord(
            tenant_id=tenant_id,
            expense_request_id=expense_request_id,
            payment_date=payment_date,
            payment_mode=payment_mode,
            reference_number=reference_number,
            amount_paid=amount_paid,
            remarks=remarks,
            processed_by=processed_by,
            created_by=processed_by,
            updated_by=processed_by
        )
        self.db.add(payment)

        # Update expense request status
        expense_request.status = "PAID"
        expense_request.paid_at = datetime.now(timezone.utc)
        expense_request.updated_by = processed_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(PaymentRecord).where(PaymentRecord.id == payment.id).options(
            selectinload(PaymentRecord.expense_request)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_payment(
        self,
        payment_id: UUID,
        tenant_id: UUID
    ) -> PaymentRecord:
        """Get payment by ID."""
        stmt = select(PaymentRecord).where(
            PaymentRecord.id == payment_id,
            PaymentRecord.tenant_id == tenant_id
        ).options(
            selectinload(PaymentRecord.expense_request)
        )
        result = await self.db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            raise ResourceNotFoundException("PaymentRecord", str(payment_id))

        return payment

    async def list_payments(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        expense_request_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[List[PaymentRecord], int]:
        """List payment records with pagination."""
        base_query = select(PaymentRecord).where(
            PaymentRecord.tenant_id == tenant_id
        )

        if expense_request_id:
            base_query = base_query.where(
                PaymentRecord.expense_request_id == expense_request_id
            )
        if start_date:
            base_query = base_query.where(
                PaymentRecord.payment_date >= start_date
            )
        if end_date:
            base_query = base_query.where(
                PaymentRecord.payment_date <= end_date
            )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(PaymentRecord.expense_request)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(PaymentRecord.payment_date.desc())

        result = await self.db.execute(stmt)
        payments = list(result.scalars().all())

        return payments, total
