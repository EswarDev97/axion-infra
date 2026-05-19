"""
Seed Script: Default Expense Categories

This script seeds the default expense type categories for a given tenant.
It uses the ExpenseService to create categories, skipping any that already exist.

Usage:
    python -m services.expense.migrations.seed_categories --tenant-id <UUID> --user-id <UUID>
"""

import asyncio
import argparse
import sys
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_async_session

DEFAULT_CATEGORIES = [
    {"code": "OFFICE_EXPENSE", "name": "Office Expense", "description": "General office expenses"},
    {"code": "EB_BILL", "name": "EB Bill", "description": "Electricity board bills"},
    {"code": "JIO_BILL", "name": "Jio Bill", "description": "Jio telecom bills"},
    {"code": "AIRTEL_BILL", "name": "Airtel Bill", "description": "Airtel telecom bills"},
    {"code": "SURVEYOR_BILL", "name": "Surveyor Bill", "description": "Surveyor service bills"},
    {"code": "PETROL", "name": "Petrol Amount", "description": "Fuel and petrol expenses"},
    {"code": "FOOD", "name": "Food", "description": "Food and meal expenses"},
    {"code": "RAPIDO_UBER", "name": "Rapido / Uber Bill", "description": "Ride-sharing service bills"},
    {"code": "INTERNET_BILL", "name": "Internet Bill", "description": "Internet service bills"},
    {"code": "STATIONERY", "name": "Stationery", "description": "Stationery and office supplies"},
    {"code": "MAINTENANCE", "name": "Maintenance", "description": "Maintenance and repair costs"},
    {"code": "TRAVEL_EXPENSE", "name": "Travel Expense", "description": "Business travel expenses"},
    {"code": "ACCOMMODATION", "name": "Accommodation", "description": "Hotel and lodging expenses"},
    {"code": "MISCELLANEOUS", "name": "Miscellaneous", "description": "Other miscellaneous expenses"},
]


async def seed_categories(tenant_id: UUID, user_id: UUID) -> None:
    """Seed default expense categories for a tenant."""
    from ..services.expense_service import ExpenseService

    async for session in get_async_session():
        service = ExpenseService(session)
        created = 0
        skipped = 0

        for cat in DEFAULT_CATEGORIES:
            try:
                await service.create_category(
                    tenant_id=tenant_id,
                    name=cat["name"],
                    code=cat["code"],
                    created_by=user_id,
                    description=cat["description"],
                    requires_receipt=False,
                )
                created += 1
                print(f"  Created: {cat['name']} ({cat['code']})")
            except Exception:
                skipped += 1
                print(f"  Skipped (already exists): {cat['name']} ({cat['code']})")

        print(f"\nDone. Created: {created}, Skipped: {skipped}")


def main():
    parser = argparse.ArgumentParser(description="Seed default expense categories")
    parser.add_argument("--tenant-id", required=True, type=str, help="Tenant UUID")
    parser.add_argument("--user-id", required=True, type=str, help="Admin user UUID")
    args = parser.parse_args()

    asyncio.run(seed_categories(UUID(args.tenant_id), UUID(args.user_id)))


if __name__ == "__main__":
    main()
