/**
 * Monitoring API Routes
 *
 * Provides endpoints for monitoring and tracking:
 * - Validation results and summaries
 * - Artifact tracking with filters
 * - Design violation detection
 * - Session history
 *
 * All endpoints are mounted under /api by the parent router.
 */

const router = require('express').Router();
const { safeQuery } = require('./db-helpers');
const logger = require('../../lib/logger');

/**
 * GET /api/validations
 *
 * Retrieve validation results with associated artifact titles.
 * Returns up to 100 most recent validations ordered by validated_at descending.
 *
 * Response: Array of validation objects with artifact_title from LEFT JOIN
 */
router.get('/validations', (req, res) => {
  try {
    const validations = safeQuery(`
      SELECT
        v.id,
        v.artifact_id,
        v.file_path,
        v.validation_type,
        v.score,
        v.status,
        v.violations,
        v.validated_at,
        a.title as artifact_title
      FROM validations v
      LEFT JOIN artifacts a ON v.artifact_id = a.id
      ORDER BY v.validated_at DESC
      LIMIT 100
    `);

    res.json(validations);
  } catch (error) {
    logger.error('[monitoring] Failed to fetch validations', {
      error: error.message,
      context: 'monitoring',
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/validation-summary
 *
 * Aggregated validation statistics grouped by type and status.
 * Returns count and average score per group.
 *
 * Response: Array of { validation_type, status, count, avg_score }
 */
router.get('/validation-summary', (req, res) => {
  try {
    const summary = safeQuery(`
      SELECT
        validation_type,
        status,
        COUNT(*) as count,
        AVG(score) as avg_score
      FROM validations
      GROUP BY validation_type, status
    `);

    res.json(summary);
  } catch (error) {
    logger.error('[monitoring] Failed to fetch validation summary', {
      error: error.message,
      context: 'monitoring',
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/artifacts
 *
 * Retrieve artifacts with optional filtering.
 *
 * Query Parameters:
 * - type (string): Filter by artifact_type
 * - phase (string): Filter by phase
 * - limit (number): Max results (default: 50)
 *
 * Response: Array of artifact objects ordered by updated_at descending
 */
router.get('/artifacts', (req, res) => {
  try {
    const { type, phase, limit = 50 } = req.query;

    let query = `
      SELECT
        id,
        artifact_type,
        phase,
        stage,
        unit,
        title,
        file_path,
        status,
        version,
        created_at,
        updated_at,
        created_by
      FROM artifacts
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND artifact_type = ?';
      params.push(type);
    }

    if (phase) {
      query += ' AND phase = ?';
      params.push(phase);
    }

    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const artifacts = safeQuery(query, params);
    res.json(artifacts);
  } catch (error) {
    logger.error('[monitoring] Failed to fetch artifacts', {
      error: error.message,
      context: 'monitoring',
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/artifact-stats
 *
 * Artifact statistics grouped by type and phase.
 * Returns count and last updated timestamp per group.
 *
 * Response: Array of { artifact_type, phase, count, last_updated }
 */
router.get('/artifact-stats', (req, res) => {
  try {
    const stats = safeQuery(`
      SELECT
        artifact_type,
        phase,
        COUNT(*) as count,
        MAX(updated_at) as last_updated
      FROM artifacts
      GROUP BY artifact_type, phase
    `);

    res.json(stats);
  } catch (error) {
    logger.error('[monitoring] Failed to fetch artifact stats', {
      error: error.message,
      context: 'monitoring',
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/design-violations
 *
 * Retrieve design violations ordered by severity (critical > major > minor).
 * Returns up to 100 most relevant violations.
 *
 * Response: Array of violation objects with severity-based ordering
 */
router.get('/design-violations', (req, res) => {
  try {
    const violations = safeQuery(`
      SELECT
        id,
        violation_type,
        severity,
        file_path,
        description,
        suggestion,
        detected_at
      FROM design_violations
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'major' THEN 2
          WHEN 'minor' THEN 3
          ELSE 4
        END,
        detected_at DESC
      LIMIT 100
    `);

    res.json(violations);
  } catch (error) {
    logger.error('[monitoring] Failed to fetch design violations', {
      error: error.message,
      context: 'monitoring',
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/session-history
 *
 * Retrieve recent session events.
 * Returns up to 50 most recent events ordered by timestamp descending.
 *
 * Response: Array of session history events
 */
router.get('/session-history', (req, res) => {
  try {
    const sessions = safeQuery(`
      SELECT
        id,
        session_id,
        event_type,
        agent_name,
        task_description,
        timestamp,
        metadata
      FROM session_history
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    res.json(sessions);
  } catch (error) {
    logger.error('[monitoring] Failed to fetch session history', {
      error: error.message,
      context: 'monitoring',
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
