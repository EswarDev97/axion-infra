/**
 * Code Analysis API Routes
 *
 * Provides endpoints for code structure analysis:
 * - Code entities (functions, classes, modules) with complexity metrics
 * - Code relations (dependency graph between entities)
 *
 * All endpoints are mounted under /api by the parent router.
 */

const router = require('express').Router();
const { safeQuery } = require('./db-helpers');
const logger = require('../../lib/logger');

/**
 * GET /api/code-entities
 *
 * Retrieve code entities (functions, classes, modules, etc.) ordered by
 * complexity score descending. Returns up to 100 entities.
 *
 * Response: Array of code entity objects with complexity and documentation info
 */
router.get('/code-entities', (req, res) => {
  try {
    const entities = safeQuery(`
      SELECT
        id,
        file_path,
        entity_type,
        name as entity_name,
        line_start as start_line,
        line_end as end_line,
        complexity as complexity_score,
        documentation as docstring
      FROM code_entities
      ORDER BY complexity DESC
      LIMIT 100
    `);

    res.json(entities);
  } catch (error) {
    logger.error('[code-analysis] Failed to fetch code entities', {
      error: error.message,
      context: 'code-analysis',
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/code-relations
 *
 * Retrieve code dependency relations between entities.
 * Includes source and target entity names and file paths via LEFT JOIN.
 * Returns up to 200 relations for dependency graph visualization.
 *
 * Response: Array of relation objects with source/target entity details
 */
router.get('/code-relations', (req, res) => {
  try {
    const relations = safeQuery(`
      SELECT
        cr.id,
        cr.from_entity_id as source_entity_id,
        cr.to_entity_id as target_entity_id,
        cr.relation_type,
        ce1.name as source_name,
        ce1.file_path as source_file,
        ce2.name as target_name,
        ce2.file_path as target_file
      FROM code_relations cr
      LEFT JOIN code_entities ce1 ON cr.from_entity_id = ce1.id
      LEFT JOIN code_entities ce2 ON cr.to_entity_id = ce2.id
      LIMIT 200
    `);

    res.json(relations);
  } catch (error) {
    logger.error('[code-analysis] Failed to fetch code relations', {
      error: error.message,
      context: 'code-analysis',
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
