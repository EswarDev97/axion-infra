-- Migration 019: Session cost tracking
-- Tracks per-session token usage and cost for cost visibility

CREATE TABLE IF NOT EXISTS session_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_session_costs_session ON session_costs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_costs_timestamp ON session_costs(timestamp);
