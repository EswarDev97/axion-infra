"""
MindFlow Expense Service - Expense Request Model
Per DATABASE_SCHEMA.md Section 3.6.2

CREATE TABLE expense_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    request_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, request_number)
);
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .expense_item import ExpenseItem
    from .expense_receipt import ExpenseReceipt
    from .payment_record import PaymentRecord


class ExpenseRequest(Base):
    """
    Expense request entity - main expense claim record.
    Status: DRAFT, SUBMITTED, MANAGER_APPROVED, FINANCE_APPROVED, PAID, REJECTED, CANCELLED
    """

    __tablename__ = "expense_requests"

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
    # Note: No ForeignKey as employees table is in HR service
    employee_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        index=True
    )

    # Core fields
    request_number: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    collected_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Financial details
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")

    # Status and workflow
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT")
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
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
    items: Mapped[List["ExpenseItem"]] = relationship(
        "ExpenseItem",
        back_populates="expense_request",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    receipts: Mapped[List["ExpenseReceipt"]] = relationship(
        "ExpenseReceipt",
        back_populates="expense_request",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    payment_records: Mapped[List["PaymentRecord"]] = relationship(
        "PaymentRecord",
        back_populates="expense_request",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ExpenseRequest(id={self.id}, number={self.request_number}, status={self.status})>"

    @property
    def item_count(self) -> int:
        """Get total item count."""
        return len(self.items) if self.items else 0

    @property
    def receipt_count(self) -> int:
        """Get total receipt count."""
        return len(self.receipts) if self.receipts else 0

    def calculate_total(self) -> Decimal:
        """Calculate total amount from items."""
        if not self.items:
            return Decimal("0.00")
        return sum(item.amount for item in self.items)
