"""Payment management module - payments table

Revision ID: 20260723_000000
Revises: 20260603_000000
Create Date: 2026-07-23

Adds the payments table for tracking case-level payment records
(client/finance references, executive assignment, case status, and
conditional billing/payment-mode details).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "20260723_000000"
down_revision = "20260603_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- payments table ---
    op.create_table(
        "payments",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("case_reference", sa.String(100), nullable=False),
        sa.Column("client_id", UUID(as_uuid=True), nullable=False),
        sa.Column("finance_id", UUID(as_uuid=True), nullable=True),
        sa.Column("vehicle_registration_number", sa.String(50), nullable=False),
        sa.Column("executive_employee_id", UUID(as_uuid=True), nullable=False),
        sa.Column("case_status", sa.String(30), nullable=False, server_default="ASSIGNED"),
        sa.Column("billing_status", sa.String(30), nullable=False),
        sa.Column("payment_mode", sa.String(20), nullable=True),
        sa.Column("utr_number", sa.String(50), nullable=True),
        sa.Column("transaction_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("created_by", UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by", UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["finance_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
    )
    op.create_index("idx_payments_tenant", "payments", ["tenant_id"])
    op.create_index("idx_payments_client", "payments", ["tenant_id", "client_id"])
    op.create_index("idx_payments_case_status", "payments", ["tenant_id", "case_status"])


def downgrade() -> None:
    op.drop_table("payments")
