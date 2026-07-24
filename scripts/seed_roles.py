#!/usr/bin/env python3
"""
Seed script to create the default staff roles (HR_ADMIN, MANAGER, EMPLOYEE)
and their permissions, per docs/AUTH_RBAC.md "Default Role Permissions".

Idempotent - safe to re-run; skips roles/permissions that already exist.

Usage:
    python scripts/seed_roles.py

Or via Docker:
    docker exec -it axionpcs-auth-service python /app/seed_roles.py
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
PERMISSIONS = {
    "employees:*": ("Manage Employees", "employees", "*", "ALL"),
    "employees:read": ("Read Employees (frontend nav gate)", "employees", "read", "ALL"),
    "employees:read:team": ("Read Team Employees", "employees", "read", "TEAM"),
    "employees:update:team": ("Update Team Employees", "employees", "update", "TEAM"),
    "employees:read:self": ("Read Own Employee Record", "employees", "read", "OWN"),
    "employees:update:self": ("Update Own Employee Record", "employees", "update", "OWN"),

    # NOTE: backend/services/hr/api/*.py (employees, positions, departments,
    # attendance, leave, payroll, holidays, candidates, crm_leads) actually
    # enforce this separate hr:* namespace via require_permission(), not the
    # employees:*/departments:*/etc. codes above — those older codes are
    # never checked by any HR endpoint. Both namespaces are kept here since
    # removing the unused one is a larger, separate cleanup.
    "hr:read:all": ("Read All HR Records", "hr", "read", "ALL"),
    "hr:read:subordinates": ("Read Subordinate HR Records", "hr", "read", "SUBORDINATES"),
    "hr:create:all": ("Create HR Records", "hr", "create", "ALL"),
    "hr:update:all": ("Update HR Records", "hr", "update", "ALL"),
    "hr:delete:all": ("Delete HR Records", "hr", "delete", "ALL"),
    "hr:write:all": ("Write HR Records", "hr", "write", "ALL"),
    "hr:approve:all": ("Approve All HR Requests", "hr", "approve", "ALL"),
    "hr:approve:subordinates": ("Approve Subordinate HR Requests", "hr", "approve", "SUBORDINATES"),

    "departments:*": ("Manage Departments", "departments", "*", "ALL"),

    "attendance:*": ("Manage Attendance", "attendance", "*", "ALL"),
    "attendance:read:team": ("Read Team Attendance", "attendance", "read", "TEAM"),
    "attendance:update:team": ("Update Team Attendance", "attendance", "update", "TEAM"),
    "attendance:read:self": ("Read Own Attendance", "attendance", "read", "OWN"),
    "attendance:create:self": ("Check-in/out Own Attendance", "attendance", "create", "OWN"),

    "leave:*": ("Manage Leave", "leave", "*", "ALL"),
    "leave:read:team": ("Read Team Leave", "leave", "read", "TEAM"),
    "leave:approve:team": ("Approve Team Leave", "leave", "approve", "TEAM"),
    "leave:read:self": ("Read Own Leave", "leave", "read", "OWN"),
    "leave:create:self": ("Create Own Leave Request", "leave", "create", "OWN"),
    "leave:cancel:self": ("Cancel Own Leave Request", "leave", "cancel", "OWN"),

    "payroll:*": ("Manage Payroll", "payroll", "*", "ALL"),
    "payroll:read:self": ("Read Own Payroll", "payroll", "read", "OWN"),

    "documents:*": ("Manage Documents", "documents", "*", "ALL"),
    "documents:read:team": ("Read Team Documents", "documents", "read", "TEAM"),
    "documents:read:self": ("Read Own Documents", "documents", "read", "OWN"),
    "documents:upload:self": ("Upload Own Documents", "documents", "upload", "OWN"),

    "roles:read": ("Read Roles", "roles", "read", "ALL"),
    "roles:assign": ("Assign Roles", "roles", "assign", "ALL"),

    "settings:read": ("Read Settings", "settings", "read", "ALL"),
    "settings:update": ("Update Settings", "settings", "update", "ALL"),

    "analytics:*": ("Manage Analytics", "analytics", "*", "ALL"),
    "analytics:read:team": ("Read Team Analytics", "analytics", "read", "TEAM"),

    "careers:*": ("Manage Careers", "careers", "*", "ALL"),

    # Also defined in seed_payment_permissions.py — duplicated here (both
    # scripts use ON CONFLICT DO NOTHING) so EMPLOYEE can reference them
    # below without requiring that script to have run first.
    "payments:create": ("Create Payments", "payments", "create", "ALL"),
    "payments:read": ("Read Payments", "payments", "read", "ALL"),
    "payments:update": ("Update Payments", "payments", "update", "ALL"),
    "payments:delete": ("Delete Payments", "payments", "delete", "ALL"),
}

# Role code -> (name, description, [permission codes])
ROLES = {
    "HR_ADMIN": (
        "HR Admin",
        "Manages employees, departments, attendance, leave, payroll, documents and settings",
        [
            "employees:*", "departments:*", "attendance:*", "leave:*",
            "payroll:*", "documents:*", "roles:read", "roles:assign",
            "settings:read", "settings:update", "analytics:*", "careers:*",
        ],
    ),
    "MANAGER": (
        "Manager",
        "Manages their team's employees, attendance and leave approvals, "
        "plus full HR record management and payment processing (payroll-instance scope)",
        [
            "employees:read", "employees:read:team", "employees:update:team",
            "attendance:read:team", "attendance:update:team",
            "leave:read:team", "leave:approve:team",
            "documents:read:team", "analytics:read:team",
            "hr:read:all", "hr:read:subordinates", "hr:create:all",
            "hr:update:all", "hr:delete:all", "hr:write:all",
            "hr:approve:all", "hr:approve:subordinates",
            "payments:create", "payments:read", "payments:update", "payments:delete",
        ],
    ),
    "EMPLOYEE": (
        "Employee",
        "Self-service access to own records, attendance, leave, documents and payroll, "
        "plus full HR record management (payroll-instance scope: manage employees)",
        [
            "employees:read", "employees:read:self", "employees:update:self",
            "attendance:read:self", "attendance:create:self",
            "leave:read:self", "leave:create:self", "leave:cancel:self",
            "documents:read:self", "documents:upload:self",
            "payroll:read:self",
            "hr:read:all", "hr:read:subordinates", "hr:create:all",
            "hr:update:all", "hr:delete:all", "hr:write:all",
            "hr:approve:all", "hr:approve:subordinates",
            "payments:create", "payments:read", "payments:update", "payments:delete",
        ],
    ),
}


async def seed_roles():
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
                continue
            perm_id = uuid4()
            await conn.execute("""
                INSERT INTO permissions (id, code, name, module, action, resource_scope, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, perm_id, code, name, module, action, scope, now, now)
            permission_ids[code] = perm_id
            print(f"Created permission '{code}'")

        # Seed roles + role_permissions
        for role_code, (role_name, description, perm_codes) in ROLES.items():
            existing_role = await conn.fetchrow(
                "SELECT id FROM roles WHERE code = $1 AND tenant_id = $2",
                role_code, tenant_id
            )
            if existing_role:
                role_id = existing_role["id"]
                print(f"Role '{role_code}' already exists with ID: {role_id}")
            else:
                role_id = uuid4()
                await conn.execute("""
                    INSERT INTO roles (
                        id, tenant_id, code, name, description, is_system_role,
                        created_at, updated_at, created_by, updated_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, role_id, tenant_id, role_code, role_name, description, True,
                    now, now, admin_id, admin_id)
                print(f"Created role '{role_code}' with ID: {role_id}")

            for perm_code in perm_codes:
                perm_id = permission_ids[perm_code]
                await conn.execute("""
                    INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, created_at, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT DO NOTHING
                """, uuid4(), tenant_id, role_id, perm_id, now, admin_id)

            print(f"  Assigned {len(perm_codes)} permissions to '{role_code}'")

        print("\n" + "=" * 50)
        print("SUCCESS! Roles seeded: HR_ADMIN, MANAGER, EMPLOYEE")
        print("=" * 50)

    except Exception as e:
        print(f"Error: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_roles())
