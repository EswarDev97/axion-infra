#!/usr/bin/env node
/**
 * AICodePath Worktree Lifecycle Hook
 *
 * Handles WorktreeCreate and WorktreeRemove events.
 *
 * WorktreeCreate (opt-in only — replaces default git behavior):
 *   - Creates git worktree at the configured root
 *   - Prints absolute path to stdout (required by Claude Code spec)
 *   - Enable by adding to WorktreeCreate in settings template
 *
 * WorktreeRemove (registered by default):
 *   - Cleans up aicodepath-specific state for the removed worktree
 *   - Emits trace entry for audit log
 *   - Non-blocking — failures logged in debug mode only
 *
 * @module hooks/worktree-lifecycle
 *
 * Hook event inputs (from Claude Code spec):
 *   WorktreeCreate: { session_id, cwd, hook_event_name, name }
 *   WorktreeRemove: { session_id, cwd, hook_event_name, worktree_path }
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');

/** Default root for worktrees (relative to project root) */
const DEFAULT_WORKTREE_ROOT = '.claude/worktrees';

/**
 * Handle WorktreeCreate event.
 *
 * Creates git worktree + aicodepath init file.
 * Prints the absolute path to stdout (required by spec).
 *
 * @param {Object} hookData - { name, cwd, session_id }
 */
