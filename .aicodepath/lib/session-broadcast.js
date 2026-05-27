#!/usr/bin/env node
/**
 * AICodePath Session Broadcast
 *
 * File-based cross-session event bus. Enables multiple Claude Code sessions
 * (or multiple agents in swarm mode) to communicate without requiring
 * a server or WebSocket infrastructure.
 *
 * Events are written as JSONL to:
 *   aicodepath-docs/session-events.jsonl
 *
 * Any session can read events since a given timestamp to catch up on
 * what other sessions have signaled.
 *
 * Event types follow the existing signal protocol:
 *   task_completed, task_failed, teammate_idle, session_started,
 *   session_ended, checkpoint_created, review_complete, etc.
 *
 * @module lib/session-broadcast
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

/** Events file (relative to project root) */
const EVENTS_FILENAME = 'session-events.jsonl';

/** Standard event types */
const EVENT_TYPES = [
  'session_started',
  'session_ended',
  'task_completed',
  'task_failed',
  'task_blocked',
  'teammate_idle',
  'checkpoint_created',
  'review_complete',
  'swarm_started',
  'swarm_completed',
  'phase_transition',
  'ci_status',
  'custom',
];

/**
 * Get absolute path to events file.
 *
 * @param {string} [projectRoot]
 * @returns {string}
 */
function getEventsPath(projectRoot) {
  const root = projectRoot || findProjectRoot(process.cwd());
  return path.join(root, 'aicodepath-docs', EVENTS_FILENAME);
}

/**
 * Emit an event to the broadcast channel.
 *
 * @param {Object} event
 * @param {string} event.type      - Event type (from EVENT_TYPES or 'custom')
 * @param {string} [event.sessionId] - Emitting session ID
 * @param {string} [event.agentId]   - Emitting agent ID (for swarm events)
 * @param {Object} [event.data]      - Arbitrary event payload
 * @param {string} [projectRoot]
 * @returns {Object} The emitted event
 */
function emit(event, projectRoot) {
  if (!event?.type) throw new Error('event.type is required');

  const root = projectRoot || findProjectRoot(process.cwd());
  const eventsPath = getEventsPath(root);
  const dir = path.dirname(eventsPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const entry = {
    id: 'evt_' + crypto.randomBytes(3).toString('hex'),
    type: event.type,
    sessionId: event.sessionId || process.env.CLAUDE_SESSION_ID || 'unknown',
    agentId: event.agentId || null,
    data: event.data || null,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  fs.appendFileSync(eventsPath, JSON.stringify(entry) + '\n', 'utf-8');

  logger.info('Session event emitted', {
    context: 'session-broadcast',
    eventId: entry.id,
    type: entry.type,
    sessionId: entry.sessionId,
  });

  return entry;
}

/**
 * Read events, optionally filtered by timestamp or type.
 *
 * @param {Object} [filter]
 * @param {string} [filter.since]     - ISO timestamp — only events after this
 * @param {string} [filter.type]      - Filter by event type
 * @param {string} [filter.sessionId] - Filter by session ID
 * @param {number} [filter.limit]     - Max events to return (most recent first if specified)
 * @param {string} [projectRoot]
 * @returns {Object[]} Array of event objects (chronological order)
 */
function readEvents(filter = {}, projectRoot) {
  const eventsPath = getEventsPath(projectRoot);
  if (!fs.existsSync(eventsPath)) return [];

  try {
    const lines = fs.readFileSync(eventsPath, 'utf-8').split('\n').filter((l) => l.trim());
    let events = lines.map((line) => JSON.parse(line));

    // Apply filters
    if (filter.since) {
      const since = new Date(filter.since);
      events = events.filter((e) => new Date(e.timestamp) > since);
    }
    if (filter.type) events = events.filter((e) => e.type === filter.type);
    if (filter.sessionId) events = events.filter((e) => e.sessionId === filter.sessionId);

    // Apply limit (last N events)
    if (filter.limit && filter.limit > 0) {
      events = events.slice(-filter.limit);
    }

    return events;
  } catch (err) {
    logger.info('Could not read session events', {
      context: 'session-broadcast',
      error: err.message,
    });
    return [];
  }
}

/**
 * Get the most recent event of a given type.
 *
 * @param {string} eventType
 * @param {string} [projectRoot]
 * @returns {Object|null}
 */
function getLatest(eventType, projectRoot) {
  const events = readEvents({ type: eventType }, projectRoot);
  return events.length > 0 ? events[events.length - 1] : null;
}

/**
 * Check if a task has been completed (by any session).
 *
 * @param {string} taskId
 * @param {string} [projectRoot]
 * @returns {boolean}
 */
function isTaskCompleted(taskId, projectRoot) {
  const events = readEvents({ type: 'task_completed' }, projectRoot);
  return events.some((e) => e.data?.taskId === taskId);
}

/**
 * Emit a task_completed event.
 *
 * @param {string} taskId
 * @param {Object} [meta] - Additional metadata (commitHash, duration, etc.)
 * @param {string} [projectRoot]
 * @returns {Object} The emitted event
 */
function emitTaskCompleted(taskId, meta = {}, projectRoot) {
  return emit({ type: 'task_completed', data: { taskId, ...meta } }, projectRoot);
}

/**
 * Emit a task_failed event.
 *
 * @param {string} taskId
 * @param {string} reason
 * @param {string} [projectRoot]
 * @returns {Object} The emitted event
 */
function emitTaskFailed(taskId, reason, projectRoot) {
  return emit({ type: 'task_failed', data: { taskId, reason } }, projectRoot);
}

/**
 * Emit a checkpoint_created event.
 *
 * @param {string} checkpointId
 * @param {Object} [meta]
 * @param {string} [projectRoot]
 * @returns {Object} The emitted event
 */
function emitCheckpoint(checkpointId, meta = {}, projectRoot) {
  return emit({ type: 'checkpoint_created', data: { checkpointId, ...meta } }, projectRoot);
}

module.exports = {
  emit,
  readEvents,
  getLatest,
  isTaskCompleted,
  emitTaskCompleted,
  emitTaskFailed,
  emitCheckpoint,
  getEventsPath,
  EVENT_TYPES,
  EVENTS_FILENAME,
};
