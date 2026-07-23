"""
MindFlow HR Service - Payroll Management Business Logic
Per API_CONTRACT.md Section 8.2.6
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
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import PayrollReference, Employee


class PayrollService:
    """Payroll management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payroll_reference(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        effective_from: date,
        base_salary: Decimal,
        created_by: UUID,
        effective_to: Optional[date] = None,
        currency: str = "USD",
        pay_frequency: str = "MONTHLY",
        bank_name: Optional[str] = None,
        bank_account: Optional[str] = None,
        tax_id: Optional[str] = None
    ) -> PayrollReference:
        """Create a new payroll reference."""
        # Validate employee
        await self._validate_employee(employee_id, tenant_id)

        # Check for overlapping periods
        if await self._has_overlapping_period(
            tenant_id, employee_id, effective_from, effective_to
        ):
            raise BusinessRuleViolationException(
                "Overlapping payroll period exists"
            )

        # Close any open-ended previous record
        await self._close_previous_record(
            tenant_id, employee_id, effective_from
        )

        payroll = PayrollReference(
            tenant_id=tenant_id,
            employee_id=employee_id,
            effective_from=effective_from,
            effective_to=effective_to,
            base_salary=base_salary,
            currency=currency,
            pay_frequency=pay_frequency,
            bank_name=bank_name,
            bank_account=bank_account,
            tax_id=tax_id,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(payroll)
        await self.db.commit()
        await self.db.refresh(payroll)

        return payroll

    async def get_payroll_reference(
        self,
        payroll_id: UUID,
        tenant_id: UUID
    ) -> PayrollReference:
        """Get payroll reference by ID."""
        stmt = select(PayrollReference).where(
            PayrollReference.id == payroll_id,
            PayrollReference.tenant_id == tenant_id
        ).options(
            selectinload(PayrollReference.employee)
        )
        result = await self.db.execute(stmt)
        payroll = result.scalar_one_or_none()

        if not payroll:
            raise ResourceNotFoundException("PayrollReference", str(payroll_id))

        return payroll

    async def get_current_payroll(
        self,
        employee_id: UUID,
        tenant_id: UUID
    ) -> Optional[PayrollReference]:
        """Get current active payroll reference for an employee."""
        today = date.today()
        stmt = select(PayrollReference).where(
            PayrollReference.employee_id == employee_id,
            PayrollReference.tenant_id == tenant_id,
            PayrollReference.effective_from <= today,
            (PayrollReference.effective_to.is_(None)) |
            (PayrollReference.effective_to >= today)
        ).options(
            selectinload(PayrollReference.employee)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_payroll_references(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        employee_id: Optional[UUID] = None,
        is_current: Optional[bool] = None
    ) -> Tuple[List[PayrollReference], int]:
        """List payroll references with pagination."""
        base_query = select(PayrollReference).where(
            PayrollReference.tenant_id == tenant_id
        )

        if employee_id:
            base_query = base_query.where(
                PayrollReference.employee_id == employee_id
            )

        if is_current is not None:
            today = date.today()
            if is_current:
                base_query = base_query.where(
                    PayrollReference.effective_from <= today,
                    (PayrollReference.effective_to.is_(None)) |
                    (PayrollReference.effective_to >= today)
                )
            else:
                base_query = base_query.where(
                    PayrollReference.effective_to < today
                )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(PayrollReference.employee)
        ).offset(pagination.offset).limit(pagination.page_size)

        stmt = stmt.order_by(PayrollReference.effective_from.desc())

        result = await self.db.execute(stmt)
        payrolls = list(result.scalars().all())

        return payrolls, total

    async def update_payroll_reference(
        self,
        payroll_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        effective_from: Optional[date] = None,
        effective_to: Optional[date] = None,
        base_salary: Optional[Decimal] = None,
        currency: Optional[str] = None,
        pay_frequency: Optional[str] = None,
        bank_name: Optional[str] = None,
        bank_account: Optional[str] = None,
        tax_id: Optional[str] = None
    ) -> PayrollReference:
        """Update payroll reference."""
        payroll = await self.get_payroll_reference(payroll_id, tenant_id)

        if effective_from is not None:
            payroll.effective_from = effective_from
        if effective_to is not None:
            payroll.effective_to = effective_to
        if base_salary is not None:
            payroll.base_salary = base_salary
        if currency is not None:
            payroll.currency = currency
        if pay_frequency is not None:
            payroll.pay_frequency = pay_frequency
        if bank_name is not None:
            payroll.bank_name = bank_name
        if bank_account is not None:
            payroll.bank_account = bank_account
        if tax_id is not None:
            payroll.tax_id = tax_id

        payroll.updated_by = updated_by
        payroll.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(payroll)

        return payroll

    async def delete_payroll_reference(
        self,
        payroll_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete payroll reference (hard delete)."""
        payroll = await self.get_payroll_reference(payroll_id, tenant_id)
        await self.db.delete(payroll)
        await self.db.commit()

    async def _validate_employee(
        self,
        employee_id: UUID,
        tenant_id: UUID
    ) -> Employee:
        """Validate employee exists."""
        stmt = select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        employee = result.scalar_one_or_none()

        if not employee:
            raise ResourceNotFoundException("Employee", str(employee_id))

        return employee

    async def _has_overlapping_period(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        effective_from: date,
        effective_to: Optional[date],
        exclude_id: Optional[UUID] = None
    ) -> bool:
        """Check for overlapping payroll periods."""
        stmt = select(PayrollReference).where(
            PayrollReference.employee_id == employee_id,
            PayrollReference.tenant_id == tenant_id
        )

        if exclude_id:
            stmt = stmt.where(PayrollReference.id != exclude_id)

        # Overlap conditions
        if effective_to:
            stmt = stmt.where(
                PayrollReference.effective_from <= effective_to,
                (PayrollReference.effective_to.is_(None)) |
                (PayrollReference.effective_to >= effective_from)
            )
        else:
            stmt = stmt.where(
                (PayrollReference.effective_to.is_(None)) |
                (PayrollReference.effective_to >= effective_from)
            )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def _close_previous_record(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        new_effective_from: date
    ) -> None:
        """Close any open-ended previous payroll record."""
        stmt = select(PayrollReference).where(
            PayrollReference.employee_id == employee_id,
            PayrollReference.tenant_id == tenant_id,
            PayrollReference.effective_to.is_(None),
            PayrollReference.effective_from < new_effective_from
        )
        result = await self.db.execute(stmt)
        previous = result.scalar_one_or_none()

        if previous:
            # Close the previous record one day before new one starts
            from datetime import timedelta
            previous.effective_to = new_effective_from - timedelta(days=1)
            previous.updated_at = datetime.utcnow()
