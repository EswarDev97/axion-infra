/**
 * Cost API Routes
 *
 * Exposes GICL token usage and cost data for the dashboard.
 *
 * Routes:
 *   GET /api/cost/summary?period=daily|weekly|monthly
 *   GET /api/cost/sessions?limit=10
 *   GET /api/cost/iterations/:sessionId
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const { getDbPath } = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

/**
 * Open a readonly DB connection. Caller MUST close it in a finally block.
 * @returns {import('better-sqlite3').Database}
 */
function openDb() {
  return new Database(getDbPath(), { readonly: true });
}

// GET /api/cost/summary?period=daily|weekly|monthly
// Tries cost_summary table first; falls back to aggregating gicl_sessions/gicl_iterations
router.get('/summary', (req, res) => {
  let db;
  try {
    const period = req.query.period || 'daily';
    db = openDb();

    // Try the pre-aggregated cost_summary table first
    let row = null;
    try {
      row = db.prepare(`
        SELECT
          total_cost_usd,
          total_input_tokens,
          total_output_tokens,
          cache_read_tokens,
          cache_write_tokens,
          session_count,
          iteration_count
        FROM cost_summary
        WHERE period = ?
        ORDER BY period_start DESC
        LIMIT 1
      `).get(period);
    } catch (_) {
      // Table may not exist or be empty — fall through to live aggregation
    }

    // Fallback: aggregate from gicl_sessions + gicl_iterations directly
    if (!row || !row.total_cost_usd) {
      const periodFilter = period === 'daily'
        ? "AND s.created_at >= datetime('now', '-1 day')"
        : period === 'weekly'
          ? "AND s.created_at >= datetime('now', '-7 days')"
          : "AND s.created_at >= datetime('now', '-30 days')";

      try {
        row = db.prepare(`
          SELECT
            COALESCE(SUM(s.total_cost_usd), 0) AS total_cost_usd,
            COALESCE(SUM(s.total_input_tokens), 0) AS total_input_tokens,
            COALESCE(SUM(s.total_output_tokens), 0) AS total_output_tokens,
            COALESCE(SUM(i.cache_read_tokens), 0) AS cache_read_tokens,
            COALESCE(SUM(i.cache_write_tokens), 0) AS cache_write_tokens,
            COUNT(DISTINCT s.id) AS session_count,
            COUNT(i.id) AS iteration_count
          FROM gicl_sessions s
          LEFT JOIN gicl_iterations i ON i.session_id = s.id
          WHERE 1=1 ${periodFilter}
        `).get();
      } catch (_) {
        // Tables may not exist yet
        row = null;
      }
    }

    res.json(row || {
      total_cost_usd: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      session_count: 0,
      iteration_count: 0,
    });
  } catch (error) {
    logger.error('Cost summary query failed', { error: error.message, context: 'cost-routes' });
    res.status(500).json({ error: 'Failed to fetch cost summary' });
  } finally {
    if (db) db.close();
  }
});

// GET /api/cost/sessions?limit=10
router.get('/sessions', (req, res) => {
  let db;
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    db = openDb();

    const sessions = db.prepare(`
      SELECT
        id, target_file, complexity, max_iterations, current_iteration,
        total_cost_usd, total_input_tokens, total_output_tokens,
        status, created_at, completed_at
      FROM gicl_sessions
      WHERE total_cost_usd > 0
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    res.json(sessions);
  } catch (error) {
    logger.error('Cost sessions query failed', { error: error.message, context: 'cost-routes' });
    res.status(500).json({ error: 'Failed to fetch session costs' });
  } finally {
    if (db) db.close();
  }
});

// GET /api/cost/iterations/:sessionId
router.get('/iterations/:sessionId', (req, res) => {
  let db;
  try {
    const { sessionId } = req.params;
    db = openDb();

    const iterations = db.prepare(`
      SELECT
        iteration_number, final_score, input_tokens, output_tokens,
        cache_read_tokens, cache_write_tokens, model_id, cost_usd,
        created_at
      FROM gicl_iterations
      WHERE session_id = ?
      ORDER BY iteration_number ASC
    `).all(sessionId);

    res.json(iterations);
  } catch (error) {
    logger.error('Cost iterations query failed', { error: error.message, context: 'cost-routes' });
    res.status(500).json({ error: 'Failed to fetch iteration costs' });
  } finally {
    if (db) db.close();
  }
});

module.exports = router;
