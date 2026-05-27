-- Migration 021: Add is_test column to code_entities
-- Purpose: AST parser detects test entities (test_*, *_test, *Test*, *_spec) but
--          never stored the flag — graph_engine.py queries it causing OperationalError.
-- Date: 2026-04-04
-- Safe: ALTER TABLE ADD COLUMN with DEFAULT 0 is idempotent; duplicate-column error
--       is caught by init-db.js and ast_parser.py upgrade block.

ALTER TABLE code_entities ADD COLUMN is_test BOOLEAN DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_code_entities_is_test ON code_entities(is_test);
