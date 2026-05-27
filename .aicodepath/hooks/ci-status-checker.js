#!/usr/bin/env node
/**
 * AICodePath CI Status Checker Hook
 *
 * PostToolUse Bash hook that monitors GitHub Actions CI status
 * after git push or git commit commands. Runs asynchronously — returns
 * proceed:true immediately and checks CI status in the background.
 *
 * When a push is detected:
 *   1. Returns immediately (non-blocking)
 *   2. Asynchronously polls `gh run list` to get the triggered run
 *   3. If run fails: logs failure details
 *   4. If run passes: logs success
 *
 * Requires `gh` CLI to be authenticated.
 * Opt-in: disabled by default, enabled via config.json feature flag.
 *
 * @module hooks/ci-status-checker
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');
const ErrorHandler = require('../lib/error-handler');

/** Regex to detect git push commands (not force-push — that's blocked by R06) */
const GIT_PUSH_PATTERN = /\bgit\s+push\b(?!\s+.*(?:--force|-f\b))/;

/** Regex to detect git commit commands */
const GIT_COMMIT_PATTERN = /\bgit\s+commit\b/;

/** Polling config */
const POLL_DELAY_MS = 15000;  // 15s before first check (CI takes a moment to start)
const POLL_TIMEOUT_MS = 120000; // 2 min max wait
const POLL_INTERVAL_MS = 10000; // Check every 10s

/**
 * Check if ci_status_checker feature flag is enabled.
 *
 * @param {string} projectRoot
 * @returns {boolean}
 */
function isEnabled(projectRoot) {
  const configPath = path.join(projectRoot, '.aicodepath', 'config.json');
  if (!fs.existsSync(configPath)) return false;

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config?.features?.flags?.ci_status_checker === true;
  } catch (_) {
    return false;
  }
}

/**
 * Check if gh CLI is available and authenticated.
 *
 * @param {string} projectRoot
 * @returns {Promise<boolean>}
 */
function isGhAvailable(projectRoot) {
  return new Promise((resolve) => {
    execFile('gh', ['auth', 'status'], { cwd: projectRoot, timeout: 5000 }, (err) => {
      resolve(!err);
    });
  });
}

/**
 * Get the most recent CI run for the current branch.
 *
 * @param {string} projectRoot
 * @returns {Promise<Object|null>} Run object or null
 */
function getLatestRun(projectRoot) {
  return new Promise((resolve) => {
    execFile(
      'gh', ['run', 'list', '--limit', '1', '--json', 'databaseId,status,conclusion,url,name,workflowName'],
      { cwd: projectRoot, timeout: 10000 },
      (err, stdout) => {
        if (err || !stdout) { resolve(null); return; }
        try {
          const runs = JSON.parse(stdout);
          resolve(runs[0] || null);
        } catch (_) {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Poll CI status asynchronously until completed or timeout.
 *
 * @param {string} projectRoot
 * @param {string} triggerType - 'push' or 'commit'
 */
async function pollCiStatus(projectRoot, triggerType) {
  // Wait before first check (CI takes time to start)
  await new Promise((r) => setTimeout(r, POLL_DELAY_MS));

  const startTime = Date.now();
  let lastRunId = null;

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const run = await getLatestRun(projectRoot);

    if (!run) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    // First time: record the run ID we're tracking
    if (!lastRunId) lastRunId = run.databaseId;

    // Only track the run that started after our trigger
    if (run.databaseId !== lastRunId) break;

    if (run.status === 'completed') {
      const icon = run.conclusion === 'success' ? '✅' : '❌';
      logger.info(`CI ${run.conclusion} after ${triggerType}`, {
        context: 'ci-status-checker',
        runId: run.databaseId,
        workflow: run.workflowName,
        conclusion: run.conclusion,
        url: run.url,
      });

      // For failures, log additional context
      if (run.conclusion === 'failure') {
        logger.info('CI failure details — run /aicodepath-ci-fixer to diagnose', {
          context: 'ci-status-checker',
          url: run.url,
          runId: run.databaseId,
        });
      }
      return;
    }

    // Still running — wait and retry
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  logger.info('CI status check timed out', {
    context: 'ci-status-checker',
    timeoutMs: POLL_TIMEOUT_MS,
    url: `Manually check: gh run list --limit 5`,
  });
}

/**
 * Check CI status after git push or commit (async, opt-in).
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result
 */
function checkCiStatus(hookData) {
  if (!hookData?.tool_name) return { proceed: true };
  if (hookData.tool_name !== 'Bash') return { proceed: true };

  const command = hookData.tool_input?.command || '';
  const isPush = GIT_PUSH_PATTERN.test(command);
  const isCommit = GIT_COMMIT_PATTERN.test(command);

  if (!isPush && !isCommit) return { proceed: true };

  const root = findProjectRoot(process.cwd());

  // Check feature flag (async-safe — synchronous check)
  if (!isEnabled(root)) return { proceed: true };

  const triggerType = isPush ? 'push' : 'commit';

  // Check gh availability and start polling — fully async
  isGhAvailable(root).then((available) => {
    if (!available) {
      logger.info('gh CLI not available — skipping CI status check', {
        context: 'ci-status-checker',
      });
      return;
    }

    if (isPush) {
      logger.info('CI status check triggered after push', { context: 'ci-status-checker' });
      pollCiStatus(root, triggerType).catch((err) => {
        logger.info('CI status polling error', { context: 'ci-status-checker', error: err.message });
      });
    }
  });

  // Return immediately — do not block
  if (isPush) {
    return {
      proceed: true,
      hookSpecificOutput: {
        additionalContext: '🔍 CI status check triggered (background) — will log result when run completes.',
      },
    };
  }

  return { proceed: true };
}

module.exports = {
  hook: ErrorHandler.wrapHook('ci-status-checker', checkCiStatus),
  checkCiStatus,
  isEnabled,
  GIT_PUSH_PATTERN,
  GIT_COMMIT_PATTERN,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(checkCiStatus, { name: 'ci-status-checker' });
}
