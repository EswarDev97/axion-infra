#!/usr/bin/env node
/**
 * Database Health and Network Filesystem Detection
 *
 * Provides robust SQLite database initialization with:
 * - Network filesystem detection (Windows network paths, Unix NFS/CIFS/SMB, macOS)
 * - Automatic journal mode selection (WAL for local, DELETE for network)
 * - Busy timeout configuration with retry logic
 * - Connection health monitoring
 * - Comprehensive error handling
 *
 * @module database-health
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('./logger');

/**
 * SQLite error codes
 */
const SQLITE_ERROR_CODES = {
  SQLITE_BUSY: 5,
  SQLITE_LOCKED: 6,
  SQLITE_CORRUPT: 11,
  SQLITE_READONLY: 8,
  SQLITE_IOERR: 10,
  SQLITE_CANTOPEN: 14
};

/**
 * Default configurations for different filesystem types
 */
const DEFAULT_CONFIGS = {
  local: {
    busyTimeout: 30000,
    journalMode: 'WAL',
    synchronous: 'NORMAL',
    cacheSize: -2000,
    mmapSize: 268435456, // 256MB
    pageTimeout: 5000
  },
  network: {
    busyTimeout: 30000,
    journalMode: 'DELETE',
    synchronous: 'FULL',
    cacheSize: -2000,
    mmapSize: 0, // Disable mmap on network
    pageTimeout: 10000
  }
};

/**
 * Detect if a path is on a network filesystem
 *
 * @param {string} dbPath - Database file path
 * @returns {Object} Detection result
 */
function detectNetworkFilesystem(dbPath) {
  const result = {
    isNetwork: false,
    type: 'local',
    mountPoint: null,
    detectedBy: null
  };

  try {
    const absolutePath = path.resolve(dbPath);

    // Windows network path detection
    if (process.platform === 'win32') {
      // Check for UNC paths (\\server\share or //server/share)
      if (absolutePath.startsWith('\\\\') || absolutePath.startsWith('//')) {
        result.isNetwork = true;
        result.type = 'windows-share';
        result.detectedBy = 'windows-path';

        const parts = absolutePath.split(path.sep);
        if (parts.length >= 4) {
          result.mountPoint = path.join(parts[0], parts[1], parts[2], parts[3]);
        }

        logger.info('Network filesystem detected', {
          context: 'database-health',
          type: result.type,
          path: absolutePath,
          mountPoint: result.mountPoint
        });

        return result;
      }
    }

    // Unix/Linux/macOS network mount detection
    if (process.platform !== 'win32') {
      // Read /proc/mounts on Linux
      if (fs.existsSync('/proc/mounts')) {
        const mounts = fs.readFileSync('/proc/mounts', 'utf8');
        const mountLines = mounts.split('\n').filter(line => line.trim());

        for (const line of mountLines) {
          const parts = line.split(/\s+/);
          if (parts.length < 3) continue;

          const device = parts[0];
          const mountPoint = parts[1];
          const fsType = parts[2];

          // Check if database path is under this mount point
          if (absolutePath.startsWith(mountPoint + path.sep) || absolutePath === mountPoint) {
            const networkFsTypes = ['nfs', 'nfs4', 'cifs', 'smb', 'smbfs', 'fuse.sshfs', 'fuse.cifs', 'webdav'];

            if (networkFsTypes.includes(fsType.toLowerCase()) ||
                device.startsWith('//') ||
                device.includes(':')) {
              result.isNetwork = true;
              result.type = fsType.toLowerCase();
              result.mountPoint = mountPoint;
              result.detectedBy = 'mounts';

              logger.info('Network filesystem detected', {
                context: 'database-health',
                type: result.type,
                path: absolutePath,
                mountPoint: result.mountPoint
              });

              return result;
            }
          }
        }
      }

      // Fallback: Check /etc/fstab for network filesystems
      if (fs.existsSync('/etc/fstab')) {
        const fstab = fs.readFileSync('/etc/fstab', 'utf8');
        const fstabLines = fstab.split('\n').filter(line => line.trim() && !line.startsWith('#'));

        for (const line of fstabLines) {
          const parts = line.split(/\s+/);
          if (parts.length < 2) continue;

          const device = parts[0];
          const mountPoint = parts[1];
          const fsType = parts[2];

          // Check if database path is under this mount point
          if (absolutePath.startsWith(mountPoint + path.sep) || absolutePath === mountPoint) {
            const networkFsTypes = ['nfs', 'nfs4', 'cifs', 'smb', 'smbfs'];

            if (networkFsTypes.includes(fsType.toLowerCase()) ||
                device.startsWith('//') ||
                device.includes(':')) {
              result.isNetwork = true;
              result.type = fsType.toLowerCase();
              result.mountPoint = mountPoint;
              result.detectedBy = 'fstab';

              logger.info('Network filesystem detected', {
                context: 'database-health',
                type: result.type,
                path: absolutePath,
                mountPoint: result.mountPoint
              });

              return result;
            }
          }
        }
      }

      // macOS: Check for common network mount points
      if (process.platform === 'darwin') {
        const networkPaths = ['/Volumes/', '/mnt/'];
        for (const networkPath of networkPaths) {
          if (absolutePath.startsWith(networkPath)) {
            result.isNetwork = true;
            result.type = 'network-mount';
            result.mountPoint = networkPath;
            result.detectedBy = 'mount-point-heuristic';

            logger.info('Network filesystem detected (macOS heuristic)', {
              context: 'database-health',
              type: result.type,
              path: absolutePath,
              mountPoint: result.mountPoint
            });

            return result;
          }
        }
      }
    }

    logger.debug('Local filesystem detected', {
      context: 'database-health',
      path: absolutePath
    });

  } catch (error) {
    logger.warn('Error detecting network filesystem, assuming local', {
      context: 'database-health',
      error: error.message
    });
  }

  return result;
}

