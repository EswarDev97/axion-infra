-- Migration 015: Reflexion Pattern — Cross-session error learning
-- Records failed attempts and successful resolutions for pattern matching

CREATE TABLE IF NOT EXISTS reflexion_patterns (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  error_type     TEXT NOT NULL,          -- e.g. 'test_failure', 'syntax_error', 'api_mismatch'
  context_hash   TEXT NOT NULL,          -- hash of file+task context for similarity matching
  description    TEXT NOT NULL,          -- what was tried (free text)
  failure_reason TEXT NOT NULL,          -- why it failed
  solution       TEXT,                   -- what worked (NULL = unresolved)
  confidence     REAL DEFAULT 0.0,       -- 0.0-1.0, increases with reuse
  times_used     INTEGER DEFAULT 0,
  times_helped   INTEGER DEFAULT 0,
  project_root   TEXT NOT NULL,
  session_id     TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  resolved_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_reflexion_error_type
  ON reflexion_patterns(error_type);

CREATE INDEX IF NOT EXISTS idx_reflexion_context_hash
  ON reflexion_patterns(context_hash);

CREATE INDEX IF NOT EXISTS idx_reflexion_project
  ON reflexion_patterns(project_root);

-- FTS for searching by description and failure reason
CREATE VIRTUAL TABLE IF NOT EXISTS reflexion_fts
  USING fts5(description, failure_reason, solution, content=reflexion_patterns, content_rowid=id);

CREATE TRIGGER IF NOT EXISTS reflexion_fts_insert
  AFTER INSERT ON reflexion_patterns BEGIN
    INSERT INTO reflexion_fts(rowid, description, failure_reason, solution)
    VALUES (new.id, new.description, new.failure_reason, new.solution);
  END;

CREATE TRIGGER IF NOT EXISTS reflexion_fts_update
  AFTER UPDATE ON reflexion_patterns BEGIN
    INSERT INTO reflexion_fts(reflexion_fts, rowid, description, failure_reason, solution)
    VALUES ('delete', old.id, old.description, old.failure_reason, old.solution);
    INSERT INTO reflexion_fts(rowid, description, failure_reason, solution)
    VALUES (new.id, new.description, new.failure_reason, new.solution);
  END;
