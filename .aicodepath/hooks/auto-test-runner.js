#!/usr/bin/env node
/**
 * AICodePath Auto Test Runner Hook
 *
 * PostToolUse Write|Edit hook that auto-runs tests after source file changes.
 * OPT-IN ONLY — disabled by default. Enable via feature flag:
 *   config.json: { "features": { "flags": { "auto_test_runner": true } } }
 *
 * Behavior:
 *   - Fires on Write/Edit to source files (not docs, not configs, not migrations)
 *   - Detects test framework from package.json (npm test / pytest / go test)
 *   - Runs tests asynchronously (non-blocking — returns proceed:true immediately)
 *   - Logs test results via logger; surfaces failures in additionalContext
 *
 * Non-blocking by design — test failures are advisory, not blocking.
 *
 * @module hooks/auto-test-runner
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');
const ErrorHandler = require('../lib/error-handler');

/** Files that should NOT trigger test runs */
const SKIP_PATTERN = /(?:node_modules[\\/]|dist[\\/]|build[\\/]|\.git[\\/]|coverage[\\/]|aicodepath-docs[\\/]|\.aicodepath[\\/]|\.md$|\.json$|\.yaml$|\.yml$|\.sql$|\.css$|\.scss$|SKILL\.md$|CLAUDE\.md$)/i;

/** Test file pattern — test writes also trigger a run */
const TEST_FILE_PATTERN = /(?:\.(test|spec)\.(js|ts|jsx|tsx|mjs)$|__tests__[\\/]|test_.*\.py$|_test\.go$)/i;

/** Timeout for test runs (ms) — keeps hooks from hanging */
const TEST_TIMEOUT_MS = 30000;

/**
 * Detect the test command for a project.
 * Checks package.json scripts.test, then falls back to known conventions.
 *
 * @param {string} projectRoot
 * @returns {{ cmd: string, args: string[] }|null}
 */
function detectTestCommand(projectRoot) {
  // Check package.json scripts.test
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts && pkg.scripts.test) {
        // Run via npm test
        return { cmd: 'npm', args: ['test', '--silent'] };
      }
    } catch (_) { /* ignore parse errors */ }
  }

  // Python: check for pytest or unittest
  const pyTestPath = path.join(projectRoot, 'pytest.ini');
  const setupCfgPath = path.join(projectRoot, 'setup.cfg');
  if (fs.existsSync(pyTestPath) || fs.existsSync(setupCfgPath)) {
    const { findPython } = require('../lib/platform-utils');
    return { cmd: findPython(), args: ['-m', 'pytest', '--tb=short', '-q'] };
  }

  // Go: check for go.mod
  const goModPath = path.join(projectRoot, 'go.mod');
  if (fs.existsSync(goModPath)) {
    return { cmd: 'go', args: ['test', './...', '-count=1'] };
  }

  return null;
}

/**
 * Check if auto_test_runner feature flag is enabled.
 *
 * @param {string} projectRoot
 * @returns {boolean}
 */
function isEnabled(projectRoot) {
  const configPath = path.join(projectRoot, '.aicodepath', 'config.json');
  if (!fs.existsSync(configPath)) return false;

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config?.features?.flags?.auto_test_runner === true;
  } catch (_) {
    return false;
  }
}

/**
 * Run tests asynchronously without blocking the hook return.
 *
 * @param {string} projectRoot
 * @param {{ cmd: string, args: string[] }} testCmd
 */
function runTestsAsync(projectRoot, testCmd) {
  const child = execFile(
    testCmd.cmd,
    testCmd.args,
    { cwd: projectRoot, timeout: TEST_TIMEOUT_MS },
    (error, stdout, stderr) => {
      if (error) {
        logger.info('Auto test run failed', {
          context: 'auto-test-runner',
          exitCode: error.code,
          signal: error.signal,
          stderr: stderr ? stderr.substring(0, 500) : '',
        });
      } else {
        logger.info('Auto test run passed', {
          context: 'auto-test-runner',
          cmd: `${testCmd.cmd} ${testCmd.args.join(' ')}`,
        });
      }
    }
  );

  // Detach so hook doesn't wait
  if (child.unref) child.unref();
}

/**
 * Auto-run tests after source file changes (opt-in feature).
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result
 */
function autoRunTests(hookData) {
  if (!hookData?.tool_name) return { proceed: true };

  const toolName = hookData.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') return { proceed: true };

  const filePath = hookData.tool_input?.file_path || '';
  if (!filePath) return { proceed: true };

  // Skip non-source files
  if (SKIP_PATTERN.test(filePath)) return { proceed: true };

  // Must be a source file or test file
  const isSource = /\.(js|ts|jsx|tsx|mjs|cjs|py|go|rb|java|cs|rs)$/.test(filePath);
  if (!isSource) return { proceed: true };

  const root = findProjectRoot(process.cwd());

  // Check feature flag
  if (!isEnabled(root)) {
    return { proceed: true };
  }

  const testCmd = detectTestCommand(root);
  if (!testCmd) {
    logger.info('No test command detected — skipping auto-test-runner', {
      context: 'auto-test-runner',
      projectRoot: root,
    });
    return { proceed: true };
  }

  logger.info('Triggering auto test run', {
    context: 'auto-test-runner',
    file: path.basename(filePath),
    cmd: `${testCmd.cmd} ${testCmd.args.join(' ')}`,
  });

  // Run asynchronously — do not block hook response
  runTestsAsync(root, testCmd);

  return {
    proceed: true,
    hookSpecificOutput: {
      additionalContext: `🔄 Auto test runner triggered: \`${testCmd.cmd} ${testCmd.args.join(' ')}\` (running in background)`,
    },
  };
}

module.exports = {
  hook: ErrorHandler.wrapHook('auto-test-runner', autoRunTests),
  autoRunTests,
  detectTestCommand,
  isEnabled,
  SKIP_PATTERN,
  TEST_FILE_PATTERN,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(autoRunTests, { name: 'auto-test-runner' });
}