/**
 * Get database configuration based on filesystem type
 *
 * @param {string} dbPath - Database file path
 * @returns {Object} Database configuration
 */
function getDatabaseConfig(dbPath) {
  const detection = detectNetworkFilesystem(dbPath);
  const configType = detection.isNetwork ? 'network' : 'local';

  const config = { ...DEFAULT_CONFIGS[configType] };

  logger.info('Database configuration selected', {
    context: 'database-health',
    configType,
    isNetwork: detection.isNetwork,
    fsType: detection.type,
    journalMode: config.journalMode,
    busyTimeout: config.busyTimeout
  });

  return config;
}

/**
 * Initialize database with robust configuration
 *
 * @param {Object} db - better-sqlite3 Database instance
 * @param {string} dbPath - Database file path
 * @returns {Object} Initialization result
 */
function initializeDatabase(db, dbPath) {
  const config = getDatabaseConfig(dbPath);

  try {
    // Set busy timeout first
    db.pragma(`busy_timeout = ${config.busyTimeout}`);

    // Set journal mode
    const journalResult = db.pragma(`journal_mode = ${config.journalMode}`);

    // Set synchronous mode
    db.pragma(`synchronous = ${config.synchronous}`);

    // Set cache size
    db.pragma(`cache_size = ${config.cacheSize}`);

    // Set memory map size (0 to disable on network filesystems)
    db.pragma(`mmap_size = ${config.mmapSize}`);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Set temp store to MEMORY for better performance
    db.pragma('temp_store = MEMORY');

    // Optimize for smaller queries
    db.pragma('query_only = OFF');

    logger.info('Database initialized with robust configuration', {
      context: 'database-health',
      journalMode: journalResult,
      synchronous: config.synchronous,
      busyTimeout: config.busyTimeout,
      cacheSize: config.cacheSize,
      mmapSize: config.mmapSize,
      foreignKeys: 'ON'
    });

    return {
      success: true,
      config,
      journalMode: journalResult
    };
  } catch (error) {
    logger.error('Failed to initialize database', {
      context: 'database-health',
      error: error.message,
      dbPath
    });
    throw error;
  }
}

