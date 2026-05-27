-- Migration 022: Add community column to code_entities for community detection
-- Purpose: Stores Leiden/Louvain community ID per entity after detect_communities()
-- Date: 2026-04-14
-- Safe: ALTER TABLE ADD COLUMN is idempotent; duplicate-column error caught by init-db.js

ALTER TABLE code_entities ADD COLUMN community INTEGER;

CREATE INDEX IF NOT EXISTS idx_code_entities_community ON code_entities(community);
