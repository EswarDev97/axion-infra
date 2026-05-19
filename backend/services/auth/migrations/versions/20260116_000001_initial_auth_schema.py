"""Initial auth schema

Revision ID: 001
Revises:
Create Date: 2026-01-16

Per DATABASE_SCHEMA.md Section 3.1 (auth-module Tables):
- tenants
- users
- roles
- permissions
- role_permissions
- user_tenant_roles
- sessions

Per DATABASE_SCHEMA.md Section 7 (Row-Level Security Policies):
- RLS policies for tenant isolation
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable required extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"")

    # ==========================================================================
    # TENANTS TABLE
    # Per DATABASE_SCHEMA.md Section 3.1.1
    # ==========================================================================
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), server_default="ACTIVE", nullable=False),
        sa.Column("settings", postgresql.JSONB, server_default="{}", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_tenants_slug")
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])

    # ==========================================================================
    # USERS TABLE
    # Per DATABASE_SCHEMA.md Section 3.1.2
    # ==========================================================================
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_locked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_reason", sa.String(255), nullable=True),
        sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deletion_reason", sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email")
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # ==========================================================================
    # PERMISSIONS TABLE (system-wide, not tenant-scoped)
    # Per DATABASE_SCHEMA.md Section 3.1.4
    # ==========================================================================
    op.create_table(
        "permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("resource_scope", sa.String(50), server_default="OWN", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_permissions_code")
    )
    op.create_index("ix_permissions_module", "permissions", ["module"])

    # ==========================================================================
    # ROLES TABLE
    # Per DATABASE_SCHEMA.md Section 3.1.3
    # ==========================================================================
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system_role", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "code", name="uq_roles_tenant_code")
    )
    op.create_index("ix_roles_tenant_id", "roles", ["tenant_id"])

    # ==========================================================================
    # ROLE_PERMISSIONS TABLE
    # Per DATABASE_SCHEMA.md Section 3.1.5
    # ==========================================================================
    op.create_table(
        "role_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "role_id", "permission_id", name="uq_role_permissions_tenant_role_permission")
    )
    op.create_index("ix_role_permissions_tenant_id", "role_permissions", ["tenant_id"])
    op.create_index("ix_role_permissions_role_id", "role_permissions", ["role_id"])

    # ==========================================================================
    # USER_TENANT_ROLES TABLE
    # Per DATABASE_SCHEMA.md Section 3.1.6
    # ==========================================================================
    op.create_table(
        "user_tenant_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["revoked_by"], ["users.id"]),
        sa.UniqueConstraint("tenant_id", "user_id", "role_id", name="uq_user_tenant_roles_tenant_user_role")
    )
    op.create_index("ix_user_tenant_roles_tenant_id", "user_tenant_roles", ["tenant_id"])
    op.create_index("ix_user_tenant_roles_user_id", "user_tenant_roles", ["user_id"])

    # ==========================================================================
    # SESSIONS TABLE
    # Per DATABASE_SCHEMA.md Section 3.1.7
    # ==========================================================================
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refresh_token_jti", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_info", sa.String(500), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_reason", sa.String(100), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("refresh_token_jti", name="uq_sessions_refresh_token_jti")
    )
    op.create_index("ix_sessions_tenant_id", "sessions", ["tenant_id"])
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_refresh_token_jti", "sessions", ["refresh_token_jti"])

    # ==========================================================================
    # ROW-LEVEL SECURITY POLICIES
    # Per DATABASE_SCHEMA.md Section 7
    # ==========================================================================

    # Enable RLS on tenant-scoped tables
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE roles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE user_tenant_roles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE sessions ENABLE ROW LEVEL SECURITY")

    # Create RLS policies for users table
    op.execute("""
        CREATE POLICY users_tenant_isolation ON users
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    # Create RLS policies for roles table
    op.execute("""
        CREATE POLICY roles_tenant_isolation ON roles
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    # Create RLS policies for role_permissions table
    op.execute("""
        CREATE POLICY role_permissions_tenant_isolation ON role_permissions
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    # Create RLS policies for user_tenant_roles table
    op.execute("""
        CREATE POLICY user_tenant_roles_tenant_isolation ON user_tenant_roles
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)

    # Create RLS policies for sessions table
    op.execute("""
        CREATE POLICY sessions_tenant_isolation ON sessions
        FOR ALL
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::uuid, tenant_id))
    """)


def downgrade() -> None:
    # Drop RLS policies
    op.execute("DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions")
    op.execute("DROP POLICY IF EXISTS user_tenant_roles_tenant_isolation ON user_tenant_roles")
    op.execute("DROP POLICY IF EXISTS role_permissions_tenant_isolation ON role_permissions")
    op.execute("DROP POLICY IF EXISTS roles_tenant_isolation ON roles")
    op.execute("DROP POLICY IF EXISTS users_tenant_isolation ON users")

    # Disable RLS
    op.execute("ALTER TABLE sessions DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE user_tenant_roles DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE roles DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE users DISABLE ROW LEVEL SECURITY")

    # Drop tables in reverse order of creation
    op.drop_table("sessions")
    op.drop_table("user_tenant_roles")
    op.drop_table("role_permissions")
    op.drop_table("roles")
    op.drop_table("permissions")
    op.drop_table("users")
    op.drop_table("tenants")
