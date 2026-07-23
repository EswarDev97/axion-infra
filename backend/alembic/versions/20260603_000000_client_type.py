"""Add type column to clients (Client / Financer)

Revision ID: 20260603_000000
Revises: 20260602_000000
Create Date: 2026-06-03
"""

from alembic import op
import sqlalchemy as sa

revision = "20260603_000000"
down_revision = "20260602_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("type", sa.String(20), nullable=False, server_default="CLIENT"))


def downgrade() -> None:
    op.drop_column("clients", "type")
