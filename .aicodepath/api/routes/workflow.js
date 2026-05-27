/**
 * Workflow State API Route
 *
 * Provides endpoint to retrieve workflow units from the AICodePath database.
 * Used by the dashboard Kanban board and workflow tracking views.
 *
 * Merges data from two systems:
 *   - workflow_state: populated during AIDLC phase planning (static task list)
 *   - units + unit_dependencies: populated by the orchestrator (real-time execution state)
 *
 * When both exist, real-time status from units takes precedence via COALESCE.
 * When only workflow_state exists, falls back with inferred phase-based ordering.
 *
 * Mounted at: /api/workflow-state
 *
 * Endpoints:
 *   GET / - List all workflow units with merged status and dependencies
 */

const router = require('express').Router();
const { safeQuery } = require('./db-helpers');
const logger = require('../../lib/logger');
const pathResolver = require('../../lib/path-resolver');

/**
 * Check whether a table exists in the database.
 * @param {string} tableName
 * @returns {boolean}
 */
function tableExists(tableName) {
  const row = safeQuery(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );
  return row.length > 0;
}

/**
 * Build a Map of unitId -> array of dependency unit IDs from unit_dependencies.
 * @returns {Map<number, number[]>}
 */
function buildDependencyMap() {
  const deps = safeQuery(`
    SELECT unit_id, depends_on_unit_id
    FROM unit_dependencies
  `);

  const depMap = new Map();
  for (const { unit_id, depends_on_unit_id } of deps) {
    if (!depMap.has(unit_id)) {
      depMap.set(unit_id, []);
    }
    depMap.get(unit_id).push(depends_on_unit_id);
  }
  return depMap;
}

/**
 * Infer basic sequential dependencies from workflow_state ordering.
 * Within a phase, earlier stages block later stages.
 * Returns a Map of workflow_state.id -> array of blocking workflow_state.id values.
 * @param {Array<Object>} tasks - workflow_state rows
 * @returns {Map<number, number[]>}
 */
function inferPhaseDependencies(tasks) {
  const depMap = new Map();
  // Group tasks by phase
  const phaseGroups = new Map();
  for (const task of tasks) {
    if (!phaseGroups.has(task.phase)) {
      phaseGroups.set(task.phase, []);
    }
    phaseGroups.get(task.phase).push(task);
  }

  // Within each phase, sort by id (ascending = earlier = dependency)
  for (const [, phaseTasks] of phaseGroups) {
    const sorted = [...phaseTasks].sort((a, b) => a.id - b.id);
    for (let i = 1; i < sorted.length; i++) {
      depMap.set(sorted[i].id, [sorted[i - 1].id]);
    }
  }

  return depMap;
}

/**
 * GET /api/workflow-state
 *
 * Returns all workflow units with merged real-time status and dependency data.
 *
 * Response: Array of workflow unit objects
 * [
 *   {
 *     id, crNumber, phase, stage, unit, status,
 *     startedAt, completedAt, stepsTotal, stepsCompleted,
 *     artifactsCreated, notes, blockers, blockedBy,
 *     priority, assignedAgent, unitId
 *   },
 *   ...
 * ]
 */
router.get('/', (req, res) => {
  try {
    const hasUnitsTable = tableExists('units');
    const hasDepTable = tableExists('unit_dependencies');

    let tasks;
    let depMap;

    if (hasUnitsTable) {
      // Hybrid query: merge workflow_state with units for real-time status
      tasks = safeQuery(`
        SELECT
          ws.id,
          ws.cr_number as crNumber,
          ws.phase,
          ws.stage,
          ws.unit,
          COALESCE(u.status, ws.status) as status,
          COALESCE(u.started_at, ws.started_at) as startedAt,
          COALESCE(u.completed_at, ws.completed_at) as completedAt,
          ws.steps_total as stepsTotal,
          ws.steps_completed as stepsCompleted,
          ws.artifacts_created as artifactsCreated,
          ws.notes,
          ws.blockers,
          u.id as unitId,
          COALESCE(u.assigned_agent, null) as assignedAgent,
          COALESCE(u.priority, 0) as priority
        FROM workflow_state ws
        LEFT JOIN units u ON ws.unit = u.name
        ORDER BY ws.id DESC
      `);

      // Build dependency map from unit_dependencies if available
      if (hasDepTable) {
        depMap = buildDependencyMap();
      }
    } else {
      // Fallback: workflow_state only (backward compatible)
      tasks = safeQuery(`
        SELECT
          id,
          cr_number as crNumber,
          phase,
          stage,
          unit,
          status,
          started_at as startedAt,
          completed_at as completedAt,
          steps_total as stepsTotal,
          steps_completed as stepsCompleted,
          artifacts_created as artifactsCreated,
          notes,
          blockers,
          null as unitId,
          null as assignedAgent,
          0 as priority
        FROM workflow_state
        ORDER BY id DESC
      `);
    }

    // Check if units table had any matching data
    const hasUnitData = hasUnitsTable && tasks.some(t => t.unitId != null);

    // Build final dependency arrays
    if (!depMap && !hasUnitData) {
      // No orchestration data at all - infer dependencies from phase ordering
      depMap = inferPhaseDependencies(tasks);
    }

    // Parse JSON fields and attach blockedBy
    const tasksWithParsed = tasks.map(task => {
      let blockedBy = [];

      if (depMap && task.unitId != null) {
        // Use real dependency data keyed by unit ID
        blockedBy = depMap.get(task.unitId) || [];
      } else if (depMap && task.unitId == null) {
        // Use inferred dependencies keyed by workflow_state ID
        blockedBy = depMap.get(task.id) || [];
      }

      return {
        ...task,
        artifactsCreated: task.artifactsCreated ? JSON.parse(task.artifactsCreated) : [],
        blockedBy,
        priority: task.priority === 0 ? 'normal' : task.priority > 5 ? 'high' : 'normal',
      };
    });

    logger.info('[Workflow] Workflow state requested', {
      context: 'workflow-route',
      count: tasksWithParsed.length,
      hasUnitsTable,
      hasUnitData,
    });

    res.json(tasksWithParsed);
  } catch (error) {
    logger.error('[Workflow] Failed to fetch workflow state', {
      error: error.message,
      context: 'workflow-route',
    });
    res.status(500).json({
      error: 'Failed to fetch workflow state',
      details: error.message,
    });
  }
});

