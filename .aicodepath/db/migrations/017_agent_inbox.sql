-- Migration 017: Agent Inbox — Cross-agent message passing for swarm sessions
-- Stores messages exchanged between agents in Agent Teams (swarm) sessions.
-- File-based JSONL is primary; this table provides query/audit capability.

CREATE TABLE IF NOT EXISTS agent_inbox (
  id              TEXT PRIMARY KEY,                   -- e.g. "msg_a3b1c2"
  from_agent      TEXT NOT NULL,                      -- sender agent ID
  to_agent        TEXT NOT NULL,                      -- recipient agent ID or 'broadcast'
  message_type    TEXT NOT NULL,                      -- from MESSAGE_TYPES in agent-inbox.js
  content         TEXT DEFAULT '',                    -- human-readable message body
  priority        TEXT NOT NULL DEFAULT 'normal'
                    CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  data            TEXT,                               -- JSON-encoded structured payload
  read            INTEGER NOT NULL DEFAULT 0,         -- 0=unread, 1=read
  session_id      TEXT,                               -- associated swarm session
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_inbox_to
  ON agent_inbox(to_agent, read);

CREATE INDEX IF NOT EXISTS idx_agent_inbox_session
  ON agent_inbox(session_id);

CREATE INDEX IF NOT EXISTS idx_agent_inbox_type
  ON agent_inbox(message_type);

CREATE INDEX IF NOT EXISTS idx_agent_inbox_created
  ON agent_inbox(created_at);
