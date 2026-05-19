"""
MindFlow Expense Service - Payment Record Model
Per DATABASE_SCHEMA.md Section 3.6.5

CREATE TABLE payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id),
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    reference_number VARCHAR(100),
    amount_paid DECIMAL(12,2) NOT NULL,
    remarks TEXT,
    processed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .expense_request import ExpenseRequest


class PaymentRecord(Base):
    """
    Payment record entity - tracks payment for approved expenses.
    Payment modes: BANK_TRANSFER, CASH, CHEQUE, DIGITAL_WALLET
    """

    __tablename__ = "payment_records"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    # Note: No ForeignKey as tenants table is in a different service
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        index=True
    )
    expense_request_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("expense_requests.id"),
        nullable=False,
        index=True
    )

    # Payment details
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(30), nullable=False)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Processing details
    # Note: No ForeignKey as users table is in Auth service
    processed_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    # Note: No ForeignKey as users table is in Auth service
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )
    # Note: No ForeignKey as users table is in Auth service
    updated_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Relationships
    expense_request: Mapped["ExpenseRequest"] = relationship(
        "ExpenseRequest",
        back_populates="payment_records",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<PaymentRecord(id={self.id}, amount={self.amount_paid}, mode={self.payment_mode})>"
