"""Payment management module - allow duplicate vehicle registration numbers

Revision ID: 20260814_010000
Revises: 20260814_000000
Create Date: 2026-08-14

Drops the unique index on vehicle_registration_number added in
20260731_000000 — duplicate vehicle numbers are now allowed (a warning is
shown in the UI instead of blocking creation). The UTR number unique index
from that same migration is untouched: UTR must remain unique per tenant.
"""

from alembic import op


revision = "20260814_010000"
down_revision = "20260814_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_payments_tenant_vehicle_reg_active", table_name="payments")


def downgrade() -> None:
    import sqlalchemy as sa

    op.create_index(
        "uq_payments_tenant_vehicle_reg_active",
        "payments",
        ["tenant_id", "vehicle_registration_number"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )
