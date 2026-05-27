/**
 * Database Helper Utilities
 *
 * Shared module for route handlers to access the AICodePath SQLite database.
 * Provides lazy-initialized, read-only database access with safe query wrappers.
 *
 * Usage:
 *   const { safeQuery, safeQueryOne, closeDatabase } = require('./db-helpers');
 *   const rows = safeQuery('SELECT * FROM workflow_state');
 */

const fs = require('fs');
const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

/** @type {import('better-sqlite3').Database | null} */
let dbInstance = null;

/**
 * Get or create a read-only database connection.
 * Uses lazy initialization - the connection is created on first access.
 *
 * @returns {import('better-sqlite3').Database | null} Database instance or null if unavailable
 */
/** @type {string|null} Path of the currently opened DB file */
let dbFilePath = null;

/**
 * Get or create a read-only database connection.
 * Uses lazy initialization - the connection is created on first access.
 * Re-opens if the DB file path has changed (e.g., after re-initialization).
 *
 * @returns {import('better-sqlite3').Database | null} Database instance or null if unavailable
 */
function getDatabase() {
  const dbPath = pathResolver.getDbPath();

  // Re-open if path changed (DB was recreated/moved)
  if (dbInstance && dbFilePath !== dbPath) {
    try { dbInstance.close(); } catch (_) { /* ignore */ }
    dbInstance = null;
    dbFilePath = null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  try {
    if (!fs.existsSync(dbPath)) {
      logger.warn('[db-helpers] Database file not found', { dbPath });
      return null;
    }

    const Database = require('better-sqlite3');
    dbInstance = new Database(dbPath, { readonly: true });
    dbFilePath = dbPath;

    logger.info('[db-helpers] Database connection opened', { dbPath });
    return dbInstance;
  } catch (error) {
    logger.error('[db-helpers] Failed to open database', {
      error: error.message,
      context: 'db-helpers',
    });
    return null;
  }
}

/**
 * Execute a SQL query and return all matching rows.
 * Returns an empty array on error or if the database is unavailable.
 *
 * @param {string} sql - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @returns {Array<Object>} Array of row objects, or [] on error
 */
function safeQuery(sql, params = []) {
  try {
    const db = getDatabase();
    if (!db) {
      return [];
    }
    return db.prepare(sql).all(...params);
  } catch (error) {
    logger.error('[db-helpers] Query error', {
      error: error.message,
      sql: sql.substring(0, 120),
      context: 'db-helpers',
    });
    return [];
  }
}

/**
 * Execute a SQL query and return the first matching row.
 * Returns null on error or if the database is unavailable.
 *
 * @param {string} sql - SQL query string
 * @param {Array} [params=[]] - Query parameters
 * @returns {Object|null} First row object, or null on error
 */
function safeQueryOne(sql, params = []) {
  try {
    const db = getDatabase();
    if (!db) {
      return null;
    }
    return db.prepare(sql).get(...params);
  } catch (error) {
    logger.error('[db-helpers] Query error', {
      error: error.message,
      sql: sql.substring(0, 120),
      context: 'db-helpers',
    });
    return null;
  }
}

/**
 * Close the database connection if it is open.
 * Safe to call multiple times.
 */
function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
      logger.info('[db-helpers] Database connection closed');
    } catch (error) {
      logger.error('[db-helpers] Error closing database', {
        error: error.message,
        context: 'db-helpers',
      });
    }
    dbInstance = null;
    dbFilePath = null;
  }
}

module.exports = {
  getDatabase,
  safeQuery,
  safeQueryOne,
  closeDatabase,
};
