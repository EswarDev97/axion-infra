#!/usr/bin/env node
/**
 * AICodePath Auto Mode Detector
 *
 * Analyzes pending task count and selects the appropriate execution mode:
 *   - solo    (1 task)   → Direct TDD implementation
 *   - parallel (2-3 tasks) → Task tool with worker separation
 *   - swarm   (4+ tasks)  → Agent Teams orchestration
 *
 * Explicit overrides always win over auto-detection.
 *
 * @module lib/auto-mode-detector
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

/** Task count thresholds for mode selection */
const MODE_THRESHOLDS = {
  SOLO_MAX: 1,    // ≤1 task  → solo
  PARALLEL_MAX: 3, // 2-3 tasks → parallel
  // 4+          → swarm
};

/** Valid explicit override values */
const VALID_OVERRIDES = ['solo', 'parallel', 'swarm'];

/**
 * Count pending tasks from tasks.md.
 * Detects both checkbox format `[ ]` and table status markers `TODO`/`PENDING`.
 *
 * @param {string} tasksFilePath - Absolute path to tasks.md
 * @returns {number} Count of pending tasks (0 if file missing)
 */
function countPendingTasks(tasksFilePath) {
  if (!tasksFilePath || !fs.existsSync(tasksFilePath)) return 0;

  try {
    const content = fs.readFileSync(tasksFilePath, 'utf-8');
    // Checkbox-style: `- [ ] task description`
    const checkboxMatches = (content.match(/^\s*-\s*\[\s*\]\s+/gm) || []).length;
    // Table-style: `| ... | TODO | ...` or `| ... | PENDING | ...`
    const tableMatches = (content.match(/\|\s*(?:TODO|PENDING|todo|pending)\s*\|/g) || []).length;
    return checkboxMatches + tableMatches;
  } catch (err) {
    logger.info('Could not read tasks file', { context: 'auto-mode-detector', error: err.message });
    return 0;
  }
}

/**
 * Detect execution mode based on task count and optional overrides.
 *
 * @param {Object} options
 * @param {number} [options.taskCount]    - Number of pending tasks (auto-counted if omitted)
 * @param {string} [options.override]     - Explicit mode: 'solo' | 'parallel' | 'swarm'
 * @param {number} [options.parallelCount] - Explicit worker count (implies parallel mode)
 * @param {string} [options.projectRoot]  - Project root path (for auto-counting from tasks.md)
 * @returns {{ mode: 'solo'|'parallel'|'swarm', taskCount: number, workerCount: number, reason: string }}
 */
function detectMode(options = {}) {
  const { override, parallelCount, projectRoot } = options;

  // Explicit override always wins
  if (override && VALID_OVERRIDES.includes(override)) {
    const count = options.taskCount ?? 0;
    if (override === 'swarm') {
      return { mode: 'swarm', taskCount: count, workerCount: 3, reason: 'Explicit --swarm override' };
    }
    if (override === 'parallel') {
      const workers = parallelCount || Math.min(count, 3) || 2;
      return { mode: 'parallel', taskCount: count, workerCount: workers, reason: `Explicit --parallel override (${workers} workers)` };
    }
    return { mode: 'solo', taskCount: count, workerCount: 1, reason: 'Explicit --solo override' };
  }

  // Explicit worker count implies parallel
  if (parallelCount && parallelCount > 0) {
    const count = options.taskCount ?? 0;
    return { mode: 'parallel', taskCount: count, workerCount: parallelCount, reason: `Explicit --parallel ${parallelCount}` };
  }

  // Auto-count from tasks.md if taskCount not provided
  let taskCount = options.taskCount;
  if (taskCount === undefined) {
    const root = projectRoot || findProjectRoot(process.cwd());
    const tasksPath = path.join(root, 'aicodepath-docs', 'tasks.md');
    taskCount = countPendingTasks(tasksPath);
    logger.info('Auto-detected pending tasks', { context: 'auto-mode-detector', taskCount, tasksPath });
  }

  // Threshold-based auto-selection
  if (taskCount <= MODE_THRESHOLDS.SOLO_MAX) {
    return { mode: 'solo', taskCount, workerCount: 1, reason: `${taskCount} pending task → solo mode` };
  }
  if (taskCount <= MODE_THRESHOLDS.PARALLEL_MAX) {
    const workers = taskCount; // one worker per task for 2-3 tasks
    return { mode: 'parallel', taskCount, workerCount: workers, reason: `${taskCount} tasks → parallel mode (${workers} workers)` };
  }
  return { mode: 'swarm', taskCount, workerCount: 3, reason: `${taskCount} tasks → swarm (Agent Teams)` };
}

/**
 * Format mode detection result as a human-readable summary line.
 *
 * @param {{ mode: string, taskCount: number, workerCount: number, reason: string }} result
 * @returns {string}
 */
function formatModeResult(result) {
  const icons = { solo: '👤', parallel: '⚡', swarm: '🐝' };
  const icon = icons[result.mode] || '?';
  return `${icon} Mode: ${result.mode.toUpperCase()} | Tasks: ${result.taskCount} | Workers: ${result.workerCount} | ${result.reason}`;
}

module.exports = {
  detectMode,
  countPendingTasks,
  formatModeResult,
  MODE_THRESHOLDS,
  VALID_OVERRIDES,
};
