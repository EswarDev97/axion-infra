"""Initial HR schema

Revision ID: 002
Revises:
Create Date: 2026-01-16

Per DATABASE_SCHEMA.md Section 3.3 (HR Module Tables):
- departments
- positions
- employees
- leave_types
- leave_balances
- leave_requests
- attendance_records
- payroll_references
- candidates

Per DATABASE_SCHEMA.md Section 7 (Row-Level Security Policies):
- RLS policies for tenant isolation
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==========================================================================
    # DEPARTMENTS TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.1
    # ==========================================================================
    op.create_table(
        "departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "code", name="uq_departments_tenant_code")
    )
    op.create_index("ix_departments_tenant_id", "departments", ["tenant_id"])
    op.create_index("ix_departments_parent_id", "departments", ["parent_id"])

    # ==========================================================================
    # POSITIONS TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.2
    # ==========================================================================
    op.create_table(
        "positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "code", name="uq_positions_tenant_code")
    )
    op.create_index("ix_positions_tenant_id", "positions", ["tenant_id"])
    op.create_index("ix_positions_department_id", "positions", ["department_id"])

    # ==========================================================================
    # EMPLOYEES TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.3
    # ==========================================================================
    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("employee_code", sa.String(50), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("position_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("date_of_joining", sa.Date(), nullable=False),
        sa.Column("date_of_exit", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), server_default="ACTIVE", nullable=False),
        sa.Column("employment_type", sa.String(30), server_default="FULL_TIME", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deletion_reason", sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["position_id"], ["positions.id"]),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["manager_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "employee_code", name="uq_employees_tenant_code"),
        sa.UniqueConstraint("tenant_id", "email", name="uq_employees_tenant_email")
    )
    op.create_index("ix_employees_tenant_id", "employees", ["tenant_id"])
    op.create_index("ix_employees_user_id", "employees", ["user_id"])
    op.create_index("ix_employees_position_id", "employees", ["position_id"])
    op.create_index("ix_employees_department_id", "employees", ["department_id"])
    op.create_index("ix_employees_manager_id", "employees", ["manager_id"])

    # Now add the manager_id FK to departments (deferred due to circular reference)
    op.create_foreign_key(
        "fk_departments_manager_id",
        "departments",
        "employees",
        ["manager_id"],
        ["id"]
    )

    # ==========================================================================
    # LEAVE_TYPES TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.4
    # ==========================================================================
    op.create_table(
        "leave_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_paid", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("requires_approval", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "code", name="uq_leave_types_tenant_code")
    )
    op.create_index("ix_leave_types_tenant_id", "leave_types", ["tenant_id"])

    # ==========================================================================
    # LEAVE_BALANCES TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.5
    # ==========================================================================
    op.create_table(
        "leave_balances",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("leave_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("total_days", sa.Numeric(5, 2), server_default="0.00", nullable=False),
        sa.Column("used_days", sa.Numeric(5, 2), server_default="0.00", nullable=False),
        sa.Column("pending_days", sa.Numeric(5, 2), server_default="0.00", nullable=False),
        sa.Column("carried_over_days", sa.Numeric(5, 2), server_default="0.00", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["leave_type_id"], ["leave_types.id"]),
        sa.UniqueConstraint("tenant_id", "employee_id", "leave_type_id", "year", name="uq_leave_balances_employee_type_year")
    )
    op.create_index("ix_leave_balances_tenant_id", "leave_balances", ["tenant_id"])
    op.create_index("ix_leave_balances_employee_id", "leave_balances", ["employee_id"])
    op.create_index("ix_leave_balances_leave_type_id", "leave_balances", ["leave_type_id"])

    # ==========================================================================
    # LEAVE_REQUESTS TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.6
    # ==========================================================================
    op.create_table(
        "leave_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("leave_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("days_requested", sa.Numeric(5, 2), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="PENDING", nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["leave_type_id"], ["leave_types.id"]),
        sa.ForeignKeyConstraint(["approved_by"], ["employees.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
    )
    op.create_index("ix_leave_requests_tenant_id", "leave_requests", ["tenant_id"])
    op.create_index("ix_leave_requests_employee_id", "leave_requests", ["employee_id"])
    op.create_index("ix_leave_requests_leave_type_id", "leave_requests", ["leave_type_id"])

    # ==========================================================================
    # ATTENDANCE_RECORDS TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.7
    # ==========================================================================
    op.create_table(
        "attendance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("check_in", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out", sa.DateTime(timezone=True), nullable=True),
        sa.Column("work_hours", sa.Numeric(4, 2), nullable=True),
        sa.Column("status", sa.String(20), server_default="PRESENT", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.UniqueConstraint("tenant_id", "employee_id", "date", name="uq_attendance_employee_date")
    )
    op.create_index("ix_attendance_records_tenant_id", "attendance_records", ["tenant_id"])
    op.create_index("ix_attendance_records_employee_id", "attendance_records", ["employee_id"])
    op.create_index("ix_attendance_records_date", "attendance_records", ["date"])

    # ==========================================================================
    # PAYROLL_REFERENCES TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.8
    # ==========================================================================
    op.create_table(
        "payroll_references",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("base_salary", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="USD", nullable=False),
        sa.Column("pay_frequency", sa.String(20), server_default="MONTHLY", nullable=False),
        sa.Column("bank_name", sa.String(100), nullable=True),
        sa.Column("bank_account", sa.String(50), nullable=True),
        sa.Column("tax_id", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
    )
    op.create_index("ix_payroll_references_tenant_id", "payroll_references", ["tenant_id"])
    op.create_index("ix_payroll_references_employee_id", "payroll_references", ["employee_id"])

    # ==========================================================================
    # CANDIDATES TABLE
    # Per DATABASE_SCHEMA.md Section 3.3.9
    # ==========================================================================
    op.create_table(
        "candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("position_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resume_file_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(30), server_default="APPLIED", nullable=False),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deletion_reason", sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["position_id"], ["positions.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "email", "position_id", name="uq_candidates_tenant_email_position")
    )
    op.create_index("ix_candidates_tenant_id", "candidates", ["tenant_id"])
    op.create_index("ix_candidates_position_id", "candidates", ["position_id"])

    # ==========================================================================
    # ROW-LEVEL SECURITY POLICIES
    # Per DATABASE_SCHEMA.md Section 7
    # ==========================================================================

    # Enable RLS on all HR tables
    op.execute("ALTER TABLE departments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE positions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE employees ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE payroll_references ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE candidates ENABLE ROW LEVEL SECURITY")

    # Create RLS policies
    op.execute("""
        CREATE POLICY departments_tenant_isolation ON departments
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY positions_tenant_isolation ON positions
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY employees_tenant_isolation ON employees
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY leave_types_tenant_isolation ON leave_types
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY leave_balances_tenant_isolation ON leave_balances
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY leave_requests_tenant_isolation ON leave_requests
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY attendance_records_tenant_isolation ON attendance_records
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY payroll_references_tenant_isolation ON payroll_references
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    op.execute("""
        CREATE POLICY candidates_tenant_isolation ON candidates
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)


def downgrade() -> None:
    # Drop RLS policies
    op.execute("DROP POLICY IF EXISTS candidates_tenant_isolation ON candidates")
    op.execute("DROP POLICY IF EXISTS payroll_references_tenant_isolation ON payroll_references")
    op.execute("DROP POLICY IF EXISTS attendance_records_tenant_isolation ON attendance_records")
    op.execute("DROP POLICY IF EXISTS leave_requests_tenant_isolation ON leave_requests")
    op.execute("DROP POLICY IF EXISTS leave_balances_tenant_isolation ON leave_balances")
    op.execute("DROP POLICY IF EXISTS leave_types_tenant_isolation ON leave_types")
    op.execute("DROP POLICY IF EXISTS employees_tenant_isolation ON employees")
    op.execute("DROP POLICY IF EXISTS positions_tenant_isolation ON positions")
    op.execute("DROP POLICY IF EXISTS departments_tenant_isolation ON departments")

    # Disable RLS
    op.execute("ALTER TABLE candidates DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE payroll_references DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE leave_balances DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE leave_types DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE employees DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE positions DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE departments DISABLE ROW LEVEL SECURITY")

    # Drop FK from departments.manager_id
    op.drop_constraint("fk_departments_manager_id", "departments", type_="foreignkey")

    # Drop tables in reverse order of creation
    op.drop_table("candidates")
    op.drop_table("payroll_references")
    op.drop_table("attendance_records")
    op.drop_table("leave_requests")
    op.drop_table("leave_balances")
    op.drop_table("leave_types")
    op.drop_table("employees")
    op.drop_table("positions")
    op.drop_table("departments")
