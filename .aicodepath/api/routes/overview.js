/**
 * Overview API Route
 *
 * Provides the dashboard overview endpoint with aggregate counts,
 * workflow progress, phase breakdown, and recent activity.
 *
 * Mounted at: /api/overview
 *
 * Endpoints:
 *   GET /          - Full dashboard overview with counts, progress, and activity
 *   GET /progress  - Lightweight progress data for header bar
 */

const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const { safeQuery, safeQueryOne } = require('./db-helpers');
const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

/**
 * Read phase/stage from aicodepath-docs/aicodepath-state.md.
 * This is the human-maintained ground truth for project phase.
 *
 * @returns {{ phase: string|null, stage: string|null }}
 */
function readPhaseFromStateFile() {
  try {
    const projectRoot = pathResolver.findProjectRoot();
    const stateFile = path.join(projectRoot, 'aicodepath-docs', 'aicodepath-state.md');
    if (!fs.existsSync(stateFile)) return { phase: null, stage: null };

    const content = fs.readFileSync(stateFile, 'utf8');

    // Match "**Phase:** CONSTRUCTION" (actual format in state files)
    let phase = null;
    const phaseMatch = content.match(/\*\*Phase:\*\*\s*(\S+)/);
    if (phaseMatch) phase = phaseMatch[1];

    // Also try "Current Phase: **something**" (session-start-hook format)
    if (!phase) {
      const altMatch = content.match(/Current Phase:\s*\*\*(\S+)\*\*/);
      if (altMatch) phase = altMatch[1];
    }

    // Match "**Stage:** build-and-test ..."
    let stage = null;
    const stageMatch = content.match(/\*\*Stage:\*\*\s*(\S+)/);
    if (stageMatch) stage = stageMatch[1];

    return { phase, stage };
  } catch (err) {
    logger.warn('[Overview] Failed to read state file', {
      error: err.message,
      context: 'overview-route',
    });
    return { phase: null, stage: null };
  }
}

/**
 * Read phase/stage from aicodepath-docs/checkpoints/latest.json.
 * Excludes terminal phases (END, UNKNOWN) that don't represent active work.
 *
 * @returns {{ phase: string|null, stage: string|null }}
 */
function readPhaseFromCheckpoint() {
  try {
    const projectRoot = pathResolver.findProjectRoot();
    const checkpointFile = path.join(projectRoot, 'aicodepath-docs', 'checkpoints', 'latest.json');
    if (!fs.existsSync(checkpointFile)) return { phase: null, stage: null };

    const data = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
    const phase = data.phase || null;
    const stage = data.stage || null;

    // Skip terminal phases that don't represent active work
    if (phase && ['END', 'UNKNOWN'].includes(phase.toUpperCase())) {
      return { phase: null, stage: null };
    }

    return { phase, stage };
  } catch (err) {
    logger.warn('[Overview] Failed to read checkpoint file', {
      error: err.message,
      context: 'overview-route',
    });
    return { phase: null, stage: null };
  }
}

/**
 * Build workflow progress data from the database.
 * Shared between the full overview and the lightweight progress endpoint.
 */
