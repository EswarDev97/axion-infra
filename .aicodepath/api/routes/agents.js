/**
 * Agent Status API Route
 *
 * Provides endpoint to retrieve agent statuses from the AICodePath database.
 * Used by the dashboard Agent Mission Control and monitor views.
 *
 * Mounted at: /api/agent-status
 *
 * Endpoints:
 *   GET / - List all agent statuses
 */

const router = require('express').Router();
const { safeQuery } = require('./db-helpers');
const logger = require('../../lib/logger');

/**
 * GET /api/agent-status
 *
 * Returns all agent statuses ordered by most recently updated first.
 *
 * Response: Array of agent status objects
 * [
 *   {
 *     id, session_id, status, current_task,
 *     progress_percentage, updated_at
 *   },
 *   ...
 * ]
 */
router.get('/', (req, res) => {
  try {
    const agents = safeQuery(`
      SELECT
        id,
        session_id,
        status,
        current_task,
        progress_percentage,
        updated_at
      FROM agent_status
      ORDER BY updated_at DESC
    `);

    logger.info('[Agents] Agent status requested', {
      context: 'agents-route',
      count: agents.length,
    });

    res.json(agents);
  } catch (error) {
    logger.error('[Agents] Failed to fetch agent status', {
      error: error.message,
      context: 'agents-route',
    });
    res.status(500).json({
      error: 'Failed to fetch agent status',
      details: error.message,
    });
  }
});

module.exports = router;
