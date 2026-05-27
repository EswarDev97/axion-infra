/**
 * Hook Context - Unified Service Facade for AICodePath Hooks
 *
 * Provides a single entry point for all common hook services:
 * - Database access
 * - Logging
 * - Storage
 * - Session state
 * - Result helpers
 *
 * Design:
 * - Lazy initialization of DB and storage (only created when accessed)
 * - Logger child scoped to hook name
 * - Consistent result formatting
 *
 * Date: 2026-02-05
 * Version: 1.0.0
 */

const Database = require('better-sqlite3');
const pathResolver = require('./path-resolver');
const logger = require('./logger');
const SessionStateManager = require('./session-state-manager');
const ValidationStorageFactory = require('./validation-storage-factory');

/**
 * HookContext - Service facade for hooks
 *
 * Provides unified access to common hook services with lazy initialization
 * for expensive resources (database, storage).
 */
class HookContext {
  /**
   * Create a new HookContext
   *
   * @param {string} hookName - Name of the hook (for logging)
   * @param {Object} params - Hook input parameters
   */
  constructor(hookName, params = {}) {
    this.hookName = hookName;
    this.params = params;

    // Lazy initialization fields
    this._logger = null;
    this._db = null;
    this._storage = null;
    this._sessionManager = null;
  }

  // ============================================================================
  // Database Access
  // ============================================================================

  /**
   * Get database path
   *
   * Delegates to path-resolver for consistent path resolution.
   *
   * @returns {string} Absolute path to database file
   */
  getDbPath() {
    return pathResolver.getDbPath();
  }

  /**
   * Get database connection
   *
   * Lazy initialization - connection is only created when first accessed.
   * Uses WAL mode for better concurrency.
   *
   * @returns {Database} SQLite database connection
   */
  getDb() {
    if (!this._db) {
      const dbPath = this.getDbPath();
      this._db = new Database(dbPath);
      this._db.pragma('journal_mode = WAL');
      this._db.pragma('synchronous = NORMAL');
      this._db.pragma('foreign_keys = ON');

      this.debug('Database connection initialized', { dbPath });
    }
    return this._db;
  }

  // ============================================================================
  // Logging
  // ============================================================================

  /**
   * Get logger instance
   *
   * Returns a child logger scoped to the hook name.
   * Lazy initialization.
   *
   * @returns {Logger} Winston logger instance
   */
  _getLogger() {
    if (!this._logger) {
      this._logger = logger.child({ hook: this.hookName });
    }
    return this._logger;
  }

  /**
   * Log info message
   *
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this._getLogger().info(message, meta);
  }

  /**
   * Log warning message
   *
   * Note: Named 'warn' for logging to distinguish from 'warning()' result helper.
   *
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this._getLogger().warn(message, meta);
  }

  /**
   * Log error message
   *
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    this._getLogger().error(message, meta);
  }

  /**
   * Log debug message
   *
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this._getLogger().debug(message, meta);
  }

  // ============================================================================
  // Storage
  // ============================================================================

  /**
   * Get validation storage instance
   *
   * Lazy initialization - storage is only created when first accessed.
   * Uses ValidationStorageFactory to create appropriate storage (SQLite or in-memory).
   *
   * @returns {Object} Storage instance (SQLiteValidationStorage or InMemoryValidationStorage)
   */
  getStorage() {
    if (!this._storage) {
      this._storage = ValidationStorageFactory.create();
      this.debug('Storage initialized');
    }
    return this._storage;
  }

  // ============================================================================
  // Session State
  // ============================================================================

  /**
   * Get session state manager
   *
   * Lazy initialization.
   *
   * @returns {SessionStateManager} Session state manager instance
   */
  _getSessionManager() {
    if (!this._sessionManager) {
      this._sessionManager = new SessionStateManager();
    }
    return this._sessionManager;
  }

  /**
   * Get entire session state object
   *
   * @returns {Array<Object>} Array of all session state entries
   */
  getSessionState() {
    return this._getSessionManager().getAllState();
  }

  /**
   * Get current phase from session state
   *
   * @returns {string|null} Current phase or null if not set
   */
  getPhase() {
    return this._getSessionManager().getState(SessionStateManager.PREDEFINED_KEYS.CURRENT_PHASE);
  }

  /**
   * Get current stage from session state
   *
   * @returns {string|null} Current stage or null if not set
   */
  getStage() {
    return this._getSessionManager().getState(SessionStateManager.PREDEFINED_KEYS.CURRENT_STAGE);
  }

  // ============================================================================
  // Result Helpers
  // ============================================================================

  /**
   * Return a pass result
   *
   * @param {string} message - Success message
   * @returns {Object} Pass result object
   */
  pass(message) {
    return {
      decision: 'allow',
      reason: message
    };
  }

  /**
   * Return a block result (valid Claude Code PreToolUse output)
   *
   * @param {string} message - Block message
   * @param {string} reason - Reason for blocking
   * @returns {Object} Block result object
   */
  block(message, reason) {
    return {
      decision: 'block',
      reason: reason || message
    };
  }

  /**
   * Return a warning result (allow with context feedback)
   *
   * Note: Named 'warning' (not 'warn') to avoid conflict with logging method.
   *
   * @param {string} message - Warning message
   * @returns {Object} Warning result object
   */
  warning(message) {
    return {
      decision: 'allow',
      reason: message,
      hookSpecificOutput: { additionalContext: message }
    };
  }

  /**
   * Return a skip result (allow silently)
   *
   * @param {string} message - Skip message
   * @returns {Object} Skip result object
   */
  skip(message) {
    return {
      decision: 'allow',
      reason: message
    };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Close all open resources
   *
   * Should be called when hook execution is complete to clean up
   * database connections and storage.
   */
  close() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this.debug('Database connection closed');
    }

    if (this._storage && typeof this._storage.close === 'function') {
      this._storage.close();
      this._storage = null;
      this.debug('Storage closed');
    }

    if (this._sessionManager) {
      this._sessionManager.close();
      this._sessionManager = null;
      this.debug('Session manager closed');
    }
  }
}

/**
 * Create a new HookContext instance
 *
 * Factory function for creating hook contexts.
 *
 * @param {string} hookName - Name of the hook
 * @param {Object} params - Hook input parameters
 * @returns {HookContext} New HookContext instance
 */
function createHookContext(hookName, params = {}) {
  return new HookContext(hookName, params);
}

module.exports = { HookContext, createHookContext };
