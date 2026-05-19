"""
MindFlow Complaint Service - Permission Seeder
Seeds complaint-specific permissions and role-permission mappings.
Per COMPLAINT_ENHANCEMENT_TDD.md Section 3 & 9.10.

Usage:
    python -m services.complaint.migrations.seed_permissions --tenant-id <UUID>
"""

import argparse
import asyncio
import sys
from uuid import UUID

import structlog
from sqlalchemy import text

from shared.config import get_settings
from shared.database import db_manager

logger = structlog.get_logger()

# Permission definitions per TDD Section 9.10
COMPLAINT_PERMISSIONS = [
    {"slug": "complaints.create", "module": "complaints", "action": "create", "description": "Create new complaints"},
    {"slug": "complaints.view.all", "module": "complaints", "action": "view_all", "description": "View all complaints"},
    {"slug": "complaints.view.department", "module": "complaints", "action": "view_department", "description": "View department complaints"},
    {"slug": "complaints.view.team", "module": "complaints", "action": "view_team", "description": "View team complaints"},
    {"slug": "complaints.view.own", "module": "complaints", "action": "view_own", "description": "View own assigned complaints"},
    {"slug": "complaints.assign.all", "module": "complaints", "action": "assign_all", "description": "Assign to any user"},
    {"slug": "complaints.assign.non-admin", "module": "complaints", "action": "assign_non_admin", "description": "Assign to non-admin users"},
    {"slug": "complaints.assign.team", "module": "complaints", "action": "assign_team", "description": "Assign to direct reports"},
    {"slug": "complaints.assign.department", "module": "complaints", "action": "assign_department", "description": "Assign to department members"},
    {"slug": "complaints.escalate", "module": "complaints", "action": "escalate", "description": "Escalate complaints"},
    {"slug": "complaints.close", "module": "complaints", "action": "close", "description": "Close complaints"},
    {"slug": "complaints.delete", "module": "complaints", "action": "delete", "description": "Delete complaints"},
    {"slug": "complaints.export", "module": "complaints", "action": "export", "description": "Export complaint reports"},
    {"slug": "complaints.reassign", "module": "complaints", "action": "reassign", "description": "Reassign complaints"},
]

# Role-Permission mappings per TDD Section 3.5
# key: role slug, value: list of permission slugs
ROLE_PERMISSION_MAP = {
    "super-admin": [
        "complaints.create", "complaints.view.all", "complaints.view.department",
        "complaints.view.team", "complaints.view.own", "complaints.assign.all",
        "complaints.escalate", "complaints.close", "complaints.delete",
        "complaints.export", "complaints.reassign",
    ],
    "hr-admin": [
        "complaints.create", "complaints.view.all", "complaints.view.department",
        "complaints.view.team", "complaints.view.own", "complaints.assign.non-admin",
        "complaints.escalate", "complaints.close", "complaints.export",
        "complaints.reassign",
    ],
    "manager": [
        "complaints.create", "complaints.view.team", "complaints.view.own",
        "complaints.assign.team", "complaints.escalate", "complaints.export",
    ],
    "department-head": [
        "complaints.create", "complaints.view.department", "complaints.view.own",
        "complaints.assign.department", "complaints.escalate", "complaints.export",
    ],
    "employee": [
        "complaints.view.own",
    ],
}


async def seed_permissions(tenant_id: UUID):
    """Seed complaint permissions and role-permission mappings."""
    await db_manager.init_db()

    async with db_manager.session() as session:
        created_perms = 0
        created_mappings = 0

        # 1. Insert permissions (global, not tenant-scoped)
        for perm in COMPLAINT_PERMISSIONS:
            # Check if already exists
            result = await session.execute(
                text("SELECT id FROM permissions WHERE slug = :slug"),
                {"slug": perm["slug"]}
            )
            existing = result.fetchone()

            if not existing:
                await session.execute(
                    text("""
                        INSERT INTO permissions (id, name, slug, module, action, description)
                        VALUES (gen_random_uuid(), :name, :slug, :module, :action, :description)
                    """),
                    {
                        "name": perm["description"],
                        "slug": perm["slug"],
                        "module": perm["module"],
                        "action": perm["action"],
                        "description": perm["description"],
                    }
                )
                created_perms += 1
                logger.info(f"Created permission: {perm['slug']}")

        # 2. Map permissions to roles for the given tenant
        for role_slug, perm_slugs in ROLE_PERMISSION_MAP.items():
            # Get role ID for this tenant
            result = await session.execute(
                text("""
                    SELECT id FROM roles
                    WHERE slug = :slug AND (tenant_id = :tid OR tenant_id IS NULL)
                    LIMIT 1
                """),
                {"slug": role_slug, "tid": tenant_id}
            )
            role_row = result.fetchone()
            if not role_row:
                logger.warning(f"Role '{role_slug}' not found for tenant {tenant_id}")
                continue
            role_id = role_row[0]

            for perm_slug in perm_slugs:
                # Get permission ID
                result = await session.execute(
                    text("SELECT id FROM permissions WHERE slug = :slug"),
                    {"slug": perm_slug}
                )
                perm_row = result.fetchone()
                if not perm_row:
                    continue
                perm_id = perm_row[0]

                # Check if mapping exists
                result = await session.execute(
                    text("""
                        SELECT id FROM role_permissions
                        WHERE role_id = :rid AND permission_id = :pid
                    """),
                    {"rid": role_id, "pid": perm_id}
                )
                if not result.fetchone():
                    await session.execute(
                        text("""
                            INSERT INTO role_permissions (id, role_id, permission_id)
                            VALUES (gen_random_uuid(), :rid, :pid)
                        """),
                        {"rid": role_id, "pid": perm_id}
                    )
                    created_mappings += 1

        await session.commit()
        logger.info(
            f"Seed complete: {created_perms} permissions created, {created_mappings} role-permission mappings created"
        )

    await db_manager.close_db()


def main():
    parser = argparse.ArgumentParser(description="Seed complaint permissions")
    parser.add_argument("--tenant-id", required=True, help="Tenant UUID")
    args = parser.parse_args()

    try:
        tenant_id = UUID(args.tenant_id)
    except ValueError:
        print(f"Error: Invalid UUID: {args.tenant_id}")
        sys.exit(1)

    asyncio.run(seed_permissions(tenant_id))


if __name__ == "__main__":
    main()
