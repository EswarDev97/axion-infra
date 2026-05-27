#!/usr/bin/env node
/**
 * graph-git-hook.js — PostToolUse Bash hook
 *
 * Updates the code graph after git operations that change the working tree:
 * commit, pull, merge, checkout, rebase, stash pop, cherry-pick.
 *
 * Fail-open: always returns proceed:true. Python errors never block Claude.
 *
 * @module hooks/graph-git-hook
 */

'use strict';

const { diffReindex } = require('./lib/graph-bridge');
const pathResolver = require('../lib/path-resolver');
const logger = require('../lib/logger');

/** Patterns that trigger a graph update */
const GIT_GRAPH_TRIGGERS = [
  /\bgit\s+commit\b/,
  /\bgit\s+pull\b/,
  /\bgit\s+merge\b/,
  /\bgit\s+checkout\b/,
  /\bgit\s+rebase\b/,
  /\bgit\s+stash\s+pop\b/,
  /\bgit\s+cherry-pick\b/,
];

/**
 * Check graph coverage and trigger a full reindex if below threshold.
 *
 * Compares entity count in the graph DB against git-tracked file count.
 * If coverage < threshold, calls diffReindex to re-scan the full tree.
 * Always fail-open — never throws.
 *
 * @param {string} dbPath - Path to the SQLite graph database
 * @param {number} [threshold=0.50] - Minimum coverage fraction (0–1)
 * @returns {Promise<{triggered: boolean, entityCount?: number, trackedFiles?: number, coverage?: number}>}
 */
async function checkAndTriggerFullReindex(dbPath, threshold = 0.50) {
  try {
    const Database = require('better-sqlite3');
    let entityCount = 0;
    try {
      const db = new Database(dbPath, { readonly: true });
      try {
        entityCount = db.prepare('SELECT COUNT(*) as cnt FROM code_entities').get().cnt;
      } finally {
        db.close();
      }
    } catch (_dbErr) {
      // DB missing or no table yet — treat as 0 entities
    }

    const { execSync } = require('child_process');
    let trackedFiles = 0;
    try {
      const out = execSync('git ls-files | wc -l', { encoding: 'utf8' }).trim();
      trackedFiles = parseInt(out, 10) || 0;
    } catch (_gitErr) {
      return { triggered: false };
    }

    if (trackedFiles === 0) return { triggered: false };

    const coverage = entityCount / trackedFiles;
    if (coverage < threshold) {
      logger.info('graph-git-hook: coverage below threshold, triggering full reindex', {
        context: 'graph-git-hook',
        coverage: coverage.toFixed(2),
        threshold,
        entityCount,
        trackedFiles,
      });
      await diffReindex(dbPath);
      return { triggered: true, entityCount, trackedFiles, coverage };
    }
    return { triggered: false, entityCount, trackedFiles, coverage };
  } catch (err) {
    logger.warn('graph-git-hook: coverage check failed', {
      context: 'graph-git-hook',
      error: err.message,
    });
    return { triggered: false };
  }
}

/**
 * Execute the graph-git-hook logic.
 *
 * @param {Object|null} hookData - Claude Code PostToolUse hook payload
 * @returns {Promise<Object>} Hook result — always has proceed:true
 */
async function execute(hookData) {
  // Safely extract command from hookData (PostToolUse Bash: tool_input.command)
  const command = hookData?.tool_input?.command || '';

  const triggered = GIT_GRAPH_TRIGGERS.some((pattern) => pattern.test(command));

  if (!triggered) {
    // Not a relevant git operation — pass through silently
    return { proceed: true };
  }

  try {
    const dbPath = pathResolver.getDbPath();
    const stats = await diffReindex(dbPath);

    if (stats) {
      return {
        proceed: true,
        hookSpecificOutput: {
          additionalContext: `Code graph updated: ${stats.indexed} files indexed, ${stats.resolved} relations resolved.`,
        },
      };
    }
  } catch (err) {
    logger.warn('graph-git-hook: graph update failed', {
      context: 'graph-git-hook',
      error: err.message,
    });
  }

  // Fail-open: always proceed, even if diffReindex returned null or threw
  return { proceed: true };
}

// stdin/stdout hook protocol — use wrapHook so logger (Winston Console →
// stdout) is redirected to stderr during execution and never pollutes the
// JSON output that Claude Code parses.
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'graph-git-hook' });
}

module.exports = { execute, GIT_GRAPH_TRIGGERS, checkAndTriggerFullReindex };
