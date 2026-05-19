"""
MindFlow Expense Service - Expense Item Model
Per DATABASE_SCHEMA.md Section 3.6.3

CREATE TABLE expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id),
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2),
    expense_date DATE NOT NULL,
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

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .expense_request import ExpenseRequest
    from .expense_category import ExpenseCategory
    from .expense_receipt import ExpenseReceipt


class ExpenseItem(Base):
    """
    Expense item entity - line item within an expense request.
    """

    __tablename__ = "expense_items"

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
    category_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("expense_categories.id"),
        nullable=False,
        index=True
    )

    # Core fields
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)

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
        back_populates="items",
        lazy="selectin"
    )
    category: Mapped["ExpenseCategory"] = relationship(
        "ExpenseCategory",
        back_populates="items",
        lazy="selectin"
    )
    receipts: Mapped[list["ExpenseReceipt"]] = relationship(
        "ExpenseReceipt",
        back_populates="expense_item",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ExpenseItem(id={self.id}, amount={self.amount})>"
