const fs = require('fs');
const path = require('path');
const { findProjectRoot , getDbPath } = require('./path-resolver');
const logger = require('./logger');

/**
 * In-memory validation storage for when database is unavailable
 * Provides basic validation recording without persistence
 */
class InMemoryValidationStorage {
  constructor() {
    this.validations = [];
    this.idCounter = 1;
  }

  /**
   * Record a validation result
   * @param {Object} validation - Validation data
   * @returns {Promise<Object>} Recorded validation with ID
   */
  async recordValidation(validation) {
    const record = {
      id: this.idCounter++,
      ...validation,
      validated_at: new Date().toISOString()
    };
    this.validations.push(record);
    return record;
  }

  /**
   * Check if storage is available
   * @returns {Promise<boolean>} Always true for in-memory
   */
  async isAvailable() {
    return true;
  }

  /**
   * Close storage (no-op for in-memory)
   * @returns {Promise<void>}
   */
  async close() {
    // No cleanup needed for in-memory storage
  }

  /**
   * Get all validations (useful for debugging)
   * @returns {Array<Object>} All validation records
   */
  getAll() {
    return this.validations;
  }
}

/**
 * SQLite-based validation storage using the GICL database
 * Provides persistent validation recording
 */
class SQLiteValidationStorage {
  constructor(projectPath) {
    const ValidationRecorder = require('./validation-recorder');
    this.recorder = new ValidationRecorder(projectPath);
  }

  /**
   * Record a validation result
   * @param {Object} v - Validation data
   * @returns {Promise<Object>} Recorded validation
   */
  async recordValidation(v) {
    return this.recorder.recordValidation(
      v.artifactId || null,
      v.filePath,
      v.validationType,
      v.score || 0,
      v.status || 'unknown',
      v.violations || []
    );
  }

  /**
   * Check if storage is available
   * @returns {Promise<boolean>} True if database connection works
   */
  async isAvailable() {
    try {
      // Test database connection by checking if we can query
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close storage
   * @returns {Promise<void>}
   */
  async close() {
    if (this.recorder && this.recorder.close) {
      this.recorder.close();
    }
  }
}

/**
 * Factory for creating appropriate validation storage based on environment
 */
class ValidationStorageFactory {
  /**
   * Create a validation storage instance
   * Attempts to use SQLite if database exists, falls back to in-memory
   * @param {string|null} projectPath - Project root path (optional)
   * @returns {InMemoryValidationStorage|SQLiteValidationStorage} Storage instance
   */
  static create(projectPath = null) {
    try {
      const projectRoot = projectPath || findProjectRoot(process.cwd());
      const dbPath = getDbPath();

      if (fs.existsSync(dbPath)) {
        try {
          return new SQLiteValidationStorage(projectRoot);
        } catch (error) {
          logger.warn('SQLite storage unavailable, using in-memory validation storage', {
            error: error.message
          });
        }
      }
    } catch (error) {
      // If findProjectRoot fails or other errors, fall back to in-memory
      logger.warn('Could not initialize validation storage, using in-memory validation storage', {
        error: error.message
      });
    }

    return new InMemoryValidationStorage();
  }

  /**
   * Create in-memory storage explicitly
   * @returns {InMemoryValidationStorage} In-memory storage instance
   */
  static createInMemory() {
    return new InMemoryValidationStorage();
  }

  /**
   * Create SQLite storage explicitly
   * @param {string} projectPath - Project root path
   * @returns {SQLiteValidationStorage} SQLite storage instance
   */
  static createSQLite(projectPath) {
    return new SQLiteValidationStorage(projectPath);
  }
}

module.exports = ValidationStorageFactory;
module.exports.InMemoryValidationStorage = InMemoryValidationStorage;
module.exports.SQLiteValidationStorage = SQLiteValidationStorage;
