#!/usr/bin/env node
/**
 * AICodePath Spec-Sync Validator Hook
 *
 * PreToolUse hook on Bash that intercepts `git push` commands and validates
 * that design docs / feature specs are up-to-date with code changes.
 *
 * Feature-flagged via `spec_sync` (default: true, blocking).
 *
 * Exit codes:
 *   0 = pass (no push detected, or specs are in sync)
 *   1 = warning (specs may be stale but not blocking)
 *   2 = block (specs are stale and flag is set to block)
 *
 * @module hooks/spec-sync-validator
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');

const CONTEXT = 'spec-sync-validator';

/**
 * Spec source locations to check (in priority order).
 * If any exist, we validate that they were updated alongside code changes.
 */
const SPEC_LOCATIONS = [
  '.specify/features',
  'aicodepath-docs/plans',
  'aicodepath-docs/reverse-engineering',
];

/**
 * File patterns that represent "code changes" (not docs/config).
 */
const CODE_FILE_PATTERNS = [
  /\.(js|ts|tsx|jsx|py|go|rs|java|kt|rb|c|cpp|h|hpp|cs|swift|php)$/,
];

/**
 * File patterns that represent "spec/doc changes".
 */
const SPEC_FILE_PATTERNS = [
  /\.specify\//,
  /aicodepath-docs\/plans\//,
  /aicodepath-docs\/reverse-engineering\//,
  /docs\/requirements\//,
  /-design\.md$/,
  /-spec\.md$/,
];

/**
 * Check if a file path is a code file.
 */
