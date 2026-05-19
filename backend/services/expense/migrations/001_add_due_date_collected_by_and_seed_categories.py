"""
Migration: Add due_date, collected_by to expense_requests and seed default expense categories.

This migration:
1. Adds due_date (DATE, nullable) to expense_requests
2. Adds collected_by (VARCHAR(150), nullable) to expense_requests
3. Seeds default expense categories into expense_categories table

Run this migration against the expense service database.
"""

# ============================================================================
# SQL Migration - Run these statements against the database
# ============================================================================

UPGRADE_SQL = """
-- Step 1: Add new columns to expense_requests
ALTER TABLE expense_requests
    ADD COLUMN IF NOT EXISTS due_date DATE NULL,
    ADD COLUMN IF NOT EXISTS collected_by VARCHAR(150) NULL;

-- Step 2: Add index on due_date for filtering
CREATE INDEX IF NOT EXISTS idx_expense_requests_due_date
    ON expense_requests(due_date)
    WHERE due_date IS NOT NULL;

-- Step 3: Add index on collected_by for filtering
CREATE INDEX IF NOT EXISTS idx_expense_requests_collected_by
    ON expense_requests(collected_by)
    WHERE collected_by IS NOT NULL;
"""

DOWNGRADE_SQL = """
-- Reverse: Remove new columns
DROP INDEX IF EXISTS idx_expense_requests_collected_by;
DROP INDEX IF EXISTS idx_expense_requests_due_date;

ALTER TABLE expense_requests
    DROP COLUMN IF EXISTS due_date,
    DROP COLUMN IF EXISTS collected_by;
"""

# ============================================================================
# Default Expense Categories Seed Data
# ============================================================================

# These categories should be seeded per-tenant.
# Use the seed_categories.py script or the /categories API endpoint.

DEFAULT_EXPENSE_CATEGORIES = [
    {"code": "OFFICE_EXPENSE", "name": "Office Expense"},
    {"code": "EB_BILL", "name": "EB Bill"},
    {"code": "JIO_BILL", "name": "Jio Bill"},
    {"code": "AIRTEL_BILL", "name": "Airtel Bill"},
    {"code": "SURVEYOR_BILL", "name": "Surveyor Bill"},
    {"code": "PETROL", "name": "Petrol Amount"},
    {"code": "FOOD", "name": "Food"},
    {"code": "RAPIDO_UBER", "name": "Rapido / Uber Bill"},
    {"code": "INTERNET_BILL", "name": "Internet Bill"},
    {"code": "STATIONERY", "name": "Stationery"},
    {"code": "MAINTENANCE", "name": "Maintenance"},
    {"code": "TRAVEL_EXPENSE", "name": "Travel Expense"},
    {"code": "ACCOMMODATION", "name": "Accommodation"},
    {"code": "MISCELLANEOUS", "name": "Miscellaneous"},
]

SEED_CATEGORIES_SQL_TEMPLATE = """
-- Seed default expense categories for a specific tenant
-- Replace '{tenant_id}' and '{user_id}' with actual UUIDs before running

INSERT INTO expense_categories (id, tenant_id, code, name, description, is_active, created_by, updated_by, created_at, updated_at)
VALUES
    (gen_random_uuid(), '{tenant_id}', 'OFFICE_EXPENSE', 'Office Expense', 'General office expenses', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'EB_BILL', 'EB Bill', 'Electricity board bills', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'JIO_BILL', 'Jio Bill', 'Jio telecom bills', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'AIRTEL_BILL', 'Airtel Bill', 'Airtel telecom bills', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'SURVEYOR_BILL', 'Surveyor Bill', 'Surveyor service bills', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'PETROL', 'Petrol Amount', 'Fuel and petrol expenses', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'FOOD', 'Food', 'Food and meal expenses', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'RAPIDO_UBER', 'Rapido / Uber Bill', 'Ride-sharing service bills', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'INTERNET_BILL', 'Internet Bill', 'Internet service bills', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'STATIONERY', 'Stationery', 'Stationery and office supplies', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'MAINTENANCE', 'Maintenance', 'Maintenance and repair costs', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'TRAVEL_EXPENSE', 'Travel Expense', 'Business travel expenses', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'ACCOMMODATION', 'Accommodation', 'Hotel and lodging expenses', TRUE, '{user_id}', '{user_id}', NOW(), NOW()),
    (gen_random_uuid(), '{tenant_id}', 'MISCELLANEOUS', 'Miscellaneous', 'Other miscellaneous expenses', TRUE, '{user_id}', '{user_id}', NOW(), NOW())
ON CONFLICT (tenant_id, code) DO NOTHING;
"""
