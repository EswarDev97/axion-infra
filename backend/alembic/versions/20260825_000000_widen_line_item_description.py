"""Widen quote/invoice line item description columns

Revision ID: 20260825_000000
Revises: 20260814_010000
Create Date: 2026-08-25

quote_items.description and invoice_items.description were VARCHAR(255)
while the API schema (QuoteItemCreateRequest/InvoiceItemCreateRequest)
allows up to 500 characters, so multi-line line-item descriptions over
255 chars raised a StringDataRightTruncationError at insert time. Widened
to Text to match the quote/invoice header description columns.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260825_000000"
down_revision = "20260814_010000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "quote_items",
        "description",
        existing_type=sa.String(255),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        "invoice_items",
        "description",
        existing_type=sa.String(255),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "quote_items",
        "description",
        existing_type=sa.Text(),
        type_=sa.String(255),
        existing_nullable=False,
    )
    op.alter_column(
        "invoice_items",
        "description",
        existing_type=sa.Text(),
        type_=sa.String(255),
        existing_nullable=False,
    )
