"""
MindFlow Complaint Service - Payment Service
CRUD operations for case-level payment records.

Payments are financial records retained for audit purposes: delete() is a
SOFT delete (sets is_deleted/deleted_at) rather than a row removal, and
list() always excludes soft-deleted rows.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, asc, desc, table, column, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from services.complaint.models.client import Client

from ..models.payment import Payment
from ..schemas.payment import (
    PaymentCreateRequest,
    PaymentUpdateRequest,
    PaymentResponse,
    PaymentListResponse,
)

# Sorting by the assigned Field Executive's name requires joining against
# the `employees` table, which belongs to the hr service. complaint-service
# only ships its own service/shared code (see services/complaint/Dockerfile
# — COPY services/complaint only), so an ORM import of
# services.hr.models.employee.Employee would crash this service at startup.
# Both services share the same physical database, so a lightweight SQLAlchemy
# Core table() reference (no ORM import) lets us join the real table safely.
_employees_table = table(
    "employees",
    column("id", PGUUID(as_uuid=True)),
    column("first_name", String),
    column("last_name", String),
)

# Columns the Payment Management list screen allows sorting by. The three
# name-resolved columns (client/finance/executive) sort by the joined
# entity's display name rather than the raw FK id, matching what's shown
# on screen — sorting by id would look arbitrary to the user.
_SORTABLE_COLUMNS = {
    "caseReference": lambda: Payment.case_reference,
    "caseStatus": lambda: Payment.case_status,
    "billingStatus": lambda: Payment.billing_status,
    "amount": lambda: Payment.amount,
    "createdAt": lambda: Payment.created_at,
}


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, data: PaymentCreateRequest, tenant_id: UUID, user_id: UUID
    ) -> Payment:
        payment = Payment(
            tenant_id=tenant_id,
            case_reference=data.case_reference,
            client_id=data.client_id,
            finance_id=data.finance_id,
            vehicle_registration_number=data.vehicle_registration_number,
            executive_employee_id=data.executive_employee_id,
            case_status=data.case_status.value,
            billing_status=data.billing_status.value,
            payment_mode=data.payment_mode.value if data.payment_mode else None,
            utr_number=data.utr_number,
            transaction_datetime=data.transaction_datetime,
            amount=data.amount,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def get_by_id(self, payment_id: UUID, tenant_id: UUID) -> Optional[Payment]:
        result = await self.db.execute(
            select(Payment).where(
                Payment.id == payment_id,
                Payment.tenant_id == tenant_id,
                Payment.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self, payment: Payment, data: PaymentUpdateRequest, user_id: UUID
    ) -> Payment:
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            # Enum fields need their raw value stored on the plain-String columns
            if hasattr(value, "value"):
                value = value.value
            setattr(payment, field, value)
        payment.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def delete(self, payment: Payment) -> None:
        """Soft delete: payments are financial records kept for audit."""
        payment.is_deleted = True
        payment.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(payment)

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        limit: int = 50,
        search: Optional[str] = None,
        case_status: Optional[str] = None,
        billing_status: Optional[str] = None,
        client_id: Optional[UUID] = None,
        executive_employee_id: Optional[UUID] = None,
        finance_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> PaymentListResponse:
        """
        executive_employee_id does double duty: it's both the user-facing
        "Field Executive" filter (Payment Management's filter bar) AND the
        payments:read:own server-side scoping mechanism (see api/payments.py)
        — the caller passes whichever value applies; when payments:read:own
        scoping is active it's forced to the caller's own employee id and a
        user-supplied filter value is ignored (see the route).
        date_from/date_to filter on created_at (the "Lead Created Date"
        already surfaced in the Excel export), inclusive of both endpoints.

        sort_by is one of _SORTABLE_COLUMNS' keys, or "client"/"finance"/
        "executive" — the latter three sort by the joined entity's display
        name (clients.name / employees.first_name+last_name) rather than
        the raw FK id, since that's what's actually shown in the table.
        Unrecognized/omitted sort_by falls back to created_at desc (the
        original default ordering).
        """
        client_alias = aliased(Client)
        financer_alias = aliased(Client)
        executive_alias = _employees_table.alias("payment_executive")

        query = (
            select(Payment)
            .outerjoin(client_alias, Payment.client_id == client_alias.id)
            .outerjoin(financer_alias, Payment.finance_id == financer_alias.id)
            .outerjoin(executive_alias, Payment.executive_employee_id == executive_alias.c.id)
            .where(
                Payment.tenant_id == tenant_id,
                Payment.is_deleted.is_(False),
            )
        )

        if case_status:
            query = query.where(Payment.case_status == case_status)

        if billing_status:
            query = query.where(Payment.billing_status == billing_status)

        if client_id:
            query = query.where(Payment.client_id == client_id)

        if finance_id:
            query = query.where(Payment.finance_id == finance_id)

        if executive_employee_id:
            query = query.where(Payment.executive_employee_id == executive_employee_id)

        if date_from:
            query = query.where(
                Payment.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
            )

        if date_to:
            # Inclusive of the entire "to" day.
            query = query.where(
                Payment.created_at < datetime.combine(date_to, datetime.min.time(), tzinfo=timezone.utc)
                + timedelta(days=1)
            )

        if search:
            term = f"%{search}%"
            query = query.where(
                Payment.case_reference.ilike(term)
                | Payment.vehicle_registration_number.ilike(term)
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        direction = desc if sort_order == "desc" else asc
        name_sort_columns = {
            "client": client_alias.name,
            "finance": financer_alias.name,
            "executive": func.concat(executive_alias.c.first_name, " ", executive_alias.c.last_name),
        }
        if sort_by in name_sort_columns:
            query = query.order_by(direction(name_sort_columns[sort_by]))
        elif sort_by in _SORTABLE_COLUMNS:
            query = query.order_by(direction(_SORTABLE_COLUMNS[sort_by]()))
        else:
            query = query.order_by(Payment.created_at.desc())

        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        payments = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        return PaymentListResponse(
            items=[PaymentResponse.model_validate(p) for p in payments],
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )
