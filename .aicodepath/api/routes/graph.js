/**
 * Graph API Route
 *
 * Returns workflow units as React Flow compatible nodes and edges
 * for the dependency graph visualization.
 *
 * Mounted at: /api/units/graph
 *
 * Endpoints:
 *   GET / - Returns { nodes, edges } for React Flow rendering
 */

const router = require('express').Router();
const logger = require('../../lib/logger');
const { fetchWorkflowTasks, resolveBlockedBy } = require('./workflow-helpers');

/**
 * Map raw status values to simplified graph statuses.
 * @param {string} rawStatus - Raw status from DB
 * @returns {string} Normalized status for the graph UI
 */
function normalizeStatus(rawStatus) {
  if (!rawStatus) return 'pending';
  const lower = rawStatus.toLowerCase();
  if (lower === 'completed' || lower === 'skipped') return 'done';
  if (lower === 'blocked' || lower === 'failed') return 'blocked';
  if (lower === 'in_progress') return 'in_progress';
  return 'pending';
}

/**
 * Transform a workflow task row into a React Flow node.
 * @param {Object} task - Task row from fetchWorkflowTasks
 * @param {number[]} blockedBy - IDs of blocking tasks
 * @returns {Object} React Flow node
 */
function taskToNode(task, blockedBy) {
  return {
    id: String(task.id),
    type: 'taskNode',
    position: { x: 0, y: 0 },
    data: {
      label: task.unit || task.stage || 'Task ' + task.id,
      status: normalizeStatus(task.status),
      rawStatus: task.status,
      phase: task.phase,
      stage: task.stage,
      assignedAgent: task.assignedAgent || null,
      stepsTotal: task.stepsTotal || 0,
      stepsCompleted: task.stepsCompleted || 0,
      priority: task.priority === 0 ? 'normal' : task.priority > 5 ? 'high' : 'normal',
      blockedBy: blockedBy.map(String),
    },
  };
}

/**
 * GET /api/units/graph
 *
 * Returns React Flow compatible { nodes, edges } data.
 */
router.get('/', (req, res) => {
  try {
    const { tasks, depMap } = fetchWorkflowTasks('ASC');

    const nodes = tasks.map(task => {
      const blockedBy = resolveBlockedBy(task, depMap);
      return taskToNode(task, blockedBy);
    });

    // Build edges from blockedBy relationships
    const nodeIdSet = new Set(nodes.map(node => node.id));
    const edges = [];
    for (const node of nodes) {
      for (const depId of node.data.blockedBy) {
        if (nodeIdSet.has(depId)) {
          edges.push({
            id: 'e-' + depId + '-' + node.id,
            source: depId,
            target: node.id,
            animated: false,
          });
        }
      }
    }

    logger.info('[Graph] Graph data requested', {
      context: 'graph-route',
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });

    res.json({ nodes, edges });
  } catch (error) {
    logger.error('[Graph] Failed to fetch graph data', {
      error: error.message,
      context: 'graph-route',
    });
    res.status(500).json({
      error: 'Failed to fetch graph data',
      details: error.message,
    });
  }
});

module.exports = router;
