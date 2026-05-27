-- Migration 016: Fix Proposals — Review-driven task escalation
-- Stores fix proposals created by code reviewer findings.
-- Proposals progress: pending → approved/rejected/escalated.

CREATE TABLE IF NOT EXISTS fix_proposals (
  id                  TEXT PRIMARY KEY,                   -- e.g. "fp_a3b1c2"
  original_task_id    TEXT NOT NULL,                      -- task that triggered the finding
  severity            TEXT NOT NULL                       -- 'critical' | 'major' | 'minor'
                        CHECK(severity IN ('critical', 'major', 'minor')),
  location            TEXT NOT NULL DEFAULT 'unknown',    -- 'file.js:42' or 'task:task-id'
  issue               TEXT NOT NULL,                      -- description of the problem
  suggestion          TEXT DEFAULT '',                    -- how to fix it
  auto_fixable        INTEGER NOT NULL DEFAULT 0,         -- 1 = Lead can apply directly
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending', 'approved', 'rejected', 'escalated')),
  failure_category    TEXT,                               -- 'syntax_error' | 'type_error' | etc.
  consecutive_failures INTEGER NOT NULL DEFAULT 0,        -- tracks escalation threshold
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_fix_proposals_status
  ON fix_proposals(status);

CREATE INDEX IF NOT EXISTS idx_fix_proposals_task
  ON fix_proposals(original_task_id);

CREATE INDEX IF NOT EXISTS idx_fix_proposals_severity
  ON fix_proposals(severity, status);
