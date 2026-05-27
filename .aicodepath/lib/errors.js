/**
 * AICodePath Error Hierarchy
 * Provides structured error types for consistent error handling across the system
 */

/**
 * Base error class for all AICodePath errors
 * Operational errors are expected and should be handled gracefully
 */
class AICodePathError extends Error {
  constructor(message, code = 'AICODEPATH_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - thrown when validation rules are violated
 */
class ValidationError extends AICodePathError {
  constructor(message, violations = []) {
    super(message, 'VALIDATION_ERROR');
    this.violations = violations;
  }

  /**
   * Get formatted violation summary
   * @returns {string} Summary of violations
   */
  getViolationSummary() {
    if (!this.violations || this.violations.length === 0) {
      return 'No specific violations recorded';
    }
    return this.violations.map(v => `  - ${v.rule || 'Unknown'}: ${v.message || v}`).join('\n');
  }
}

/**
 * Python bridge error - thrown when Python generator execution fails
 */
class PythonBridgeError extends AICodePathError {
  constructor(message, stderr = '') {
    super(message, 'PYTHON_BRIDGE_ERROR');
    this.stderr = stderr;
  }

  /**
   * Get Python error details
   * @returns {string} Formatted error with stderr
   */
  getDetails() {
    if (!this.stderr) {
      return this.message;
    }
    return `${this.message}\n\nPython stderr:\n${this.stderr}`;
  }
}

/**
 * Database error - thrown when database operations fail
 */
class DatabaseError extends AICodePathError {
  constructor(message, dbPath = null) {
    super(message, 'DATABASE_ERROR');
    this.dbPath = dbPath;
  }
}

/**
 * Hook execution error - thrown when hook execution fails
 */
class HookExecutionError extends AICodePathError {
  constructor(message, hookName, originalError = null) {
    super(message, 'HOOK_EXECUTION_ERROR');
    this.hookName = hookName;
    this.originalError = originalError;
  }
}

/**
 * Configuration error - thrown when configuration is invalid or missing
 */
class ConfigurationError extends AICodePathError {
  constructor(message, configPath = null) {
    super(message, 'CONFIGURATION_ERROR');
    this.configPath = configPath;
  }
}

/**
 * File system error - thrown when file operations fail
 */
class FileSystemError extends AICodePathError {
  constructor(message, filePath = null) {
    super(message, 'FILESYSTEM_ERROR');
    this.filePath = filePath;
  }
}

module.exports = {
  AICodePathError,
  ValidationError,
  PythonBridgeError,
  DatabaseError,
  HookExecutionError,
  ConfigurationError,
  FileSystemError
};
