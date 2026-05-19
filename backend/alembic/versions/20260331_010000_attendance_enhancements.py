"""Attendance enhancements - config table and audit columns

Revision ID: 20260331_010000
Revises: 20260331_000000
Create Date: 2026-03-31

Adds:
- attendance_config table for per-tenant office hours / thresholds
- created_by and updated_by audit columns to attendance_records
- audit_logs table if it doesn't exist (for attendance action logging)
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "20260331_010000"
down_revision = "20260331_000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create attendance_config table
    op.create_table(
        "attendance_config",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id"), nullable=False, unique=True),
        sa.Column("office_start_time", sa.Time(), nullable=False,
                  server_default=sa.text("'09:00:00'::time")),
        sa.Column("office_end_time", sa.Time(), nullable=False,
                  server_default=sa.text("'18:00:00'::time")),
        sa.Column("grace_period_minutes", sa.Integer(), nullable=False,
                  server_default=sa.text("15")),
        sa.Column("min_work_hours", sa.Numeric(4, 2), nullable=False,
                  server_default=sa.text("8.00")),
        sa.Column("half_day_hours", sa.Numeric(4, 2), nullable=False,
                  server_default=sa.text("4.00")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index("ix_attendance_config_tenant_id", "attendance_config", ["tenant_id"])

    # 2. Add audit columns to attendance_records
    op.add_column("attendance_records",
                   sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("attendance_records",
                   sa.Column("updated_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))

    # 3. Create audit_logs table if it doesn't exist
    # This table may already exist from the Prisma schema; use IF NOT EXISTS via raw SQL
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(255) NOT NULL,
            entity VARCHAR(255) NOT NULL,
            entity_id VARCHAR(255),
            old_data JSONB,
            new_data JSONB,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_entity_id
        ON audit_logs (entity, entity_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_audit_logs_user_created
        ON audit_logs (user_id, created_at)
    """)


def downgrade() -> None:
    op.drop_column("attendance_records", "updated_by")
    op.drop_column("attendance_records", "created_by")
    op.drop_index("ix_attendance_config_tenant_id", table_name="attendance_config")
    op.drop_table("attendance_config")
    # Not dropping audit_logs since it may be used by other modules
