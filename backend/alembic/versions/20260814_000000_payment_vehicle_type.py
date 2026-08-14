"""Payment management module - add vehicle_type column

Revision ID: 20260814_000000
Revises: 20260731_010000
Create Date: 2026-08-14

Adds vehicle_type (TWO_WHEELER, FOUR_WHEELER, COMMERCIAL) to payments.
Existing rows are backfilled with FOUR_WHEELER before the column is made
NOT NULL, since it's a required field going forward but had no prior value
(same backfill pattern as case_type in 20260731_010000).
"""

from alembic import op
import sqlalchemy as sa


revision = "20260814_000000"
down_revision = "20260731_010000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "payments",
        sa.Column("vehicle_type", sa.String(20), nullable=True),
    )
    op.execute("UPDATE payments SET vehicle_type = 'FOUR_WHEELER' WHERE vehicle_type IS NULL")
    op.alter_column("payments", "vehicle_type", nullable=False)


def downgrade() -> None:
    op.drop_column("payments", "vehicle_type")