function isCodeFile(filePath) {
  return CODE_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Check if a file path is a spec/doc file.
 */
function isSpecFile(filePath) {
  return SPEC_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Check if the command is a git push.
 *
 * Strips top-level shell-quoted strings before checking, so that "git push"
 * appearing inside a commit message (-m "...git push..."), a node -e script,
 * or test data arrays does NOT trigger a false positive.
 *
 * Only the unquoted, shell-visible portions of the command are checked.
 * A real `git push` command must appear at a command boundary (start of
 * command, or after &&, ||, ;, or newline).
 */
function isGitPush(command) {
  // Walk the command string character-by-character, tracking quote depth.
  // Collect only characters that are NOT inside quotes.
  let unquoted = '';
  let i = 0;
  let inDouble = false;
  let inSingle = false;

  while (i < command.length) {
    const ch = command[i];

    // Backslash escape inside double-quoted string: skip both chars
    if (inDouble && ch === '\\' && i + 1 < command.length) {
      i += 2;
      continue;
    }

    if (!inSingle && ch === '"') { inDouble = !inDouble; i++; continue; }
    if (!inDouble && ch === "'") { inSingle = !inSingle; i++; continue; }

    if (!inDouble && !inSingle) {
      unquoted += ch;
    }
    i++;
  }

  // Check whether any top-level sub-command starts with "git push"
  return unquoted
    .split(/&&|\|\||[;|\n]/)
    .some(part => /^\s*git\s+push\b/.test(part));
}

/**
 * Get files changed since the remote tracking branch.
 */
function getChangedFiles(projectPath) {
  try {
    // Get the upstream branch
    const upstream = execSync('git rev-parse --abbrev-ref @{upstream}', {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Get changed files between upstream and HEAD
    const output = execSync(`git diff --name-only ${upstream}..HEAD`, {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return output.trim().split('\n').filter(f => f.length > 0);
  } catch (e) {
    // No upstream or other git error — fall back to last commit
    try {
      const output = execSync('git diff --name-only HEAD~1..HEAD', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch (e2) {
      logger.warn('Could not determine changed files', { error: e2.message, context: CONTEXT });
      return [];
    }
  }
}

/**
 * Check if any spec locations exist in the project.
 */
function hasSpecsInProject(projectPath) {
  return SPEC_LOCATIONS.some(loc => {
    const fullPath = path.join(projectPath, loc);
    return fs.existsSync(fullPath);
  });
}

/**
 * Load feature flag configuration.
 * Returns { enabled: boolean, mode: 'block' | 'warn' }
 */
function loadConfig(projectPath) {
  const configPath = path.join(projectPath, '.aicodepath', 'config.json');

  // Default: enabled, blocking mode
  let config = { enabled: true, mode: 'block' };

  try {
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const flags = raw.features?.flags || {};

      if (flags.spec_sync === false) {
        config.enabled = false;
      }

      // Allow mode override via config
      if (raw.features?.spec_sync_mode === 'warn') {
        config.mode = 'warn';
      }
    }
  } catch (e) {
    logger.warn('Could not load config for spec-sync', { error: e.message, context: CONTEXT });
  }

  // Environment variable override
  if (process.env.AICODEPATH_SPEC_SYNC_DISABLED === 'true' || process.env.AICODEPATH_SPEC_SYNC_DISABLED === '1') {
    config.enabled = false;
  }

  return config;
}

/**
 * Main execution function.
 */
/**
 * Result object returned by execute().
 * @typedef {{ output: string, exitCode: number }} HookResult
 */

/**
 * Build an allow result (exit 0, empty JSON — Claude proceeds normally).
 * @returns {HookResult}
 */
function allow() {
  return { output: '{}', exitCode: 0 };
}

/**
 * Build a deny result (exit 2, stderr message — Claude blocks the operation).
 * Per spec, PreToolUse exit 2 = blocking error; stderr shown as error; JSON not parsed.
 * @param {string} stderrMessage
 * @returns {HookResult}
 */
function deny(stderrMessage) {
  return { output: stderrMessage, exitCode: 2, isBlock: true };
}

/**
 * Build a warn result (exit 0, additionalContext injected into Claude's context).
 * @param {string} message
 * @returns {HookResult}
 */
function warn(message) {
  return {
    output: JSON.stringify({ hookSpecificOutput: { additionalContext: `[WARNING] ${message}` } }),
    exitCode: 0,
  };
}

function execute(hookData) {
  try {
    const toolName = hookData?.tool_name;
    const toolInput = hookData?.tool_input;

    // Only process Bash tool calls
    if (toolName !== 'Bash') {
      return allow();
    }

    const command = toolInput?.command || '';

    // Only intercept git push
    if (!isGitPush(command)) {
      return allow();
    }

    const projectPath = findProjectRoot(process.cwd());
    const config = loadConfig(projectPath);

    // Feature flag check
    if (!config.enabled) {
      return allow();
    }

    // Skip if no specs exist in project
    if (!hasSpecsInProject(projectPath)) {
      return allow();
    }

    // Get changed files
    const changedFiles = getChangedFiles(projectPath);

    if (changedFiles.length === 0) {
      return allow();
    }

    // Categorize changes
    const codeChanges = changedFiles.filter(isCodeFile);
    const specChanges = changedFiles.filter(isSpecFile);

    // If no code changes, allow push
    if (codeChanges.length === 0) {
      return allow();
    }

    // If code changed but no specs updated, flag it
    if (specChanges.length === 0) {
      const message = [
        `[SPEC-SYNC] Code changed in ${codeChanges.length} file(s) but no specs were updated.`,
        '',
        'Changed code files:',
        ...codeChanges.slice(0, 10).map(f => `  - ${f}`),
        codeChanges.length > 10 ? `  ... and ${codeChanges.length - 10} more` : '',
        '',
        'Spec locations checked:',
        ...SPEC_LOCATIONS.map(loc => `  - ${loc}/`),
        '',
        'To fix: Update the relevant spec or design doc to match your code changes.',
        'To skip: Set spec_sync=false in .aicodepath/config.json features.flags',
      ].filter(Boolean).join('\n');

      if (config.mode === 'block') {
        return deny(message);
      } else {
        return warn(message);
      }
    }

    // Both code and specs changed — allow
    return allow();

  } catch (error) {
    // Fail open — don't block push on hook errors
    logger.warn('spec-sync-validator error — failing open', { error: error.message, context: CONTEXT });
    return allow();
  }
}

/**
 * Main entry point — read from stdin and execute.
 */
async function main() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString('utf8');
    const hookData = JSON.parse(input);

    const result = execute(hookData);

    if (result.isBlock) {
      // Exit 2 = blocking error; spec says stderr is shown as error, JSON not parsed
      process.stderr.write(result.output + '\n');
      process.exit(2);
    } else {
      process.stdout.write(result.output);
      process.exit(result.exitCode);
    }

  } catch (error) {
    // Fail open on parse/IO errors
    logger.warn('spec-sync-validator main error — failing open', { error: error.message, context: CONTEXT });
    process.stdout.write('{}');
    process.exit(0);
  }
}

main();

module.exports = { execute, isGitPush, isCodeFile, isSpecFile, getChangedFiles, hasSpecsInProject };
