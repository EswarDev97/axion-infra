#!/usr/bin/env python3
"""
Seed script to create the payments module RBAC permissions
(payments:create, payments:read, payments:update, payments:delete)
and assign them to the HR_ADMIN and MANAGER roles.

Required by the payments API (T7b) so that require_permission("payments:*")
resolves against real permission rows.

Idempotent - safe to re-run; skips permissions/assignments that already exist.

Usage:
    python scripts/seed_payment_permissions.py

Or via Docker:
    docker exec -it axionpcs-auth-service python /app/seed_payment_permissions.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://axionpcs:axionpcs_secret@localhost:5432/axionpcs_db"
)

TENANT_SLUG = "axionpcs"
ADMIN_EMAIL = "admin@axionpcs.com"

# Permission catalog: code -> (name, module, action, resource_scope)
# Tenant-wide payments permissions (scope ALL, no self/team scope suffix).
PERMISSIONS = {
    "payments:create": ("Create Payments", "payments", "create", "ALL"),
    "payments:read": ("Read Payments", "payments", "read", "ALL"),
    "payments:update": ("Update Payments", "payments", "update", "ALL"),
    "payments:delete": ("Delete Payments", "payments", "delete", "ALL"),
}

# Role code -> [permission codes]
ROLE_ASSIGNMENTS = {
    "HR_ADMIN": [
        "payments:create", "payments:read", "payments:update", "payments:delete",
    ],
    "MANAGER": [
        "payments:create", "payments:read", "payments:update", "payments:delete",
    ],
}


async def seed_payment_permissions():
    db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    db_url = db_url.replace("postgresql://", "")

    print("Connecting to database...")
    conn = await asyncpg.connect(f"postgresql://{db_url}")

    try:
        tenant = await conn.fetchrow("SELECT id FROM tenants WHERE slug = $1", TENANT_SLUG)
        if not tenant:
            print(f"Tenant '{TENANT_SLUG}' not found. Run scripts/seed_admin.py first.")
            return
        tenant_id = tenant["id"]

        admin_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1 AND tenant_id = $2",
            ADMIN_EMAIL, tenant_id
        )
        if not admin_user:
            print(f"Admin user '{ADMIN_EMAIL}' not found. Run scripts/seed_admin.py first.")
            return
        admin_id = admin_user["id"]

        now = datetime.now(timezone.utc)

        # Seed permission catalog (system-wide, not tenant-scoped)
        permission_ids = {}
        for code, (name, module, action, scope) in PERMISSIONS.items():
            existing = await conn.fetchrow("SELECT id FROM permissions WHERE code = $1", code)
            if existing:
                permission_ids[code] = existing["id"]
                print(f"Permission '{code}' already exists with ID: {existing['id']}")
                continue
            perm_id = uuid4()
            await conn.execute("""
                INSERT INTO permissions (id, code, name, module, action, resource_scope, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, perm_id, code, name, module, action, scope, now, now)
            permission_ids[code] = perm_id
            print(f"Created permission '{code}'")

        # Assign permissions to existing roles (HR_ADMIN, MANAGER)
        for role_code, perm_codes in ROLE_ASSIGNMENTS.items():
            existing_role = await conn.fetchrow(
                "SELECT id FROM roles WHERE code = $1 AND tenant_id = $2",
                role_code, tenant_id
            )
            if not existing_role:
                print(f"Role '{role_code}' not found for tenant '{TENANT_SLUG}'. "
                      f"Run scripts/seed_roles.py first. Skipping.")
                continue
            role_id = existing_role["id"]

            for perm_code in perm_codes:
                perm_id = permission_ids[perm_code]
                await conn.execute("""
                    INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, created_at, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT DO NOTHING
                """, uuid4(), tenant_id, role_id, perm_id, now, admin_id)

            print(f"  Assigned {len(perm_codes)} payments permissions to '{role_code}'")

        print("\n" + "=" * 50)
        print("SUCCESS! Payments permissions seeded and assigned to HR_ADMIN, MANAGER")
        print("=" * 50)

    except Exception as e:
        print(f"Error: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_payment_permissions())
