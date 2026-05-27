#!/usr/bin/env node
/**
 * AICodePath Agent Inbox
 *
 * File-based cross-agent message passing for Agent Teams (swarm) sessions.
 * Allows workers, reviewers, and the lead agent to communicate without
 * requiring a message broker or server.
 *
 * Messages are stored as JSONL files per recipient:
 *   aicodepath-docs/agent-inbox/{agentId}.jsonl
 *
 * Special recipient "broadcast" writes to a shared channel all agents can read.
 *
 * @module lib/agent-inbox
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

/** Inbox directory (relative to project root) */
const INBOX_DIR = 'aicodepath-docs/agent-inbox';

/** Special broadcast recipient */
const BROADCAST_RECIPIENT = 'broadcast';

/** Valid message priorities */
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/** Valid message types */
const MESSAGE_TYPES = [
  'task_update',    // Worker reporting progress
  'task_complete',  // Worker signaling completion
  'task_blocked',   // Worker reporting a blocker
  'review_result',  // Reviewer sharing APPROVE/REQUEST_CHANGES
  'fix_proposal',   // Reviewer creating a fix proposal
  'escalation',     // Lead escalating a failed task
  'signal',         // Generic coordination signal
  'broadcast',      // Broadcast to all agents
];

/**
 * Get absolute path to inbox file for a given agent.
 *
 * @param {string} agentId
 * @param {string} [projectRoot]
 * @returns {string}
 */
function getInboxPath(agentId, projectRoot) {
  const root = projectRoot || findProjectRoot(process.cwd());
  const inboxDir = path.join(root, INBOX_DIR);
  return path.join(inboxDir, `${agentId}.jsonl`);
}

/**
 * Ensure inbox directory exists.
 *
 * @param {string} [projectRoot]
 */
function ensureInboxDir(projectRoot) {
  const root = projectRoot || findProjectRoot(process.cwd());
  const inboxDir = path.join(root, INBOX_DIR);
  if (!fs.existsSync(inboxDir)) {
    fs.mkdirSync(inboxDir, { recursive: true });
  }
}

/**
 * Send a message to an agent (or broadcast).
 *
 * @param {string} from          - Sender agent ID
 * @param {string} to            - Recipient agent ID or 'broadcast'
 * @param {Object} messageData
 * @param {string} messageData.type     - Message type (from MESSAGE_TYPES)
 * @param {string} [messageData.content] - Message body text
 * @param {string} [messageData.priority] - 'low'|'normal'|'high'|'urgent'
 * @param {Object} [messageData.data]   - Arbitrary structured data
 * @param {string} [projectRoot]
 * @returns {Object} The sent message object
 */
function send(from, to, messageData, projectRoot) {
  if (!from) throw new Error('sender agent ID required');
  if (!to) throw new Error('recipient agent ID required');
  if (!messageData?.type) throw new Error('message type required');

  const root = projectRoot || findProjectRoot(process.cwd());
  ensureInboxDir(root);

  const message = {
    id: 'msg_' + crypto.randomBytes(3).toString('hex'),
    from,
    to,
    type: messageData.type,
    content: messageData.content || '',
    priority: PRIORITIES.includes(messageData.priority) ? messageData.priority : 'normal',
    data: messageData.data || null,
    read: false,
    timestamp: new Date().toISOString(),
  };

  // Write to recipient's inbox
  const inboxPath = getInboxPath(to, root);
  fs.appendFileSync(inboxPath, JSON.stringify(message) + '\n', 'utf-8');

  // For broadcasts, also write to the broadcast file
  if (to !== BROADCAST_RECIPIENT) {
    // Write copy to broadcast log for audit trail
    const broadcastPath = getInboxPath(BROADCAST_RECIPIENT, root);
    fs.appendFileSync(broadcastPath, JSON.stringify({ ...message, _copy: true }) + '\n', 'utf-8');
  }

  logger.info('Agent message sent', {
    context: 'agent-inbox',
    messageId: message.id,
    from,
    to,
    type: message.type,
    priority: message.priority,
  });

  return message;
}

/**
 * Broadcast a message to all agents (writes to broadcast channel).
 *
 * @param {string} from
 * @param {Object} messageData
 * @param {string} [projectRoot]
 * @returns {Object} The sent message
 */
function broadcast(from, messageData, projectRoot) {
  return send(from, BROADCAST_RECIPIENT, { ...messageData, type: messageData.type || 'broadcast' }, projectRoot);
}

/**
 * Read messages from an agent's inbox.
 *
 * @param {string} agentId
 * @param {Object} [filter]
 * @param {boolean} [filter.unreadOnly=false] - Only return unread messages
 * @param {string}  [filter.type]             - Filter by message type
 * @param {string}  [filter.from]             - Filter by sender
 * @param {string}  [filter.since]            - ISO timestamp — only messages after this
 * @param {string}  [projectRoot]
 * @returns {Object[]} Array of message objects
 */
function receive(agentId, filter = {}, projectRoot) {
  const inboxPath = getInboxPath(agentId, projectRoot);
  if (!fs.existsSync(inboxPath)) return [];

  try {
    const lines = fs.readFileSync(inboxPath, 'utf-8').split('\n').filter((l) => l.trim());
    let messages = lines.map((line) => JSON.parse(line));

    // Apply filters
    if (filter.unreadOnly) messages = messages.filter((m) => !m.read);
    if (filter.type) messages = messages.filter((m) => m.type === filter.type);
    if (filter.from) messages = messages.filter((m) => m.from === filter.from);
    if (filter.since) {
      const since = new Date(filter.since);
      messages = messages.filter((m) => new Date(m.timestamp) > since);
    }

    // Sort by priority (urgent > high > normal > low) then by timestamp
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    messages.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    return messages;
  } catch (err) {
    logger.info('Could not read agent inbox', {
      context: 'agent-inbox',
      agentId,
      error: err.message,
    });
    return [];
  }
}

/**
 * Mark messages as read.
 *
 * @param {string} agentId
 * @param {string[]} messageIds - IDs to mark as read
 * @param {string} [projectRoot]
 */
function markRead(agentId, messageIds, projectRoot) {
  const inboxPath = getInboxPath(agentId, projectRoot);
  if (!fs.existsSync(inboxPath)) return;

  try {
    const lines = fs.readFileSync(inboxPath, 'utf-8').split('\n').filter((l) => l.trim());
    const messages = lines.map((line) => JSON.parse(line)).map((m) => {
      if (messageIds.includes(m.id)) return { ...m, read: true };
      return m;
    });
    fs.writeFileSync(inboxPath, messages.map((m) => JSON.stringify(m)).join('\n') + '\n', 'utf-8');
  } catch (err) {
    logger.info('Could not mark messages read', { context: 'agent-inbox', error: err.message });
  }
}

/**
 * Count unread messages for an agent.
 *
 * @param {string} agentId
 * @param {string} [projectRoot]
 * @returns {number}
 */
function unreadCount(agentId, projectRoot) {
  return receive(agentId, { unreadOnly: true }, projectRoot).length;
}

module.exports = {
  send,
  broadcast,
  receive,
  markRead,
  unreadCount,
  getInboxPath,
  BROADCAST_RECIPIENT,
  PRIORITIES,
  MESSAGE_TYPES,
  INBOX_DIR,
};
