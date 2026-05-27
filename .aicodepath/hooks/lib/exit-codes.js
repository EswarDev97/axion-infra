/**
 * Exit Codes Utility for AICodePath Hooks
 *
 * Claude Code spec-compliant exit codes for hook scripts.
 * Use these exit codes to communicate hook results properly.
 *
 * Exit Code Specification:
 * | Code | Meaning | Claude Behavior |
 * |------|---------|-----------------|
 * | 0    | Success | Continue normally |
 * | 1    | Warning | Log warning, continue |
 * | 2    | Block   | Stop operation, show error |
 *
 * @module hooks/lib/exit-codes
 */

/**
 * Standard exit codes for Claude Code hooks
 */
const EXIT_CODES = {
    /** Operation succeeded - Claude continues normally */
    SUCCESS: 0,
    /** Warning condition - Claude logs warning and continues */
    WARNING: 1,
    /** Blocking error - Claude stops operation and shows error */
    BLOCK: 2,
};

/**
 * Exit based on a result object
 *
 * @param {Object} result - Result object from hook execution
 * @param {boolean} result.success - Whether operation succeeded
 * @param {boolean} [result.blocking] - Whether failure is blocking
 * @param {boolean} [result.critical] - Whether failure is critical (alias for blocking)
 */
function exitWithResult(result) {
    if (result.success) {
        process.exit(EXIT_CODES.SUCCESS);
    } else if (result.blocking || result.critical) {
        process.exit(EXIT_CODES.BLOCK);
    } else {
        process.exit(EXIT_CODES.WARNING);
    }
}

/**
 * Exit with success status
 *
 * @param {string} [message] - Optional success message to log
 */
function exitSuccess(message) {
    if (message) {
        console.log(`[SUCCESS] ${message}`);
    }
    process.exit(EXIT_CODES.SUCCESS);
}

/**
 * Exit with warning status
 *
 * @param {string} message - Warning message to display
 */
function exitWarning(message) {
    console.warn(`[WARNING] ${message}`);
    process.exit(EXIT_CODES.WARNING);
}

/**
 * Exit with blocking error status
 *
 * @param {string} message - Error message to display
 */
function exitBlock(message) {
    console.error(`[BLOCKED] ${message}`);
    process.exit(EXIT_CODES.BLOCK);
}

/**
 * Create a result object for hook return
 *
 * @param {Object} options - Result options
 * @param {boolean} options.success - Whether operation succeeded
 * @param {string} [options.message] - Optional message
 * @param {Array} [options.errors] - Array of error objects
 * @param {Array} [options.warnings] - Array of warning objects
 * @param {boolean} [options.blocking] - Whether any errors are blocking
 * @returns {Object} Structured result object
 */
function createResult({ success, message, errors = [], warnings = [], blocking = false }) {
    return {
        success,
        message,
        errors,
        warnings,
        blocking: blocking || errors.some(e => e.blocking),
    };
}

module.exports = {
    EXIT_CODES,
    exitWithResult,
    exitSuccess,
    exitWarning,
    exitBlock,
    createResult,
};
