"""Payment management module - add case_type column

Revision ID: 20260731_010000
Revises: 20260731_000000
Create Date: 2026-07-31

Adds case_type (RETAIL, YARD, PI, CI, DOC) to payments. Existing rows are
backfilled with RETAIL before the column is made NOT NULL, since it's a
required field going forward but had no prior value.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260731_010000"
down_revision = "20260731_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "payments",
        sa.Column("case_type", sa.String(20), nullable=True),
    )
    op.execute("UPDATE payments SET case_type = 'RETAIL' WHERE case_type IS NULL")
    op.alter_column("payments", "case_type", nullable=False)


def downgrade() -> None:
    op.drop_column("payments", "case_type")
