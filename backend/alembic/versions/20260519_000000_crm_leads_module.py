"""CRM Leads module — crm_leads + crm_lead_contacts tables

Revision ID: 20260519_000000
Revises: 20260331_040000
Create Date: 2026-05-19

Adds micro-CRM tables for tracking Operating Office outreach and leads.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260519_000000"
down_revision: Union[str, None] = "20260331_040000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Discussion summary enum ───────────────────────────────────────────────
    op.execute("""
        CREATE TYPE "DiscussionSummary" AS ENUM (
            'INTRODUCE_AXION',
            'ESTABLISH_CREDIBILITY',
            'RO_APPROVAL_CIRCULATED',
            'EXPLAIN_EASY_PROCESS',
            'UNDERSTAND_PAIN_POINTS',
            'OFFER_TRAINING_DEMO',
            'OBTAIN_FIRST_CASE'
        )
    """)

    # ── Interest level enum ───────────────────────────────────────────────────
    op.execute("""
        CREATE TYPE "InterestLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW')
    """)

    # ── crm_leads ─────────────────────────────────────────────────────────────
    op.create_table(
        "crm_leads",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operating_office_name", sa.String(150), nullable=False),
        sa.Column("location", sa.String(200), nullable=False),
        sa.Column("date_contacted", sa.Date(), nullable=False),
        sa.Column(
            "discussion_summary",
            sa.Enum(
                "INTRODUCE_AXION",
                "ESTABLISH_CREDIBILITY",
                "RO_APPROVAL_CIRCULATED",
                "EXPLAIN_EASY_PROCESS",
                "UNDERSTAND_PAIN_POINTS",
                "OFFER_TRAINING_DEMO",
                "OBTAIN_FIRST_CASE",
                name="DiscussionSummary",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "interest_level",
            sa.Enum("HIGH", "MEDIUM", "LOW", name="InterestLevel", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "demo_required",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "training_completed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("next_followup_date", sa.Date(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_crm_leads_tenant_id", "crm_leads", ["tenant_id"])
    op.create_index(
        "ix_crm_leads_next_followup_date", "crm_leads", ["next_followup_date"]
    )
    op.create_index("ix_crm_leads_interest_level", "crm_leads", ["interest_level"])

    # ── crm_lead_contacts ─────────────────────────────────────────────────────
    op.create_table(
        "crm_lead_contacts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("designation", sa.String(100), nullable=False),
        sa.Column("mobile", sa.String(15), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["lead_id"], ["crm_leads.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_crm_lead_contacts_lead_id", "crm_lead_contacts", ["lead_id"])


def downgrade() -> None:
    op.drop_table("crm_lead_contacts")
    op.drop_table("crm_leads")
    op.execute('DROP TYPE IF EXISTS "InterestLevel"')
    op.execute('DROP TYPE IF EXISTS "DiscussionSummary"')
