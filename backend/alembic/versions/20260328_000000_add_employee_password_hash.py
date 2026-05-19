"""Add password_hash column to employees table

Revision ID: 20260328_000000
Revises: 20260125_000000
Create Date: 2026-03-28

Adds password_hash VARCHAR(255) to the employees table
to support setting initial passwords during employee creation.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "20260328_000000"
down_revision = "20260125_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("password_hash", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("employees", "password_hash")