/**
 * Execute database operation with retry logic
 *
 * @param {Object} db - better-sqlite3 Database instance
 * @param {Function} operation - Function to execute
 * @param {Object} options - Retry options
 * @returns {any} Result of the operation
 */
function executeWithRetry(db, operation, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 100
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      const errorCode = error.code;

      // Retry on SQLITE_BUSY or SQLITE_LOCKED
      if ((errorCode === SQLITE_ERROR_CODES.SQLITE_BUSY ||
           errorCode === SQLITE_ERROR_CODES.SQLITE_LOCKED) &&
          attempt < maxRetries) {

        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff

        logger.warn('Database operation busy, retrying', {
          context: 'database-health',
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          errorCode,
          delay
        });

        // Sleep before retry
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
        continue;
      }

      // For other errors or last attempt, throw
      throw error;
    }
  }

  throw lastError;
}

/**
 * Check database connection health
 *
 * @param {Object} db - better-sqlite3 Database instance
 * @returns {Object} Health check result
 */
function checkDatabaseHealth(db) {
  try {
    // Try to execute a simple query
    const result = db.pragma('user_version');

    // Check if database is in WAL mode
    const journalMode = db.pragma('journal_mode');

    // Check database size — pragma() returns array of objects, extract scalar
    const pageSize = db.pragma('page_size')[0].page_size;
    const pageCount = db.pragma('page_count')[0].page_count;
    const sizeBytes = pageSize * pageCount;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

    return {
      healthy: true,
      userVersion: result,
      journalMode: journalMode,
      sizeBytes,
      sizeMB,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Database health check failed', {
      context: 'database-health',
      error: error.message
    });

    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get database statistics
 *
 * @param {Object} db - better-sqlite3 Database instance
 * @returns {Object} Database statistics
 */
function getDatabaseStats(db) {
  try {
    // pragma() returns array of objects — extract scalar value from first row
    const pragmaVal = (name) => {
      const rows = db.pragma(name);
      if (!rows || !rows.length) return null;
      const row = rows[0];
      return row[Object.keys(row)[0]];
    };

    const stats = {
      journalMode: pragmaVal('journal_mode'),
      synchronous: pragmaVal('synchronous'),
      busyTimeout: pragmaVal('busy_timeout'),
      cacheSize: pragmaVal('cache_size'),
      mmapSize: pragmaVal('mmap_size'),
      foreignKeys: pragmaVal('foreign_keys'),
      pageSize: pragmaVal('page_size'),
      pageCount: pragmaVal('page_count'),
      freelistCount: pragmaVal('freelist_count'),
      userVersion: pragmaVal('user_version'),
      applicationId: pragmaVal('application_id')
    };

    // Calculate database size
    stats.sizeBytes = stats.pageSize * stats.pageCount;
    stats.sizeMB = (stats.sizeBytes / (1024 * 1024)).toFixed(2);

    return stats;
  } catch (error) {
    logger.error('Failed to get database stats', {
      context: 'database-health',
      error: error.message
    });
    return null;
  }
}

/**
 * Optimize database
 *
 * @param {Object} db - better-sqlite3 Database instance
 * @returns {Object} Optimization result
 */
function optimizeDatabase(db) {
  try {
    logger.info('Starting database optimization', {
      context: 'database-health'
    });

    // Analyze tables for query optimization
    db.pragma('optimize');

    // Check integrity
    const integrityResult = db.pragma('integrity_check');

    logger.info('Database optimization complete', {
      context: 'database-health',
      integrityCheck: integrityResult
    });

    return {
      success: true,
      integrityCheck: integrityResult
    };
  } catch (error) {
    logger.error('Database optimization failed', {
      context: 'database-health',
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}

// Module exports
module.exports = {
  detectNetworkFilesystem,
  getDatabaseConfig,
  initializeDatabase,
  executeWithRetry,
  checkDatabaseHealth,
  getDatabaseStats,
  optimizeDatabase,
  SQLITE_ERROR_CODES,
  DEFAULT_CONFIGS
};
