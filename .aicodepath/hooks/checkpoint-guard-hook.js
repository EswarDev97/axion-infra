#!/usr/bin/env node
/**
 * checkpoint-guard-hook.js — PreToolUse Write hook
 *
 * Blocks checkpoint writes when uncommitted changes exist in the active worktree.
 * Defense-in-depth: the checkpoint skill also has a pre-condition check,
 * but this hook enforces it at the tool level.
 *
 * Exit codes: 0 = allow, 2 = block
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lazy-load path-resolver (may not be available in test context)
let pathResolver;
try {
  pathResolver = require('./lib/path-resolver');
} catch {
  try {
    pathResolver = require('../lib/path-resolver');
  } catch {
    pathResolver = null;
  }
}

// Lazy-load logger
let logger;
try {
  logger = require('./lib/logger');
} catch {
  try {
    logger = require('../lib/logger');
  } catch {
    logger = { info: () => {}, warn: () => {}, error: () => {} };
  }
}

/**
 * Evaluate whether a checkpoint write should be allowed.
 *
 * @param {Object} hookData - PreToolUse hook input (tool_name, tool_input)
 * @param {Object} [overrides] - Test overrides for git status and paths
 * @param {string} [overrides.gitStatusOutput] - Mock git status --porcelain output
 * @param {string|null} [overrides.worktreePath] - Mock worktree path (null = no active-worktree.json)
 * @param {string} [overrides.fallbackPath] - Mock fallback project root
 * @returns {Object} Hook result — empty for allow, { decision, reason } for block
 */
function evaluate(hookData, overrides = {}) {
  if (!hookData || !hookData.tool_input || !hookData.tool_input.file_path) {
    return {};
  }

  const filePath = hookData.tool_input.file_path;

  // Only guard checkpoint writes
  if (!filePath.includes('checkpoints/')) {
    return {};
  }

  // Determine worktree path
  let worktreePath;
  if (overrides.worktreePath !== undefined) {
    // Test override
    worktreePath = overrides.worktreePath;
  } else {
    worktreePath = getWorktreePath();
  }

  // Fallback to project root if no active worktree
  if (!worktreePath) {
    if (overrides.fallbackPath) {
      worktreePath = overrides.fallbackPath;
    } else if (pathResolver) {
      try {
        worktreePath = pathResolver.findProjectRoot();
      } catch {
        return {}; // Can't determine project root — fail-open
      }
    } else {
      return {}; // pathResolver unavailable — fail-open
    }
  }

  // Get git status
  let statusOutput;
  if (overrides.gitStatusOutput !== undefined) {
    statusOutput = overrides.gitStatusOutput;
  } else {
    statusOutput = getGitStatus(worktreePath);
  }

  // If clean, allow
  if (!statusOutput || statusOutput.trim() === '') {
    return {};
  }

  // Count uncommitted files
  const lines = statusOutput.trim().split('\n').filter(l => l.trim().length > 0);
  const fileCount = lines.length;

  // Determine branch name
  let branch = 'unknown';
  try {
    if (!overrides.gitStatusOutput) {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: worktreePath,
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
    }
  } catch {
    // Keep 'unknown'
  }

  return {
    decision: 'block',
    reason: `Cannot checkpoint — ${fileCount} uncommitted file${fileCount !== 1 ? 's' : ''} in ${branch}. Run /aicodepath-commit first.`,
  };
}

/**
 * Read active-worktree.json to get worktree path.
 */
function getWorktreePath() {
  try {
    const root = pathResolver ? pathResolver.findProjectRoot() : null;
    if (!root) return null;
    const stateDir = path.join(root, 'aicodepath-docs', 'state');
    const worktreeFile = path.join(stateDir, 'active-worktree.json');

    if (fs.existsSync(worktreeFile)) {
      const data = JSON.parse(fs.readFileSync(worktreeFile, 'utf-8'));
      return data.worktree_path || null;
    }
  } catch (err) {
    logger.warn('Failed to read active-worktree.json', { context: 'checkpoint-guard', error: err.message });
  }
  return null;
}

/**
 * Run git status --porcelain in the given directory.
 */
function getGitStatus(cwd) {
  try {
    return execSync('git status --porcelain', {
      cwd,
      encoding: 'utf-8',
      timeout: 10000,
    });
  } catch (err) {
    logger.warn('git status failed', { context: 'checkpoint-guard', error: err.message });
    return '';
  }
}

/**
 * Main hook entry point — reads stdin, evaluates, writes stdout.
 */
async function main() {
  let input = '';
  const stdinTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('stdin timeout')), 5000)
  );
  try {
    await Promise.race([
      (async () => { for await (const chunk of process.stdin) input += chunk; })(),
      stdinTimeout,
    ]);
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    // Invalid input — pass through
    process.stdout.write('{}');
    process.exit(0);
  }

  const result = evaluate(hookData);

  process.stdout.write(JSON.stringify(result));
  process.exit(result.decision === 'block' ? 2 : 0);
}

// Export for testing
module.exports = { evaluate };

// Run as hook when executed directly
if (require.main === module) {
  main().catch(() => {
    process.stdout.write('{}');
    process.exit(0);
  });
}
