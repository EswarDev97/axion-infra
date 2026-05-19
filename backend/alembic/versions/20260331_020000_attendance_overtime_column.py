"""Add overtime_hours column to attendance_records

Revision ID: 20260331_020000
Revises: 20260331_010000
Create Date: 2026-03-31

Adds:
- overtime_hours column to attendance_records table
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260331_020000"
down_revision = "20260331_010000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "attendance_records",
        sa.Column("overtime_hours", sa.Numeric(4, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("attendance_records", "overtime_hours")
