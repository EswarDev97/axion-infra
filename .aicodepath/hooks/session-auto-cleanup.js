#!/usr/bin/env node
/**
 * AICodePath Session Auto-Cleanup Hook
 *
 * SessionStart hook that automatically prunes stale state at session start:
 *   1. Stale GICL sessions (>24h with status not 'completed'/'stopped')
 *   2. Old pending fix proposals (>7 days)
 *   3. Read agent-inbox messages older than TTL
 *
 * Runs only on `startup` and `resume` session starts.
 * Returns an additionalContext summary when items were cleaned.
 *
 * @module hooks/session-auto-cleanup
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot, getDbPath } = require('../lib/path-resolver');
const logger = require('../lib/logger');

/** GICL sessions older than this with non-terminal status are auto-closed */
const GICL_STALE_HOURS = 24;

/** Fix proposals older than this are marked stale */
const FIX_PROPOSAL_STALE_DAYS = 7;

/** Agent-inbox messages older than this are pruned */
const INBOX_TTL_HOURS = 48;

/**
 * Close stale GICL sessions via DB.
 * @param {string} projectRoot
 * @returns {{ closed: number }}
 */
function cleanStaleGiclSessions(projectRoot) {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return { closed: 0 };

  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: false });

    const threshold = new Date(Date.now() - GICL_STALE_HOURS * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`
      UPDATE gicl_sessions
      SET status = 'stopped',
          stop_reason = 'stale_auto_closed_session_start',
          updated_at = CURRENT_TIMESTAMP
      WHERE status NOT IN ('completed', 'stopped', 'failed')
        AND created_at < ?
    `).run(threshold);

    db.close();
    return { closed: result.changes || 0 };
  } catch (err) {
    logger.info('GICL stale cleanup failed (non-fatal)', {
      context: 'session-auto-cleanup',
      error: err.message,
    });
    return { closed: 0 };
  }
}

/**
 * Mark stale fix proposals as expired.
 * @param {string} projectRoot
 * @returns {{ expired: number }}
 */
function cleanStaleFixProposals(projectRoot) {
  const proposalsFile = path.join(projectRoot, 'aicodepath-docs', 'pending-fix-proposals.jsonl');
  if (!fs.existsSync(proposalsFile)) return { expired: 0 };

  try {
    const threshold = Date.now() - FIX_PROPOSAL_STALE_DAYS * 24 * 60 * 60 * 1000;
    const lines = fs.readFileSync(proposalsFile, 'utf-8').split('\n').filter((l) => l.trim());
    let expired = 0;

    const updated = lines.map((line) => {
      try {
        const entry = JSON.parse(line);
        if (entry.status === 'pending' && new Date(entry.createdAt).getTime() < threshold) {
          expired++;
          return JSON.stringify({ ...entry, status: 'expired', expiredAt: new Date().toISOString() });
        }
        return line;
      } catch (_) {
        return line;
      }
    });

    if (expired > 0) {
      fs.writeFileSync(proposalsFile, updated.join('\n') + '\n', 'utf-8');
    }

    return { expired };
  } catch (err) {
    logger.info('Fix proposal cleanup failed (non-fatal)', {
      context: 'session-auto-cleanup',
      error: err.message,
    });
    return { expired: 0 };
  }
}

/**
 * Prune old agent-inbox messages.
 * @param {string} projectRoot
 * @returns {{ pruned: number }}
 */
function cleanAgentInbox(projectRoot) {
  const inboxDir = path.join(projectRoot, 'aicodepath-docs', 'agent-inbox');
  if (!fs.existsSync(inboxDir)) return { pruned: 0 };

  const threshold = Date.now() - INBOX_TTL_HOURS * 60 * 60 * 1000;
  let pruned = 0;

  try {
    const files = fs.readdirSync(inboxDir).filter((f) => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(inboxDir, file);
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter((l) => l.trim());
      const kept = lines.filter((line) => {
        try {
          const entry = JSON.parse(line);
          return new Date(entry.timestamp).getTime() >= threshold;
        } catch (_) {
          return true;
        }
      });
      const prunedCount = lines.length - kept.length;
      if (prunedCount > 0) {
        pruned += prunedCount;
        fs.writeFileSync(filePath, kept.join('\n') + (kept.length ? '\n' : ''), 'utf-8');
      }
    }
  } catch (err) {
    logger.info('Agent-inbox cleanup failed (non-fatal)', {
      context: 'session-auto-cleanup',
      error: err.message,
    });
  }

  return { pruned };
}

