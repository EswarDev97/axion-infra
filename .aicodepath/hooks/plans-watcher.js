#!/usr/bin/env node
/**
 * AICodePath Plans Watcher Hook
 *
 * PostToolUse Write|Edit hook that detects changes to tasks.md or adr-log.md
 * and emits a context summary of what changed — new tasks added, status changes,
 * dependency updates. Helps Claude stay aware of plan state changes without
 * re-reading the entire file on every turn.
 *
 * Non-blocking — always returns proceed:true.
 *
 * @module hooks/plans-watcher
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');
const ErrorHandler = require('../lib/error-handler');

/** Plans files we care about (relative to project root) */
const WATCHED_FILES = [];

/** Directories where any file change should trigger the watcher */
const WATCHED_DIRS = ['aicodepath-docs/task/'];

/** Status marker patterns */
const STATUS_PATTERNS = {
  todo: /(?:\[ \]|\bTODO\b|\bPENDING\b)/gi,
  inProgress: /(?:\[~\]|\bWIP\b|\bIN.PROGRESS\b|\bIN_PROGRESS\b)/gi,
  done: /(?:\[x\]|\bDONE\b|\bCOMPLETED?\b)/gi,
  blocked: /\bBLOCKED\b/gi,
};

/**
 * Count status markers in content.
 *
 * @param {string} content
 * @returns {{ todo: number, inProgress: number, done: number, blocked: number, total: number }}
 */
function countStatuses(content) {
  const counts = {};
  for (const [key, pattern] of Object.entries(STATUS_PATTERNS)) {
    const matches = content.match(pattern);
    counts[key] = matches ? matches.length : 0;
  }
  counts.total = counts.todo + counts.inProgress + counts.done + counts.blocked;
  return counts;
}

/**
 * Detect changes to plan files and emit context.
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result with additionalContext
 */
function watchPlans(hookData) {
  if (!hookData?.tool_name) return { proceed: true };

  const toolName = hookData.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') return { proceed: true };

  const filePath = hookData.tool_input?.file_path || '';
  if (!filePath) return { proceed: true };

  // Normalize to check against watched files
  const root = findProjectRoot(process.cwd());
  const relPath = path.relative(root, path.resolve(filePath));
  const isWatched = WATCHED_FILES.some((w) => relPath === w || filePath.endsWith(w)) ||
    WATCHED_DIRS.some((d) => relPath.startsWith(d) || filePath.includes(d));

  if (!isWatched) return { proceed: true };

  // Read updated content
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  let content = '';
  try {
    if (fs.existsSync(absolutePath)) {
      content = fs.readFileSync(absolutePath, 'utf-8');
    } else {
      // For Write hooks, content is in tool_input
      content = hookData.tool_input?.content || '';
    }
  } catch (err) {
    logger.info('Could not read plan file for watching', {
      context: 'plans-watcher',
      file: filePath,
      error: err.message,
    });
    return { proceed: true };
  }

  const statuses = countStatuses(content);
  const fileName = path.basename(filePath);

  // Build context summary
  const lines = [
    `📋 **${fileName} updated** — task status snapshot:`,
    `  • TODO/Pending: ${statuses.todo}`,
    `  • In Progress: ${statuses.inProgress}`,
    `  • Done: ${statuses.done}`,
    `  • Blocked: ${statuses.blocked}`,
    `  • Total: ${statuses.total}`,
  ];

  if (statuses.blocked > 0) {
    lines.push(`  ⚠️  ${statuses.blocked} BLOCKED task(s) — review before continuing`);
  }

  if (statuses.total > 0 && statuses.done > 0) {
    const pct = Math.round((statuses.done / statuses.total) * 100);
    lines.push(`  📊 Progress: ${pct}% complete (${statuses.done}/${statuses.total})`);
  }

  const additionalContext = lines.join('\n');

  logger.info('Plan file updated', {
    context: 'plans-watcher',
    file: fileName,
    todo: statuses.todo,
    done: statuses.done,
    blocked: statuses.blocked,
  });

  return {
    proceed: true,
    hookSpecificOutput: { additionalContext },
  };
}

module.exports = {
  hook: ErrorHandler.wrapHook('plans-watcher', watchPlans),
  watchPlans,
  countStatuses,
  WATCHED_FILES,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(watchPlans, { name: 'plans-watcher' });
}
