/**
 * Workflow Helpers
 *
 * Shared utility functions for workflow and graph routes.
 * Extracts common logic for table checks, dependency mapping, and task queries.
 *
 * @module api/routes/workflow-helpers
 */

const { safeQuery } = require('./db-helpers');

/**
 * Check whether a table exists in the database.
 * @param {string} tableName
 * @returns {boolean}
 */
function tableExists(tableName) {
  const row = safeQuery(
    'SELECT name FROM sqlite_master WHERE type=\'table\' AND name=?',
    [tableName]
  );
  return row.length > 0;
}

/**
 * Group rows into a Map keyed by one column, collecting values from another column.
 * @param {Array<Object>} rows - DB rows
 * @param {string} keyCol - Column to group by
 * @param {string} valCol - Column to collect
 * @returns {Map<number, number[]>}
 */
function groupByKey(rows, keyCol, valCol) {
  const result = new Map();
  for (const row of rows) {
    const existing = result.get(row[keyCol]);
    if (existing) {
      existing.push(row[valCol]);
    } else {
      result.set(row[keyCol], [row[valCol]]);
    }
  }
  return result;
}

/**
 * Build a Map of unitId -> array of dependency unit IDs from unit_dependencies.
 * @returns {Map<number, number[]>}
 */
function buildDependencyMap() {
  const deps = safeQuery(
    'SELECT unit_id, depends_on_unit_id FROM unit_dependencies'
  );
  return groupByKey(deps, 'unit_id', 'depends_on_unit_id');
}

/**
 * Infer basic sequential dependencies from workflow_state ordering.
 * Within a phase, earlier stages block later stages.
 * @param {Array<Object>} tasks - workflow_state rows (must have .id and .phase)
 * @returns {Map<number, number[]>}
 */
function inferPhaseDependencies(tasks) {
  const depMap = new Map();
  const phaseCollector = {};
  for (const task of tasks) {
    (phaseCollector[task.phase] || (phaseCollector[task.phase] = [])).push(task);
  }
  for (const phaseName of Object.keys(phaseCollector)) {
    const sorted = phaseCollector[phaseName].sort((a, b) => a.id - b.id);
    for (let idx = 1; idx < sorted.length; idx++) {
      depMap.set(sorted[idx].id, [sorted[idx - 1].id]);
    }
  }
  return depMap;
}

// Static SQL body for hybrid query (workflow_state LEFT JOIN units)
const HYBRID_SQL_BODY = [
  'SELECT ws.id, ws.cr_number as crNumber, ws.phase, ws.stage, ws.unit,',
  '  COALESCE(u.status, ws.status) as status,',
  '  COALESCE(u.started_at, ws.started_at) as startedAt,',
  '  COALESCE(u.completed_at, ws.completed_at) as completedAt,',
  '  ws.steps_total as stepsTotal, ws.steps_completed as stepsCompleted,',
  '  ws.artifacts_created as artifactsCreated, ws.notes, ws.blockers,',
  '  u.id as unitId, COALESCE(u.assigned_agent, null) as assignedAgent,',
  '  COALESCE(u.priority, 0) as priority',
  'FROM workflow_state ws LEFT JOIN units u ON ws.unit = u.name',
].join('\n');

// Static SQL body for fallback query (workflow_state only, no units table)
const FALLBACK_SQL_BODY = [
  'SELECT id, cr_number as crNumber, phase, stage, unit, status,',
  '  started_at as startedAt, completed_at as completedAt,',
  '  steps_total as stepsTotal, steps_completed as stepsCompleted,',
  '  artifacts_created as artifactsCreated, notes, blockers,',
  '  null as unitId, null as assignedAgent, 0 as priority',
  'FROM workflow_state',
].join('\n');

// ORDER BY suffixes keyed by query type and direction (no interpolation)
const ORDER_SUFFIXES = {
  hybridASC: '\nORDER BY ws.id ASC',
  hybridDESC: '\nORDER BY ws.id DESC',
  fallbackASC: '\nORDER BY id ASC',
  fallbackDESC: '\nORDER BY id DESC',
};

/**
 * Fetch merged workflow tasks from DB.
 * @param {string} sortDir - 'ASC' or 'DESC' (default 'DESC')
 * @returns {{ tasks: Array, depMap: Map|null, hasUnitData: boolean }}
 */
function fetchWorkflowTasks(sortDir) {
  const direction = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const hasUnitsTable = tableExists('units');
  const hasDepTable = tableExists('unit_dependencies');

  const queryType = hasUnitsTable ? 'hybrid' : 'fallback';
  const sqlBody = hasUnitsTable ? HYBRID_SQL_BODY : FALLBACK_SQL_BODY;
  const tasks = safeQuery(sqlBody + ORDER_SUFFIXES[queryType + direction]);

  let depMap = null;
  if (hasUnitsTable && hasDepTable) {
    depMap = buildDependencyMap();
  }

  const hasUnitData = hasUnitsTable && tasks.some(task => task.unitId != null);
  if ((!depMap || depMap.size === 0) && !hasUnitData) {
    depMap = inferPhaseDependencies(tasks);
  }

  return { tasks, depMap, hasUnitData };
}

/**
 * Resolve blockedBy array for a single task given the dependency map.
 * @param {Object} task - Task row with .id and optional .unitId
 * @param {Map|null} depMap - Dependency map (unitId or wsId -> [depIds])
 * @returns {number[]}
 */
function resolveBlockedBy(task, depMap) {
  if (!depMap) return [];
  const key = task.unitId != null ? task.unitId : task.id;
  return depMap.get(key) || [];
}

module.exports = {
  tableExists,
  buildDependencyMap,
  inferPhaseDependencies,
  fetchWorkflowTasks,
  resolveBlockedBy,
};
