"""Payment management module - unique vehicle registration/UTR per tenant

Revision ID: 20260731_000000
Revises: 20260723_000000
Create Date: 2026-07-31

Adds partial unique indexes so vehicle_registration_number and utr_number
cannot be duplicated within the same tenant among active (non-soft-deleted)
payments. Partial (WHERE is_deleted = false) so a soft-deleted payment's
values become reusable, and utr_number's NULL rows (optional field) are
never compared against each other by a unique index in Postgres regardless.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260731_000000"
down_revision = "20260723_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_payments_tenant_vehicle_reg_active",
        "payments",
        ["tenant_id", "vehicle_registration_number"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "uq_payments_tenant_utr_active",
        "payments",
        ["tenant_id", "utr_number"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false AND utr_number IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_payments_tenant_utr_active", table_name="payments")
    op.drop_index("uq_payments_tenant_vehicle_reg_active", table_name="payments")