function handleCreate(hookData) {
  const { name, cwd } = hookData;
  const projectRoot = findProjectRoot(cwd || process.cwd());

  const worktreeRoot = path.join(projectRoot, DEFAULT_WORKTREE_ROOT);
  if (!fs.existsSync(worktreeRoot)) {
    fs.mkdirSync(worktreeRoot, { recursive: true });
  }

  const worktreePath = path.join(worktreeRoot, name);
  const branchName = `wt-${name}`;

  try {
    // Create the git worktree
    execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch (err) {
    // Branch may already exist — try without -b
    try {
      execSync(`git worktree add "${worktreePath}"`, {
        cwd: projectRoot,
        stdio: 'pipe',
      });
    } catch (fallbackErr) {
      logger.info('WorktreeCreate failed', {
        context: 'worktree-lifecycle',
        name,
        error: fallbackErr.message,
      });
      process.exit(1);
    }
  }

  // Write worktree metadata for cleanup
  const metaFile = path.join(worktreePath, '.aicodepath-worktree');
  fs.writeFileSync(metaFile, JSON.stringify({
    name,
    sessionId: hookData.session_id || null,
    createdAt: new Date().toISOString(),
    projectRoot,
  }), 'utf-8');

  // Emit trace event
  emitTrace('worktree_created', { name, worktreePath, sessionId: hookData.session_id }, projectRoot);

  logger.info('Worktree created', { context: 'worktree-lifecycle', name, worktreePath });

  // REQUIRED: print absolute path to stdout
  process.stdout.write(worktreePath + '\n');
}

/**
 * Handle WorktreeRemove event.
 *
 * Cleans up aicodepath state for the removed worktree.
 * Non-blocking — failures are not fatal.
 *
 * @param {Object} hookData - { worktree_path, cwd, session_id }
 */
function handleRemove(hookData) {
  const { worktree_path: worktreePath, session_id: sessionId } = hookData;
  const projectRoot = findProjectRoot(hookData.cwd || process.cwd());

  if (!worktreePath) {
    logger.info('WorktreeRemove: no worktree_path in input', { context: 'worktree-lifecycle' });
    return;
  }

  // Read metadata if available
  let meta = {};
  try {
    const metaFile = path.join(worktreePath, '.aicodepath-worktree');
    if (fs.existsSync(metaFile)) {
      meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    }
  } catch (_) { /* non-fatal */ }

  // Read added_dirs from active-worktree.json before state is cleared
  let addedDirs = [];
  try {
    const stateFile = path.join(projectRoot, 'aicodepath-docs', 'state', 'active-worktree.json');
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      if (Array.isArray(state.added_dirs) && state.added_dirs.length > 0) {
        addedDirs = state.added_dirs;
      }
    }
  } catch (_) { /* non-fatal */ }

  // Clean up agent-inbox files for this session
  try {
    const inboxDir = path.join(projectRoot, 'aicodepath-docs', 'agent-inbox');
    if (fs.existsSync(inboxDir) && sessionId) {
      const inboxFiles = fs.readdirSync(inboxDir).filter((f) => f.endsWith('.jsonl'));
      for (const file of inboxFiles) {
        const filePath = path.join(inboxDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const filtered = content
          .split('\n')
          .filter((l) => {
            if (!l.trim()) return false;
            try {
              const entry = JSON.parse(l);
              return entry.sessionId !== sessionId;
            } catch (_) {
              return true;
            }
          })
          .join('\n');
        if (filtered !== content) {
          fs.writeFileSync(filePath, filtered + '\n', 'utf-8');
        }
      }
    }
  } catch (inboxErr) {
    logger.info('Worktree agent-inbox cleanup failed (non-fatal)', {
      context: 'worktree-lifecycle',
      error: inboxErr.message,
    });
  }

  // Emit trace event
  emitTrace('worktree_removed', {
    name: meta.name || path.basename(worktreePath),
    worktreePath,
    sessionId,
    createdAt: meta.createdAt || null,
  }, projectRoot);

  logger.info('Worktree removed', { context: 'worktree-lifecycle', worktreePath });

  // Warn about stale --add-dir paths registered for this worktree
  if (addedDirs.length > 0) {
    const dirList = addedDirs.map((d) => `  ${d}`).join('\n');
    const output = {
      systemMessage: [
        `⚠️  Worktree removed but ${addedDirs.length} additional director${addedDirs.length === 1 ? 'y was' : 'ies were'} registered via --add-dir for this session:`,
        dirList,
        'These paths no longer exist. Start your next Claude Code session WITHOUT the --add-dir flags above,',
        'or run: /remove-dir <path> for each one if your current session is still active.',
      ].join('\n'),
    };
    process.stdout.write(JSON.stringify(output) + '\n');
  }
}

/**
 * Emit a trace entry for worktree lifecycle events.
 *
 * @param {string} operation - 'worktree_created' | 'worktree_removed'
 * @param {Object} data      - Event data
 * @param {string} projectRoot
 */
function emitTrace(operation, data, projectRoot) {
  try {
    const traceLogger = require('../lib/agent-trace-logger');
    traceLogger.trace({
      operation: 'hook_fired',
      agent: `worktree-lifecycle:${operation}`,
      sessionId: data.sessionId,
      input: { name: data.name, worktreePath: data.worktreePath },
      success: true,
    }, projectRoot);
  } catch (_) { /* non-fatal — agent-trace-logger may not be available */ }

  // Also emit to session-broadcast
  try {
    const broadcast = require('../lib/session-broadcast');
    broadcast.emit({
      type: operation,
      sessionId: data.sessionId,
      data: { name: data.name, worktreePath: data.worktreePath },
    });
  } catch (_) { /* non-fatal */ }
}

// Main — read stdin and dispatch
if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    let hookData = {};
    try {
      hookData = JSON.parse(raw || '{}');
    } catch (_) {
      logger.info('worktree-lifecycle: invalid JSON input', { context: 'worktree-lifecycle' });
      process.exit(0);
    }

    const event = hookData.hook_event_name;

    if (event === 'WorktreeCreate') {
      handleCreate(hookData);
    } else if (event === 'WorktreeRemove') {
      handleRemove(hookData);
      process.exit(0);
    } else {
      logger.info(`worktree-lifecycle: unrecognised event "${event}"`, { context: 'worktree-lifecycle' });
      process.exit(0);
    }
  });
}

module.exports = { handleCreate, handleRemove };
