"""Complaint Management Enhancement - Add new columns per TDD

Adds new columns to complaints, escalation_rules, and complaint_actions tables.
Per COMPLAINT_ENHANCEMENT_TDD.md Section 10.

Revision ID: 20260330_000000
Revises: 20260328_000000
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "20260330_000000"
down_revision = "20260328_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =========================================================================
    # complaints table — 7 new columns
    # =========================================================================
    op.add_column(
        "complaints",
        sa.Column("complainant_type", sa.String(30), nullable=True, server_default="INTERNAL"),
    )
    op.add_column(
        "complaints",
        sa.Column("insurer_client", sa.String(255), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("vehicle_number", sa.String(50), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("workshop_name", sa.String(255), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("corrective_action", sa.Text(), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("expected_closure_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("closure_tat_hours", sa.Numeric(10, 2), nullable=True),
    )

    # Indexes for complaints table (reporting performance)
    op.create_index(
        "idx_complaints_tenant_status",
        "complaints",
        ["tenant_id", "status"],
    )
    op.create_index(
        "idx_complaints_tenant_created",
        "complaints",
        ["tenant_id", "created_at"],
    )
    op.create_index(
        "idx_complaints_tenant_severity",
        "complaints",
        ["tenant_id", "severity"],
    )
    op.create_index(
        "idx_complaints_closed_at",
        "complaints",
        ["tenant_id", "closed_at"],
        postgresql_where=sa.text("closed_at IS NOT NULL"),
    )

    # Check constraint for complainant_type
    op.create_check_constraint(
        "chk_complainant_type",
        "complaints",
        "complainant_type IN ('INTERNAL', 'EXTERNAL', 'INSURER', 'CLIENT', 'VENDOR')",
    )

    # =========================================================================
    # escalation_rules table — 2 new columns
    # =========================================================================
    op.add_column(
        "escalation_rules",
        sa.Column("notify_department_head", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "escalation_rules",
        sa.Column("notify_hr_admin", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_index(
        "idx_escalation_rules_level",
        "escalation_rules",
        ["tenant_id", "escalation_level"],
    )

    # =========================================================================
    # complaint_actions table — 3 new columns
    # =========================================================================
    op.add_column(
        "complaint_actions",
        sa.Column("field_changed", sa.String(100), nullable=True),
    )
    op.add_column(
        "complaint_actions",
        sa.Column("old_value", sa.Text(), nullable=True),
    )
    op.add_column(
        "complaint_actions",
        sa.Column("new_value", sa.Text(), nullable=True),
    )

    op.create_index(
        "idx_complaint_actions_type",
        "complaint_actions",
        ["tenant_id", "complaint_id", "action_type"],
    )
    op.create_index(
        "idx_complaint_actions_performed",
        "complaint_actions",
        ["tenant_id", "performed_at"],
    )


def downgrade() -> None:
    # complaint_actions indexes
    op.drop_index("idx_complaint_actions_performed", table_name="complaint_actions")
    op.drop_index("idx_complaint_actions_type", table_name="complaint_actions")

    # complaint_actions columns
    op.drop_column("complaint_actions", "new_value")
    op.drop_column("complaint_actions", "old_value")
    op.drop_column("complaint_actions", "field_changed")

    # escalation_rules index
    op.drop_index("idx_escalation_rules_level", table_name="escalation_rules")

    # escalation_rules columns
    op.drop_column("escalation_rules", "notify_hr_admin")
    op.drop_column("escalation_rules", "notify_department_head")

    # complaints constraint
    op.drop_constraint("chk_complainant_type", "complaints", type_="check")

    # complaints indexes
    op.drop_index("idx_complaints_closed_at", table_name="complaints")
    op.drop_index("idx_complaints_tenant_severity", table_name="complaints")
    op.drop_index("idx_complaints_tenant_created", table_name="complaints")
    op.drop_index("idx_complaints_tenant_status", table_name="complaints")

    # complaints columns
    op.drop_column("complaints", "closure_tat_hours")
    op.drop_column("complaints", "expected_closure_date")
    op.drop_column("complaints", "corrective_action")
    op.drop_column("complaints", "workshop_name")
    op.drop_column("complaints", "vehicle_number")
    op.drop_column("complaints", "insurer_client")
    op.drop_column("complaints", "complainant_type")
