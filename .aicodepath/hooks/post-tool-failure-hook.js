#!/usr/bin/env node
/**
 * Post Tool Failure Hook
 *
 * Handle tool execution failures for recovery or logging.
 * Called when a tool fails to execute properly.
 *
 * Input:
 *   - tool: string
 *   - params: object
 *   - error: { message: string, code: string, stack?: string }
 *   - attemptNumber: number
 *
 * Output:
 *   - retry: boolean (suggest retry)
 *   - modified_params: object (optional, modified params for retry)
 *   - log_level: 'error' | 'warn' | 'info'
 *
 * @module hooks/post-tool-failure-hook
 */

const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const { exitWithResult, exitSuccess, exitWarning, createResult } = require('./lib/exit-codes');
const wsEmitter = require('./lib/ws-emitter');
const logger = require('../lib/logger');

// Import ValidationRecorder if available
let ValidationRecorder = null;
try {
    ValidationRecorder = require('../lib/validation-recorder').ValidationRecorder;
} catch (e) {
    // ValidationRecorder not available - non-fatal
}

/**
 * Retryable error codes that may resolve on subsequent attempts
 */
const RETRYABLE_ERRORS = [
    'ENOENT',       // File not found - might be timing issue
    'EBUSY',        // Resource busy
    'ETIMEDOUT',    // Timeout
    'ECONNRESET',   // Connection reset
    'ECONNREFUSED', // Connection refused
    'EAGAIN',       // Resource temporarily unavailable
    'ENOTCONN',     // Not connected
    'EPERM',        // Operation not permitted (sometimes transient)
];

/**
 * Maximum retry attempts before giving up
 */
const MAX_RETRIES = 3;

/**
 * Suggest fixes for common error patterns
 * @param {string} tool - Tool name
 * @param {Object} params - Tool parameters
 * @param {Object} error - Error details
 * @returns {Object|null} Suggested fixes
 */
function suggestFixes(tool, params, error) {
    const suggestions = [];

    // File not found errors
    if (error.code === 'ENOENT') {
        if (tool === 'Read') {
            suggestions.push('Consider using Glob to find the file first');
            suggestions.push('Check if the file path is correct');
        }
        if (tool === 'Edit') {
            suggestions.push('File does not exist - use Write instead to create it');
        }
    }

    // Permission errors
    if (error.message && error.message.includes('permission denied')) {
        if (tool === 'Bash') {
            suggestions.push('Check file permissions');
            suggestions.push('Consider if sudo is needed (requires approval)');
        }
        if (tool === 'Write' || tool === 'Edit') {
            suggestions.push('Check directory and file permissions');
            suggestions.push('Verify the path is writable');
        }
    }

    // Syntax errors
    if (error.message && (error.message.includes('SyntaxError') || error.message.includes('parse'))) {
        suggestions.push('Check for syntax errors in the content');
        suggestions.push('Validate JSON/YAML structure if applicable');
    }

    // Network errors
    if (['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
        suggestions.push('Check network connectivity');
        suggestions.push('Service might be temporarily unavailable');
    }

    return suggestions.length > 0 ? { suggestions } : null;
}

/**
 * Main hook implementation
 * @param {Object} hookData - Hook input data
 * @returns {Object} Failure handling result
 */
async function execute(hookData) {
    const { tool, params, error, attemptNumber = 1 } = hookData;
    const projectRoot = findProjectRoot(process.cwd());

    logger.error(`[ToolFailure] ${tool} failed (attempt ${attemptNumber}):`, error.message);

    // Record failure for analytics if ValidationRecorder is available
    if (ValidationRecorder) {
        try {
            const recorder = new ValidationRecorder(projectRoot);
            recorder.recordValidation({
                event: 'tool_failure',
                tool,
                params: JSON.stringify(params).substring(0, 500),
                error: error.message,
                errorCode: error.code,
                attempt: attemptNumber,
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            logger.debug('[ToolFailure] Could not record failure:', e.message);
        }
    }

    // Emit to dashboard
    wsEmitter.emitLog(`Tool ${tool} failed: ${error.message}`, {
        level: 'error',
        source: 'post-tool-failure',
    });

    // Determine if retry is worthwhile
    const isRetryable = RETRYABLE_ERRORS.includes(error.code);
    const shouldRetry = isRetryable && attemptNumber < MAX_RETRIES;

    // Get suggested fixes
    const fixes = suggestFixes(tool, params, error);

    const result = {
        retry: shouldRetry,
        modified_params: null,
        log_level: shouldRetry ? 'warn' : 'error',
        suggestions: fixes?.suggestions || [],
        attempt: attemptNumber,
        maxAttempts: MAX_RETRIES,
    };

    // Add retry delay suggestion
    if (shouldRetry) {
        result.retryDelayMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
        logger.info(`[ToolFailure] Suggesting retry in ${result.retryDelayMs}ms`);
    }

    // After 3+ failures on the same tool, escalate to semantic diagnosis
    if (attemptNumber >= 3) {
        result.systemMessage = `⚠️ ${tool} has failed ${attemptNumber} times. Invoke /aicodepath-debug for systematic root cause analysis, or use the \`aicodepath-error-recovery\` agent for deep semantic diagnosis beyond surface-level error messages.`;
        logger.warn(`[ToolFailure] Escalating to semantic diagnosis after ${attemptNumber} failures`);
    }

    return result;
}

// Export for Claude Code hooks system
module.exports = { execute };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'post-tool-failure-hook' });
}
