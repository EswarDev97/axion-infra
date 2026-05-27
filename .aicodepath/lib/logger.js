/**
 * AICodePath Structured Logger
 * Provides structured logging with Winston for better debugging and monitoring
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const pathResolver = require('./path-resolver');

// Ensure logs directory exists - use pathResolver to get project root
const projectRoot = pathResolver.findProjectRoot();
const logsDir = path.join(projectRoot, '.aicodepath', 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  // Fallback to console if we can't create logs directory
  console.warn('Could not create logs directory:', error.message);
}

/**
 * Custom format for console output (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      // Filter out internal Winston properties
      const cleanMeta = {};
      metaKeys.forEach(key => {
        if (!['timestamp', 'level', 'message', 'splat', Symbol.for('level')].includes(key)) {
          cleanMeta[key] = metadata[key];
        }
      });

      if (Object.keys(cleanMeta).length > 0) {
        msg += `\n${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }

    return msg;
  })
);

/**
 * Custom format for file output (JSON for parsing)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'aicodepath'
  },
  transports: []
});

// Add console transport (always)
logger.add(new winston.transports.Console({
  format: consoleFormat,
  level: process.env.LOG_LEVEL || 'info'
}));

// Add file transports (if logs directory exists)
if (fs.existsSync(logsDir)) {
  // Error log - only errors
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  // Combined log - all levels
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

/**
 * Create child logger with additional context
 * @param {Object} metadata - Additional metadata for all logs from this child
 * @returns {winston.Logger} Child logger
 */
logger.child = function(metadata) {
  return winston.createLogger({
    level: this.level,
    defaultMeta: { ...this.defaultMeta, ...metadata },
    transports: this.transports
  });
};

/**
 * Log with structured data
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional structured data
 */
logger.logWithMetadata = function(level, message, metadata = {}) {
  this[level](message, metadata);
};

/**
 * Log hook execution
 * @param {string} hookName - Name of the hook
 * @param {string} status - Status (start, success, error, skip)
 * @param {Object} metadata - Additional metadata
 */
logger.logHook = function(hookName, status, metadata = {}) {
  const level = status === 'error' ? 'error' : status === 'skip' ? 'debug' : 'info';
  this[level](`Hook ${status}`, {
    hook: hookName,
    status,
    ...metadata
  });
};

/**
 * Log validation result
 * @param {string} validationType - Type of validation
 * @param {string} filePath - File being validated
 * @param {string} status - Status (passed, failed, warning)
 * @param {Object} metadata - Additional metadata (score, violations, etc.)
 */
logger.logValidation = function(validationType, filePath, status, metadata = {}) {
  const level = status === 'failed' ? 'error' : status === 'warning' ? 'warn' : 'info';
  this[level]('Validation result', {
    validationType,
    filePath,
    status,
    ...metadata
  });
};

/**
 * Log performance metric
 * @param {string} operation - Operation name
 * @param {number} durationMs - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
logger.logPerformance = function(operation, durationMs, metadata = {}) {
  this.info('Performance metric', {
    operation,
    durationMs,
    duration: `${durationMs}ms`,
    ...metadata
  });
};

/**
 * Create a performance timer
 * @param {string} operation - Operation name
 * @returns {Function} Function to call when operation completes
 */
logger.startTimer = function(operation) {
  const startTime = Date.now();
  return (metadata = {}) => {
    const durationMs = Date.now() - startTime;
    this.logPerformance(operation, durationMs, metadata);
  };
};

module.exports = logger;
