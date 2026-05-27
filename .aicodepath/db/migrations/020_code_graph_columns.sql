-- Migration 020: Code Graph Columns
-- Purpose: Add repo_name and package_name columns to code_entities
--          for multi-repo code graph and reverse engineering support.
-- Date: 2026-03-27
-- Note: SQLite lacks ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so we
--       check the column list first to make this migration idempotent.

-- Add repo_name if it doesn't exist
-- SQLite will ignore the ALTER if the column is already present when
-- wrapped in a conditional check via the application layer.
-- For raw SQL execution, we rely on the fact that duplicate ADD COLUMN
-- raises "duplicate column name" which init-db.js should catch gracefully.
ALTER TABLE code_entities ADD COLUMN repo_name TEXT;
ALTER TABLE code_entities ADD COLUMN package_name TEXT;

CREATE INDEX IF NOT EXISTS idx_code_entities_repo ON code_entities(repo_name);
CREATE INDEX IF NOT EXISTS idx_code_entities_package ON code_entities(package_name);
