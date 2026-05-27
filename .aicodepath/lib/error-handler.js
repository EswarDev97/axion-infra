/**
 * AICodePath Error Handler
 * Provides consistent error handling for hooks and CLI commands
 */

const { AICodePathError, HookExecutionError } = require('./errors');
const logger = require('./logger');

/**
 * Error handler utility for consistent error processing
 */
class ErrorHandler {
  /**
   * Handle errors in hooks (non-blocking by default)
   * Hooks should never crash - they should return { proceed: true } with error info
   * @param {Error} error - The error that occurred
   * @param {string} hookName - Name of the hook that failed
   * @returns {Object} Hook response with error information
   */
  static handleHookError(error, hookName) {
    // Log the error for debugging
    logger.error(`[${hookName}] Error: ${error.message}`, {
      hookName,
      errorCode: error.code || 'UNKNOWN_ERROR',
      stack: process.env.DEBUG ? error.stack : undefined
    });

    // Return non-blocking response using valid Claude Code hook output fields
    return {
      decision: 'allow',
      reason: `[${hookName}] Error (non-blocking): ${error.message}`,
      systemMessage: this._formatHookErrorMessage(error, hookName)
    };
  }

  /**
   * Handle errors in CLI commands (blocking - exits process)
   * CLI commands should exit with appropriate exit codes
   * @param {Error} error - The error that occurred
   * @param {string} command - Name of the command that failed
   */
  static handleCLIError(error, command = 'unknown') {
    if (error instanceof AICodePathError) {
      // Operational error - clean error message
      logger.error(`Error in ${command}`, {
        command,
        message: error.message,
        code: error.code
      });

      // Show additional details if available
      if (error.getDetails && typeof error.getDetails === 'function') {
        const details = error.getDetails();
        if (details !== error.message) {
          logger.error(`Details: ${details}`, { command });
        }
      }

      if (error.violations && error.getViolationSummary) {
        logger.error(`Violations: ${error.getViolationSummary()}`, { command });
      }

      process.exit(1); // Operational error
    } else {
      // Unexpected error - show full details
      logger.error(`Unexpected error in ${command}`, {
        command,
        message: error.message,
        stack: error.stack
      });

      process.exit(2); // Programming error
    }
  }

  /**
   * Wrap a hook function with error handling
   * Returns a new async function that catches and handles all errors
   * @param {string} hookName - Name of the hook
   * @param {Function} asyncFn - The async hook function to wrap
   * @returns {Function} Wrapped hook function
   */
  static wrapHook(hookName, asyncFn) {
    return async function wrappedHook(...args) {
      try {
        return await asyncFn(...args);
      } catch (error) {
        return ErrorHandler.handleHookError(error, hookName);
      }
    };
  }

  /**
   * Wrap a CLI command function with error handling
   * Returns a new async function that catches and handles all errors
   * @param {string} commandName - Name of the command
   * @param {Function} asyncFn - The async command function to wrap
   * @returns {Function} Wrapped command function
   */
  static wrapCLICommand(commandName, asyncFn) {
    return async function wrappedCommand(...args) {
      try {
        await asyncFn(...args);
      } catch (error) {
        ErrorHandler.handleCLIError(error, commandName);
      }
    };
  }

  /**
   * Format error message for hook failures
   * @private
   * @param {Error} error - The error
   * @param {string} hookName - Hook name
   * @returns {string} Formatted message
   */
  static _formatHookErrorMessage(error, hookName) {
    let message = `⚠️  ${hookName} encountered an error but workflow continues\n`;
    message += `\nError: ${error.message}\n`;

    if (error.code) {
      message += `Code: ${error.code}\n`;
    }

    if (error instanceof AICodePathError) {
      message += `\nThis is an operational error that has been logged.\n`;
      message += `The workflow will continue, but you may want to check the logs.\n`;
    } else {
      message += `\nThis is an unexpected error. Consider reporting it if it persists.\n`;
    }

    return message;
  }

  /**
   * Create a safe async wrapper that never throws
   * Useful for fire-and-forget operations
   * @param {Function} asyncFn - Async function to wrap
   * @param {string} context - Context for logging
   * @returns {Function} Safe wrapped function
   */
  static safeAsync(asyncFn, context = 'operation') {
    return async function safeAsyncWrapper(...args) {
      try {
        return await asyncFn(...args);
      } catch (error) {
        logger.warn(`${context} failed but continuing`, {
          context,
          error: error.message
        });
        return null;
      }
    };
  }
}

module.exports = ErrorHandler;