/**
 * Prune session-events.jsonl entries older than 30 days.
 * @param {string} projectRoot
 * @returns {{ pruned: number, kept: number }}
 */
function pruneSessionEvents(projectRoot) {
  const eventsFile = path.join(projectRoot, 'aicodepath-docs', 'session-events.jsonl');
  if (!fs.existsSync(eventsFile)) {
    return { pruned: 0, kept: 0 };
  }
  try {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const lines = fs.readFileSync(eventsFile, 'utf-8').split('\n').filter((l) => l.trim());
    const kept = lines.filter((line) => {
      try {
        const entry = JSON.parse(line);
        return new Date(entry.timestamp).getTime() >= thirtyDaysAgo;
      } catch {
        return false; // skip malformed lines
      }
    });
    fs.writeFileSync(eventsFile, kept.join('\n') + (kept.length > 0 ? '\n' : ''));
    return { pruned: lines.length - kept.length, kept: kept.length };
  } catch (e) {
    logger.warn('pruneSessionEvents error', { error: e.message, context: 'session-auto-cleanup' });
    return { pruned: 0, kept: 0 };
  }
}

/**
 * Main hook implementation.
 * @param {Object} hookData - SessionStart hook input
 */
async function sessionAutoCleanupImpl(hookData) {
  const trigger = hookData.trigger || hookData.session_start_trigger || '';

  // Only run on startup or resume — skip clear/compact (those are mid-session)
  if (trigger !== 'startup' && trigger !== 'resume' && trigger !== '') {
    return { continue: true };
  }

  const projectRoot = findProjectRoot(process.cwd());
  const summary = [];

  // 1. Stale GICL sessions
  const giclResult = cleanStaleGiclSessions(projectRoot);
  if (giclResult.closed > 0) {
    summary.push(`Closed ${giclResult.closed} stale GICL session${giclResult.closed > 1 ? 's' : ''} (>${GICL_STALE_HOURS}h inactive)`);
  }

  // 2. Stale fix proposals
  const proposalResult = cleanStaleFixProposals(projectRoot);
  if (proposalResult.expired > 0) {
    summary.push(`Expired ${proposalResult.expired} fix proposal${proposalResult.expired > 1 ? 's' : ''} (>${FIX_PROPOSAL_STALE_DAYS}d old)`);
  }

  // 3. Agent inbox TTL
  const inboxResult = cleanAgentInbox(projectRoot);
  if (inboxResult.pruned > 0) {
    summary.push(`Pruned ${inboxResult.pruned} old agent-inbox message${inboxResult.pruned > 1 ? 's' : ''} (>${INBOX_TTL_HOURS}h)`);
  }

  // 4. Session events TTL (30 days)
  const eventsResult = pruneSessionEvents(projectRoot);
  if (eventsResult.pruned > 0) {
    summary.push(`Pruned ${eventsResult.pruned} old session-event${eventsResult.pruned > 1 ? 's' : ''} (>30d)`);
  }

  if (summary.length === 0) {
    return { continue: true };
  }

  logger.info('Session auto-cleanup complete', {
    context: 'session-auto-cleanup',
    giclClosed: giclResult.closed,
    proposalsExpired: proposalResult.expired,
    inboxPruned: inboxResult.pruned,
  });

  return {
    continue: true,
    hookSpecificOutput: {
      additionalContext: `> **Session cleanup**: ${summary.join('; ')}`,
    },
  };
}

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', async () => {
    let hookData = {};
    try {
      hookData = JSON.parse(raw || '{}');
    } catch (_) { /* ignore bad input */ }

    try {
      const result = await sessionAutoCleanupImpl(hookData);
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exit(0);
    } catch (err) {
      logger.info('session-auto-cleanup failed (non-fatal)', {
        context: 'session-auto-cleanup',
        error: err.message,
      });
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      process.exit(0);
    }
  });
}

module.exports = { sessionAutoCleanupImpl, cleanStaleGiclSessions, cleanStaleFixProposals, cleanAgentInbox, pruneSessionEvents };
