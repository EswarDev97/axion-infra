/**
 * Conversations API Routes
 *
 * Exposes AI conversation session data across all adapters.
 *
 * Routes:
 *   GET /api/conversations/adapters
 *   GET /api/conversations/sessions?projectRoot&limit&adapter
 *   GET /api/conversations/:sessionID/messages?limit&offset
 *   GET /api/conversations/:sessionID/usage
 *   GET /api/conversations/:sessionID/tool-uses?tool
 *   POST /api/conversations/sync
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const { getDbPath } = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

let db;
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Close the conversations DB connection (called from server shutdown).
 */
function closeConversationsDb() {
  if (db) {
    try { db.close(); } catch (_) { /* ignore */ }
    db = null;
  }
}

function getAdapterManager() {
  return require('../../lib/adapters/adapter-manager').getAdapterManager();
}

/**
 * GET /api/conversations/adapters
 * List detected adapters for current project
 */
router.get('/adapters', async (req, res) => {
  try {
    const projectRoot = req.query.projectRoot || process.cwd();
    const adapters = await getAdapterManager().detectAdapters(projectRoot);
    res.json({ adapters });
  } catch (error) {
    logger.error('Failed to detect adapters', { context: 'conversations-api', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/sessions
 * List all sessions across all adapters (from DB, falls back to live scan)
 */
router.get('/sessions', async (req, res) => {
  try {
    const projectRoot = req.query.projectRoot || process.cwd();
    const limit = parseInt(req.query.limit) || 50;
    const adapterID = req.query.adapter;

    let query = `SELECT * FROM ai_sessions WHERE project_root = ?`;
    const params = [projectRoot];

    if (adapterID) {
      query += ` AND adapter_id = ?`;
      params.push(adapterID);
    }

    query += ` ORDER BY updated_at DESC LIMIT ?`;
    params.push(limit);

    let sessions;
    try {
      sessions = getDb().prepare(query).all(...params);
    } catch (dbErr) {
      // Table may not exist yet - fall back to live adapter scan
      logger.warn('ai_sessions table not available, falling back to live scan', {
        context: 'conversations-api',
        error: dbErr.message,
      });
      sessions = await getAdapterManager().getAllSessions(projectRoot);
    }

    res.json({ sessions, count: sessions.length });
  } catch (error) {
    logger.error('Failed to list sessions', { context: 'conversations-api', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/:sessionID/messages
 * Get messages for a session (paginated)
 * Query: limit, offset
 */
router.get('/:sessionID/messages', async (req, res) => {
  try {
    const { sessionID } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;

    let messages, total;
    try {
      const db = getDb();
      messages = db.prepare(`
        SELECT * FROM ai_messages
        WHERE session_id = ?
        ORDER BY message_index ASC, timestamp ASC
        LIMIT ? OFFSET ?
      `).all(sessionID, limit, offset);
      const countRow = db.prepare(`SELECT COUNT(*) AS cnt FROM ai_messages WHERE session_id = ?`).get(sessionID);
      total = countRow ? countRow.cnt : messages.length;
    } catch (dbErr) {
      // Table may not exist yet - fall back to incremental adapter read
      logger.warn('ai_messages table not available, falling back to adapter', {
        context: 'conversations-api',
        error: dbErr.message,
      });
      try {
        const adapter = getAdapterManager().getAdapter('claude-code');
        if (adapter && adapter.getMessagePage) {
          const page = await adapter.getMessagePage(sessionID, limit, offset);
          return res.json({
            messages: page.messages,
            count: page.messages.length,
            total: page.total,
            hasMore: page.hasMore,
            offset,
            limit,
            fromCache: page.fromCache
          });
        }
        messages = await getAdapterManager().getAdapter('claude-code').getMessages(sessionID);
        total = messages.length;
        messages = messages.slice(offset, offset + limit);
      } catch (adapterErr) {
        messages = [];
        total = 0;
      }
    }

    res.json({
      messages,
      count: messages.length,
      total: total || messages.length,
      hasMore: offset + limit < (total || messages.length),
      offset,
      limit
    });
  } catch (error) {
    logger.error('Failed to get messages', { context: 'conversations-api', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/:sessionID/usage
 * Get usage statistics for a session
 */
router.get('/:sessionID/usage', async (req, res) => {
  try {
    const { sessionID } = req.params;

    let usage;
    try {
      usage = getDb().prepare(`
        SELECT * FROM ai_usage_stats WHERE session_id = ?
      `).get(sessionID);
    } catch (dbErr) {
      usage = null;
    }

    if (!usage) {
      // Fall back to live calculation
      try {
        usage = await getAdapterManager().getAdapter('claude-code').getUsage(sessionID);
      } catch (adapterErr) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    res.json(usage);
  } catch (error) {
    logger.error('Failed to get usage stats', { context: 'conversations-api', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/:sessionID/tool-uses
 * Get tool uses for a session
 */
router.get('/:sessionID/tool-uses', async (req, res) => {
  try {
    const { sessionID } = req.params;
    const toolName = req.query.tool;

    let query = `SELECT * FROM ai_tool_uses WHERE session_id = ?`;
    const params = [sessionID];

    if (toolName) {
      query += ` AND tool_name = ?`;
      params.push(toolName);
    }

    query += ` ORDER BY timestamp DESC`;

    let toolUses;
    try {
      toolUses = getDb().prepare(query).all(...params);
    } catch (dbErr) {
      toolUses = [];
    }

    res.json({ toolUses, count: toolUses.length });
  } catch (error) {
    logger.error('Failed to get tool uses', { context: 'conversations-api', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/conversations/sync
 * Trigger manual sync of sessions from adapters into DB
 */
router.post('/sync', async (req, res) => {
  try {
    const projectRoot = req.body.projectRoot || process.cwd();
    const sessions = await getAdapterManager().getAllSessions(projectRoot);

    const stmt = getDb().prepare(`
      INSERT INTO ai_sessions (
        id, adapter_id, adapter_name, adapter_icon, name, slug,
        project_root, file_path, worktree_name, worktree_path,
        created_at, updated_at, duration_seconds, is_active,
        total_tokens, estimated_cost_usd, message_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        updated_at = excluded.updated_at,
        is_active = excluded.is_active,
        message_count = excluded.message_count,
        last_synced_at = CURRENT_TIMESTAMP
    `);

    let syncedCount = 0;
    for (const session of sessions) {
      try {
        stmt.run(
          session.id, session.adapterID, session.adapterName, session.adapterIcon,
          session.name, session.slug, projectRoot, session.filePath,
          session.worktreeName, session.worktreePath,
          session.createdAt, session.updatedAt, session.duration,
          session.isActive ? 1 : 0, session.totalTokens,
          session.estimatedCost, session.messageCount
        );
        syncedCount++;
      } catch (rowErr) {
        logger.warn('Failed to upsert session', {
          context: 'conversations-api',
          sessionId: session.id,
          error: rowErr.message,
        });
      }
    }

    res.json({
      success: true,
      syncedSessions: syncedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to sync sessions', { context: 'conversations-api', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/cache/stats
 * Get incremental parser cache statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const adapter = getAdapterManager().getAdapter('claude-code');
    const stats = adapter && adapter.getCacheStats ? adapter.getCacheStats() : null;
    res.json(stats || { available: false });
  } catch (error) {
    logger.error('Failed to get cache stats', { context: 'conversations-api', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.closeConversationsDb = closeConversationsDb;
module.exports = router;