function getWorkflowProgress() {
  const statusDistribution = safeQuery(
    "SELECT status, COUNT(*) as count FROM workflow_state GROUP BY status"
  );

  const statusMap = {};
  let total = 0;
  for (const row of statusDistribution) {
    statusMap[row.status] = row.count;
    total += row.count;
  }

  const completed = statusMap['completed'] || 0;
  const inProgress = statusMap['in_progress'] || 0;
  const pending = (statusMap['pending'] || 0) + (statusMap['ready'] || 0);
  const blocked = statusMap['blocked'] || 0;
  const failed = statusMap['failed'] || 0;
  const skipped = statusMap['skipped'] || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Priority-based phase resolution:
  // 1. aicodepath-state.md  (human-maintained ground truth)
  // 2. checkpoints/latest   (machine snapshots, skip END/UNKNOWN)
  // 3. session_state table  (DB, may be stale)
  // 4. workflow_state infer  (last resort from latest entry)

  let currentPhase = null;
  let currentStage = null;
  let phaseSource = null;

  // 1. State file (highest priority)
  const stateFile = readPhaseFromStateFile();
  if (stateFile.phase) {
    currentPhase = stateFile.phase;
    currentStage = stateFile.stage;
    phaseSource = 'state-file';
  }

  // 2. Checkpoint file
  if (!currentPhase) {
    const checkpoint = readPhaseFromCheckpoint();
    if (checkpoint.phase) {
      currentPhase = checkpoint.phase;
      currentStage = checkpoint.stage;
      phaseSource = 'checkpoint';
    }
  }

  // 3. session_state table
  if (!currentPhase) {
    const phaseRow = safeQueryOne(
      "SELECT value FROM session_state WHERE key = 'current_phase'"
    );
    const stageRow = safeQueryOne(
      "SELECT value FROM session_state WHERE key = 'current_stage'"
    );
    try {
      if (phaseRow?.value) currentPhase = JSON.parse(phaseRow.value);
      if (stageRow?.value) currentStage = JSON.parse(stageRow.value);
    } catch (_) {
      if (phaseRow?.value) currentPhase = phaseRow.value;
      if (stageRow?.value) currentStage = stageRow.value;
    }
    if (currentPhase) phaseSource = 'session-state';
  }

  // 4. Infer from most recent workflow entry
  if (!currentPhase) {
    const latestEntry = safeQueryOne(
      "SELECT phase, stage FROM workflow_state ORDER BY id DESC LIMIT 1"
    );
    if (latestEntry) {
      currentPhase = latestEntry.phase;
      if (!currentStage) currentStage = latestEntry.stage;
      phaseSource = 'workflow-inference';
    }
  }

  // Normalize to uppercase for consistent display
  if (currentPhase) currentPhase = currentPhase.toUpperCase();
  if (currentStage) currentStage = currentStage.toLowerCase();

  // Phase breakdown: group by phase, stage, status
  const phaseBreakdown = safeQuery(`
    SELECT
      phase,
      stage,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN status = 'pending' OR status = 'ready' THEN 1 ELSE 0 END) as pending
    FROM workflow_state
    GROUP BY phase, stage
    ORDER BY MIN(id) ASC
  `);

  return {
    currentPhase,
    currentStage,
    phaseSource,
    progress: {
      completed,
      inProgress,
      pending,
      blocked,
      failed,
      skipped,
      total,
      percentage,
    },
    statusDistribution,
    phaseBreakdown,
  };
}

/**
 * GET /api/overview
 *
 * Returns aggregate counts, workflow progress, and recent activity.
 */
router.get('/', (req, res) => {
  try {
    const workflowCount = safeQueryOne(
      'SELECT COUNT(*) as count FROM workflow_state'
    );
    const artifactCount = safeQueryOne(
      'SELECT COUNT(*) as count FROM artifacts'
    );
    const validationCount = safeQueryOne(
      'SELECT COUNT(*) as count FROM validations'
    );
    const activeAgents = safeQueryOne(
      "SELECT COUNT(*) as count FROM agent_status WHERE status = 'running'"
    );

    const recentActivity = safeQuery(`
      SELECT phase, stage, unit, status, started_at, completed_at
      FROM workflow_state
      ORDER BY id DESC
      LIMIT 10
    `);

    const workflowProgress = getWorkflowProgress();

    logger.info('[Overview] Dashboard overview requested', {
      context: 'overview-route',
      workflows: workflowCount?.count || 0,
      artifacts: artifactCount?.count || 0,
    });

    res.json({
      counts: {
        workflows: workflowCount?.count || 0,
        artifacts: artifactCount?.count || 0,
        validations: validationCount?.count || 0,
        activeAgents: activeAgents?.count || 0,
      },
      recentActivity,
      ...workflowProgress,
    });
  } catch (error) {
    logger.error('[Overview] Failed to fetch overview', {
      error: error.message,
      context: 'overview-route',
    });
    res.status(500).json({
      error: 'Failed to fetch dashboard overview',
      details: error.message,
    });
  }
});

/**
 * GET /api/overview/progress
 *
 * Lightweight endpoint returning only progress data.
 * Used by the header progress bar to avoid fetching the full overview.
 */
router.get('/progress', (req, res) => {
  try {
    const workflowProgress = getWorkflowProgress();
    res.json(workflowProgress);
  } catch (error) {
    logger.error('[Overview] Failed to fetch progress', {
      error: error.message,
      context: 'overview-route',
    });
    res.status(500).json({
      error: 'Failed to fetch workflow progress',
      details: error.message,
    });
  }
});

module.exports = router;
