#!/usr/bin/env python3
"""
Seed script to create default positions for MindFlow.
Run this script after the database and tenant are initialized.

Usage:
    python scripts/seed_positions.py

Or via Docker:
    docker exec -it axionpcs-hr-service python /app/seed_positions.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg

# Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://axionpcs:axionpcs_secret@localhost:5432/axionpcs_db"
)

TENANT_SLUG = "axionpcs"

# Positions to seed: (code, title, level)
# Level: 1 = entry, higher = more senior
POSITIONS = [
    ("CEO", "CEO", 10),
    ("NATIONAL_INCHARGE", "National Incharge", 9),
    ("STATE_ADMIN", "State Admin", 8),
    ("DIRECTOR", "Director", 7),
    ("VP", "Vice President", 7),
    ("MANAGER", "Manager", 6),
    ("TEAM_LEAD", "Team Lead", 5),
    ("SR_DEVELOPER", "Senior Developer", 4),
    ("DEVELOPER", "Developer", 3),
    ("JR_DEVELOPER", "Junior Developer", 2),
    ("EMPLOYEE", "Employee", 2),
    ("INTERN", "Intern", 1),
    ("HR_MANAGER", "HR Manager", 6),
    ("HR_EXECUTIVE", "HR Executive", 3),
    ("ACCOUNTANT", "Accountant", 3),
    ("DESIGNER", "Designer", 3),
    ("QA_ENGINEER", "QA Engineer", 3),
    ("DEVOPS_ENGINEER", "DevOps Engineer", 4),
    ("PROJECT_MANAGER", "Project Manager", 5),
    ("BUSINESS_ANALYST", "Business Analyst", 4),
    ("BO_USER", "BO User", 3),
    ("FIELD_EXECUTIVE", "Field Executive", 3),
]


async def seed_positions():
    """Create default positions for the tenant."""

    db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    db_url = db_url.replace("postgresql://", "")

    print("Connecting to database...")
    conn = await asyncpg.connect(f"postgresql://{db_url}")

    try:
        # Get tenant ID
        tenant = await conn.fetchrow(
            "SELECT id FROM tenants WHERE slug = $1", TENANT_SLUG
        )
        if not tenant:
            print(f"Error: Tenant '{TENANT_SLUG}' not found. Run seed_admin.py first.")
            return

        tenant_id = tenant["id"]
        print(f"Found tenant '{TENANT_SLUG}' with ID: {tenant_id}")

        # Get admin user for created_by
        admin = await conn.fetchrow(
            "SELECT id FROM users WHERE tenant_id = $1 LIMIT 1", tenant_id
        )
        admin_id = admin["id"] if admin else None

        now = datetime.now(timezone.utc)
        created = 0
        skipped = 0

        for code, title, level in POSITIONS:
            # Check if position already exists
            existing = await conn.fetchrow(
                "SELECT id FROM positions WHERE code = $1 AND tenant_id = $2",
                code, tenant_id
            )

            if existing:
                print(f"  [SKIP] Position '{title}' ({code}) already exists")
                skipped += 1
                continue

            position_id = uuid4()
            await conn.execute("""
                INSERT INTO positions (
                    id, tenant_id, code, title, level, is_active,
                    created_at, updated_at, created_by, updated_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, position_id, tenant_id, code, title, level, True,
                now, now, admin_id, admin_id)

            print(f"  [CREATE] Position '{title}' ({code}) - Level {level}")
            created += 1

        print(f"\n{'='*50}")
        print(f"Done! Created {created} positions, skipped {skipped} existing.")
        print(f"{'='*50}")

    except Exception as e:
        print(f"Error: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_positions())
