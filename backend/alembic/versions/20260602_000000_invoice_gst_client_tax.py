"""Add IGST/CGST/SGST columns to invoices and tax defaults to clients

Revision ID: 20260602_000000
Revises: 20260331_040000
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa

revision = "20260602_000000"
down_revision = "20260331_040000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add GST breakdown columns to invoices
    op.add_column("invoices", sa.Column("igst_percentage", sa.Numeric(5, 2), nullable=False, server_default="0.00"))
    op.add_column("invoices", sa.Column("cgst_percentage", sa.Numeric(5, 2), nullable=False, server_default="0.00"))
    op.add_column("invoices", sa.Column("sgst_percentage", sa.Numeric(5, 2), nullable=False, server_default="0.00"))

    # Add default tax config to clients
    op.add_column("clients", sa.Column("default_tax_type", sa.String(20), nullable=True, server_default="NONE"))
    op.add_column("clients", sa.Column("default_tax_rate", sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "igst_percentage")
    op.drop_column("invoices", "cgst_percentage")
    op.drop_column("invoices", "sgst_percentage")
    op.drop_column("clients", "default_tax_type")
    op.drop_column("clients", "default_tax_rate")
