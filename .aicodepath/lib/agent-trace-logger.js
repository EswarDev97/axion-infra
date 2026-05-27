#!/usr/bin/env node
/**
 * AICodePath Agent Trace Logger
 *
 * Unified execution trace logging for agent operations.
 * Appends structured trace entries to agent-trace.jsonl, providing
 * a cross-session audit trail of agent activities.
 *
 * Trace entries include: agent name, session, operation type,
 * inputs, outputs, duration, and success/failure status.
 *
 * @module lib/agent-trace-logger
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

/** Trace file (relative to project root) */
const TRACE_FILENAME = 'agent-trace.jsonl';

/** Valid operation types */
const OPERATION_TYPES = [
  'skill_invoked',
  'agent_spawned',
  'agent_completed',
  'hook_fired',
  'hook_blocked',
  'hook_warned',
  'task_started',
  'task_completed',
  'task_failed',
  'gicl_iteration',
  'swarm_started',
  'swarm_worker_done',
  'review_completed',
  'checkpoint_created',
];

/** Get absolute path to trace file */
function getTracePath(projectRoot) {
  const root = projectRoot || findProjectRoot(process.cwd());
  return path.join(root, 'aicodepath-docs', TRACE_FILENAME);
}

/**
 * Append a trace entry to agent-trace.jsonl.
 *
 * @param {Object} entry
 * @param {string} entry.operation  - Operation type from OPERATION_TYPES
 * @param {string} [entry.agent]    - Agent or skill name
 * @param {string} [entry.sessionId] - Session identifier
 * @param {Object} [entry.input]    - Abbreviated input data
 * @param {Object} [entry.output]   - Abbreviated output data
 * @param {number} [entry.durationMs] - Operation duration in milliseconds
 * @param {boolean} [entry.success] - Whether operation succeeded
 * @param {string} [entry.error]    - Error message if failed
 * @param {string} [projectRoot]
 * @returns {Object} The written trace entry
 */
function trace(entry, projectRoot) {
  if (!entry?.operation) {
    logger.info('Trace entry missing operation field — skipped', { context: 'agent-trace-logger' });
    return null;
  }

  const root = projectRoot || findProjectRoot(process.cwd());
  const tracePath = getTracePath(root);
  const dir = path.dirname(tracePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const record = {
    id: 'tr_' + crypto.randomBytes(3).toString('hex'),
    operation: entry.operation,
    agent: entry.agent || null,
    sessionId: entry.sessionId || process.env.CLAUDE_SESSION_ID || null,
    input: entry.input || null,
    output: entry.output || null,
    durationMs: entry.durationMs || null,
    success: entry.success !== undefined ? Boolean(entry.success) : null,
    error: entry.error || null,
    timestamp: new Date().toISOString(),
  };

  try {
    fs.appendFileSync(tracePath, JSON.stringify(record) + '\n', 'utf-8');
  } catch (err) {
    logger.info('Could not write trace entry', { context: 'agent-trace-logger', error: err.message });
    return null;
  }

  return record;
}

/**
 * Create a timer that records duration when stopped.
 *
 * @param {Object} baseEntry - Base trace entry fields
 * @param {string} [projectRoot]
 * @returns {{ stop: (extra?: Object) => Object }} Timer object
 */
function startTimer(baseEntry, projectRoot) {
  const startMs = Date.now();
  return {
    stop(extra = {}) {
      const durationMs = Date.now() - startMs;
      return trace({ ...baseEntry, ...extra, durationMs }, projectRoot);
    },
  };
}

/**
 * Read trace entries, optionally filtered.
 *
 * @param {Object} [filter]
 * @param {string} [filter.operation]  - Filter by operation type
 * @param {string} [filter.agent]      - Filter by agent name
 * @param {string} [filter.sessionId]  - Filter by session ID
 * @param {boolean} [filter.failuresOnly] - Only return failed operations
 * @param {string}  [filter.since]     - ISO timestamp — only entries after this
 * @param {number}  [filter.limit]     - Max entries to return
 * @param {string} [projectRoot]
 * @returns {Object[]} Trace entries (chronological)
 */
function readTrace(filter = {}, projectRoot) {
  const tracePath = getTracePath(projectRoot);
  if (!fs.existsSync(tracePath)) return [];

  try {
    const lines = fs.readFileSync(tracePath, 'utf-8').split('\n').filter((l) => l.trim());
    let entries = lines.map((line) => JSON.parse(line));

    if (filter.operation) entries = entries.filter((e) => e.operation === filter.operation);
    if (filter.agent) entries = entries.filter((e) => e.agent === filter.agent);
    if (filter.sessionId) entries = entries.filter((e) => e.sessionId === filter.sessionId);
    if (filter.failuresOnly) entries = entries.filter((e) => e.success === false);
    if (filter.since) {
      const since = new Date(filter.since);
      entries = entries.filter((e) => new Date(e.timestamp) > since);
    }
    if (filter.limit && filter.limit > 0) {
      entries = entries.slice(-filter.limit);
    }

    return entries;
  } catch (err) {
    logger.info('Could not read trace file', { context: 'agent-trace-logger', error: err.message });
    return [];
  }
}

/**
 * Get summary statistics for a session or time window.
 *
 * @param {Object} [filter] - Same filters as readTrace
 * @param {string} [projectRoot]
 * @returns {{ total: number, succeeded: number, failed: number, byOperation: Object, avgDurationMs: number }}
 */
function getStats(filter = {}, projectRoot) {
  const entries = readTrace(filter, projectRoot);
  const byOperation = {};

  let totalDuration = 0;
  let durationCount = 0;

  for (const e of entries) {
    byOperation[e.operation] = (byOperation[e.operation] || 0) + 1;
    if (e.durationMs != null) {
      totalDuration += e.durationMs;
      durationCount++;
    }
  }

  return {
    total: entries.length,
    succeeded: entries.filter((e) => e.success === true).length,
    failed: entries.filter((e) => e.success === false).length,
    byOperation,
    avgDurationMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
  };
}

module.exports = {
  trace,
  startTimer,
  readTrace,
  getStats,
  getTracePath,
  OPERATION_TYPES,
  TRACE_FILENAME,
};
