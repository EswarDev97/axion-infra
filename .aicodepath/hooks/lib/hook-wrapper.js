#!/usr/bin/env node
/**
 * Hook Wrapper for Claude Code Compliance
 *
 * Provides a standardized stdin/stdout wrapper that converts existing
 * hook implementations to the Claude Code hook protocol:
 *
 * 1. Redirects all stdout to stderr (prevents logger/console pollution)
 * 2. Reads JSON context from stdin
 * 3. Calls the hook implementation function
 * 4. Writes ONLY JSON result to stdout (restored for final output)
 * 5. Exits with appropriate code (0=success, 1=warning, 2=block)
 *
 * Usage in hooks:
 *   const { wrapHook } = require('./lib/hook-wrapper');
 *   module.exports = { hook: hookImpl };
 *   if (require.main === module) wrapHook(hookImpl, { name: 'my-hook' });
 *
 * @module hooks/lib/hook-wrapper
 */

const { EXIT_CODES } = require('./exit-codes');

/**
 * Read all data from stdin as a string
 * @returns {Promise<string>} Stdin content
 */
function readStdin() {
  return new Promise((resolve) => {
    // If stdin is a TTY (no piped input), resolve immediately with empty object
    if (process.stdin.isTTY) {
      resolve('{}');
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data || '{}'));

    // Safety timeout - if no data arrives within 1 second, proceed with empty
    setTimeout(() => {
      if (!data) {
        resolve('{}');
        process.stdin.destroy();
      }
    }, 1000);
  });
}

/**
 * Parse stdin JSON safely
 * @param {string} raw - Raw stdin string
 * @returns {Object} Parsed JSON or empty object
 */
function parseStdinJson(raw) {
  try {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '') return {};
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

/**
 * Convert hook result to Claude Code stdout JSON format
 * @param {Object} result - Hook implementation result
 * @param {string} hookEventName - The hook event name from stdin context (e.g. "PostToolUse")
 * @returns {Object} Claude Code compliant output
 */
function formatOutput(result, hookEventName) {
  if (!result || typeof result !== 'object') {
    return {};
  }

  const output = {};

  // Map hook result fields to Claude Code spec fields
  if (result.message) {
    output.systemMessage = result.message;
  }

  if (result.proceed === false || result.blocking === true) {
    output.decision = 'block';
    output.reason = result.message || result.error?.message || 'Hook blocked the operation';
  }

  if (result.suppress || result.suppressOutput) {
    output.suppressOutput = true;
  }

  // Pass through any Claude Code spec fields directly.
  // Only forward decision: 'block' — 'allow' is not a valid hook output field
  // for any event type (allow is implied by exit 0; see spec section 1.5).
  if (result.decision === 'block') output.decision = result.decision;
  if (result.reason) output.reason = result.reason;
  if (result.continue !== undefined) output.continue = result.continue;
  if (result.stopReason) output.stopReason = result.stopReason;
  if (result.hookSpecificOutput) {
    // Per spec, hookSpecificOutput requires hookEventName — inject it from context if missing
    const specific = Object.assign({}, result.hookSpecificOutput);
    if (!specific.hookEventName && hookEventName) {
      specific.hookEventName = hookEventName;
    }
    output.hookSpecificOutput = specific;
  }
  if (result.appendToSystemPrompt) output.appendToSystemPrompt = result.appendToSystemPrompt;

  return output;
}

/**
 * Determine exit code from hook result
 * @param {Object} result - Hook implementation result
 * @returns {number} Exit code (0, 1, or 2)
 */
function getExitCode(result) {
  if (!result) return EXIT_CODES.SUCCESS;

  // Explicit blocking
  if (result.blocking === true || result.critical === true) {
    return EXIT_CODES.BLOCK;
  }
  if (result.decision === 'block') {
    return EXIT_CODES.BLOCK;
  }

  // Explicit warning
  if (result.success === false && !result.blocking) {
    return EXIT_CODES.WARNING;
  }
  if (result.warnings && result.warnings.length > 0 && result.success !== true) {
    return EXIT_CODES.WARNING;
  }

  return EXIT_CODES.SUCCESS;
}

/**
 * Redirect stdout to stderr so logger/console output doesn't pollute JSON output.
 * Returns a function to restore original stdout.
 * @returns {Function} Restore function
 */
function redirectStdout() {
  const originalWrite = process.stdout.write.bind(process.stdout);
  // Redirect all stdout writes to stderr during hook execution
  process.stdout.write = function(chunk, encoding, callback) {
    return process.stderr.write(chunk, encoding, callback);
  };
  return () => {
    process.stdout.write = originalWrite;
  };
}

/**
 * Wrap a hook implementation for Claude Code stdin/stdout protocol
 *
 * @param {Function} hookImpl - Async hook implementation function
 * @param {Object} options - Wrapper options
 * @param {string} options.name - Hook name for error messages
 */
function wrapHook(hookImpl, options = {}) {
  const hookName = options.name || 'unknown-hook';

  // Redirect stdout immediately to prevent logger output pollution
  const restoreStdout = redirectStdout();

  (async () => {
    try {
      // 1. Read and parse stdin
      const rawInput = await readStdin();
      const context = parseStdinJson(rawInput);

      // 2. Execute hook implementation (all console/logger output goes to stderr)
      const result = await hookImpl(context);

      // 3. Restore stdout and write ONLY JSON output
      restoreStdout();

      const output = formatOutput(result, context.hook_event_name);
      // Always write JSON to stdout — Claude Code parses stdout as JSON and
      // an empty response (zero bytes) causes a SyntaxError "hook error".
      process.stdout.write(JSON.stringify(output) + '\n');

      // 4. Exit with appropriate code
      const exitCode = getExitCode(result);
      process.exit(exitCode);
    } catch (error) {
      // Restore stdout before writing error
      restoreStdout();

      // Check if error is a blocking validation error (e.g. from pre-commit-validator)
      if (error.blocking || error.name === 'ValidationError') {
        const output = { decision: 'block', reason: error.message };
        process.stdout.write(JSON.stringify(output) + '\n');
        process.exit(EXIT_CODES.BLOCK);
      }

      // All other errors are warnings (non-blocking)
      process.stderr.write(`[${hookName}] Error: ${error.message}\n`);
      process.exit(EXIT_CODES.WARNING);
    }
  })();
}

module.exports = {
  wrapHook,
  readStdin,
  parseStdinJson,
  formatOutput,
  getExitCode,
};
