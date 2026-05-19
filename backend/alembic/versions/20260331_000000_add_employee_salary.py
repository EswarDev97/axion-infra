"""Add salary column to employees table

Revision ID: 20260331_000000
Revises: 20260330_010000
Create Date: 2026-03-31

Adds salary NUMERIC(12,2) to the employees table
to support tracking employee compensation.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "20260331_000000"
down_revision = "20260330_010000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("salary", sa.Numeric(12, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("employees", "salary")
