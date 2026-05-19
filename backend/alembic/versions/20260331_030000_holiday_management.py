"""Holiday management - holidays table and weekly_off_config table

Revision ID: 20260331_030000
Revises: 20260331_020000
Create Date: 2026-03-31

Adds:
- holidays table for company/public holidays per tenant
- weekly_off_config table for configurable weekly off days
- Default weekly offs (Saturday + Sunday) seeded via application code
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "20260331_030000"
down_revision = "20260331_020000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- holidays table ---
    op.create_table(
        "holidays",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("holiday_name", sa.String(150), nullable=False),
        sa.Column("holiday_date", sa.Date(), nullable=False),
        sa.Column("holiday_type", sa.String(20), nullable=False, server_default="PUBLIC"),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "holiday_date", name="uq_holiday_tenant_date"),
    )
    op.create_index("ix_holidays_tenant_id", "holidays", ["tenant_id"])
    op.create_index("ix_holidays_holiday_date", "holidays", ["holiday_date"])

    # --- weekly_off_config table ---
    op.create_table(
        "weekly_off_config",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "day_of_week", name="uq_weekly_off_tenant_day"),
    )
    op.create_index("ix_weekly_off_config_tenant_id", "weekly_off_config", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("weekly_off_config")
    op.drop_table("holidays")