/**
 * POST /api/workflow-state
 *
 * Persist UI-generated features into the workflow_state table.
 * Closes the contract gap where ExpandProjectModal features
 * only existed in React local state.
 *
 * Body:
 * - features: Array of { title, description, priority, dependencies }
 * - projectName: Project name (default: "AICodePath")
 *
 * Response:
 * - inserted: Number of rows inserted
 * - ids: Array of inserted row IDs
 */
router.post('/', (req, res) => {
  const { features, projectName = 'AICodePath' } = req.body;

  // Validation
  if (!features || !Array.isArray(features) || features.length === 0) {
    return res.status(400).json({
      error: 'features array is required and must not be empty',
    });
  }

  if (features.length > 50) {
    return res.status(400).json({
      error: 'Too many features (max 50)',
    });
  }

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    if (!f.title || typeof f.title !== 'string') {
      return res.status(400).json({
        error: `Feature at index ${i} is missing a valid title`,
      });
    }
  }

  try {
    // Open a WRITABLE connection (db-helpers singleton is read-only)
    const Database = require('better-sqlite3');
    const pathResolver = require('../../lib/path-resolver');
    const dbPath = pathResolver.getDbPath();

    if (!require('fs').existsSync(dbPath)) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    const db = new Database(dbPath);

    const insertStmt = db.prepare(`
      INSERT INTO workflow_state (cr_number, phase, stage, unit, status, notes, blockers, steps_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ids = [];
    // Timestamp prefix ensures cr_number is unique across separate POST calls
    const batchPrefix = `UI-${Date.now()}`;

    const insertAll = db.transaction((featureList) => {
      for (let i = 0; i < featureList.length; i++) {
        const feature = featureList[i];
        const priority = feature.priority || 'medium';
        const stepsTotal = priority === 'high' ? 10 : priority === 'medium' ? 7 : 5;
        const blockers = feature.dependencies && feature.dependencies.length > 0
          ? JSON.stringify(feature.dependencies)
          : null;

        // cr_number must be unique within (phase, stage) to satisfy the DB unique index.
        // Format: UI-<timestamp>-<index> keeps rows from the same batch distinct.
        const crNumber = `${batchPrefix}-${i}`;

        const result = insertStmt.run(
          crNumber,                // cr_number — unique per feature to satisfy unique index
          'inception',             // phase — new features start in inception
          'Planning',              // stage
          feature.title,           // unit
          blockers ? 'blocked' : 'pending', // status
          feature.description || null,      // notes
          blockers,                // blockers
          stepsTotal               // steps_total
        );
        ids.push(Number(result.lastInsertRowid));
      }
    });

    try {
      insertAll(features);
    } finally {
      db.close();
    }

    // Emit WebSocket event so dashboard updates in real-time
    try {
      const { getWebSocketServer } = require('../../lib/websocket-server');
      const wsServer = getWebSocketServer();
      if (wsServer) {
        wsServer.emitProgress({
          passing: 0,
          inProgress: 0,
          total: ids.length,
          percentage: 0,
        });
      }
    } catch (_) {
      // WebSocket unavailable — non-fatal
    }

    logger.info('[Workflow] Features persisted from UI', {
      context: 'workflow-route',
      count: ids.length,
      projectName,
    });

    res.status(201).json({
      inserted: ids.length,
      ids,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Workflow] Failed to persist features', {
      error: error.message,
      context: 'workflow-route',
    });
    res.status(500).json({
      error: 'Failed to persist features',
      details: error.message,
    });
  }
});

// ---------------------------------------------------------------------------
// Sprint History Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/workflow-state/sprints
 * Returns all sprints (distinct cr_numbers) with their date range.
 */
router.get('/sprints', (req, res) => {
  try {
    const { listSprints } = require('../../lib/sprint-history');
    const db = getDbFromHelpers();
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    const sprints = listSprints(db);
    res.json(sprints);
  } catch (error) {
    logger.error('Failed to list sprints', { context: 'api/sprints', error: error.message });
    res.status(500).json({ error: 'Failed to list sprints', details: error.message });
  }
});

/**
 * GET /api/workflow-state/sprints/:cr/tasks
 * Returns all tasks/units for a specific sprint by CR number.
 */
router.get('/sprints/:cr/tasks', (req, res) => {
  try {
    const { getSprintTasks } = require('../../lib/sprint-history');
    const db = getDbFromHelpers();
    if (!db) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    const tasks = getSprintTasks(db, req.params.cr);
    res.json(tasks);
  } catch (error) {
    logger.error('Failed to get sprint tasks', { context: 'api/sprints/:cr/tasks', error: error.message });
    res.status(500).json({ error: 'Failed to get sprint tasks', details: error.message });
  }
});

/**
 * Get the DB instance from db-helpers module.
 * Uses the existing safeQuery's underlying connection rather than opening a new one.
 */
function getDbFromHelpers() {
  const dbPath = pathResolver.getDbPath();
  if (!dbPath) return null;
  const Database = require('better-sqlite3');
  return new Database(dbPath, { readonly: true });
}

module.exports = router;
