"""Complaint workflow update - Add complaint_type, closure_tat_days, reason_for_complaint

Adds fields required for updated complaint workflow per PART 6.

Revision ID: 20260330_010000
Revises: 20260330_000000
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa

revision = "20260330_010000"
down_revision = "20260330_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "complaints",
        sa.Column("complaint_type", sa.String(255), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("closure_tat_days", sa.Integer(), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("reason_for_complaint", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("complaints", "reason_for_complaint")
    op.drop_column("complaints", "closure_tat_days")
    op.drop_column("complaints", "complaint_type")
