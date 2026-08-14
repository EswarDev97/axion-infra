#!/usr/bin/env python3
"""
Seed script to create initial super admin user for MindFlow.
Run this script after the database is initialized.

Usage:
    python scripts/seed_admin.py

Or via Docker:
    docker exec -it axionpcs-auth-service python /app/seed_admin.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://axionpcs:axionpcs_secret@localhost:5432/axionpcs_db"
)

# Super Admin credentials
ADMIN_EMAIL = "admin@axionpcs.com"
ADMIN_PASSWORD = "Admin@12345!"  # Change this in production!
TENANT_NAME = "AxionPCS"
TENANT_SLUG = "axionpcs"


async def seed_admin():
    """Create the initial tenant, super admin user, and roles."""

    # Parse database URL for asyncpg
    db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    db_url = db_url.replace("postgresql://", "")

    # Connect to database
    print(f"Connecting to database...")
    conn = await asyncpg.connect(f"postgresql://{db_url}")

    try:
        # Check if tenant already exists
        existing_tenant = await conn.fetchrow(
            "SELECT id FROM tenants WHERE slug = $1",
            TENANT_SLUG
        )

        if existing_tenant:
            tenant_id = existing_tenant['id']
            print(f"Tenant '{TENANT_SLUG}' already exists with ID: {tenant_id}")
        else:
            # Create tenant
            tenant_id = uuid4()
            now = datetime.now(timezone.utc)

            await conn.execute("""
                INSERT INTO tenants (id, name, slug, status, settings, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, tenant_id, TENANT_NAME, TENANT_SLUG, "ACTIVE", "{}", now, now)

            print(f"Created tenant '{TENANT_NAME}' with ID: {tenant_id}")

        # Check if admin user already exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1 AND tenant_id = $2",
            ADMIN_EMAIL, tenant_id
        )

        if existing_user:
            print(f"Admin user '{ADMIN_EMAIL}' already exists!")
            print(f"\nLogin credentials:")
            print(f"  Email: {ADMIN_EMAIL}")
            print(f"  Password: (use existing password or reset)")
            return

        # Create super admin user
        user_id = uuid4()
        password_hash = pwd_context.hash(ADMIN_PASSWORD)
        now = datetime.now(timezone.utc)

        await conn.execute("""
            INSERT INTO users (
                id, tenant_id, email, password_hash,
                is_active, is_locked, failed_login_attempts,
                created_at, updated_at, is_deleted
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """, user_id, tenant_id, ADMIN_EMAIL, password_hash,
            True, False, 0, now, now, False)

        print(f"Created super admin user with ID: {user_id}")

        # Check if SUPER_ADMIN role exists, create if not
        existing_role = await conn.fetchrow(
            "SELECT id FROM roles WHERE code = $1 AND tenant_id = $2",
            "SUPER_ADMIN", tenant_id
        )

        if existing_role:
            role_id = existing_role['id']
            print(f"Role 'SUPER_ADMIN' already exists with ID: {role_id}")
        else:
            # Create SUPER_ADMIN role
            role_id = uuid4()
            await conn.execute("""
                INSERT INTO roles (
                    id, tenant_id, code, name, description, is_system_role,
                    created_at, updated_at, created_by, updated_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, role_id, tenant_id, "SUPER_ADMIN", "Super Admin",
                "Full system access with all permissions", True, now, now, user_id, user_id)

            print(f"Created role 'SUPER_ADMIN' with ID: {role_id}")

        # Assign role to user
        await conn.execute("""
            INSERT INTO user_tenant_roles (id, user_id, tenant_id, role_id, assigned_at, assigned_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT DO NOTHING
        """, uuid4(), user_id, tenant_id, role_id, now, user_id, now, now)

        print(f"Assigned SUPER_ADMIN role to user")

        print("\n" + "="*50)
        print("SUCCESS! Admin user created.")
        print("="*50)
        print(f"\nLogin credentials:")
        print(f"  Email:    {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print(f"\nTenant: {TENANT_NAME} ({TENANT_SLUG})")
        print("\nIMPORTANT: Change the password after first login!")
        print("="*50)

    except Exception as e:
        print(f"Error: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_admin())
