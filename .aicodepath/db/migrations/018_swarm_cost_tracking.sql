-- Migration 018: Swarm Cost Tracking — Per-session, per-worker token usage
-- Tracks actual token consumption for Agent Teams (swarm) sessions.
-- Used by swarm-cost-tracker.js to compute per-session cost multipliers.

CREATE TABLE IF NOT EXISTS swarm_cost_tracking (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT NOT NULL,                    -- swarm session identifier
  worker_id       TEXT,                             -- worker agent ID (null for lead)
  role            TEXT DEFAULT 'worker'             -- 'lead' | 'worker' | 'reviewer' | 'planner'
                    CHECK(role IN ('lead', 'worker', 'reviewer', 'planner', 'critic')),
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  cost_usd        REAL DEFAULT 0,                   -- calculated cost in USD
  model_id        TEXT,                             -- e.g. 'claude-sonnet-4-5'
  task_id         TEXT,                             -- associated task (if worker)
  phase           TEXT DEFAULT 'execution'          -- 'planning' | 'execution' | 'review'
                    CHECK(phase IN ('planning', 'execution', 'review')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_swarm_cost_session
  ON swarm_cost_tracking(session_id);

CREATE INDEX IF NOT EXISTS idx_swarm_cost_worker
  ON swarm_cost_tracking(session_id, worker_id);
