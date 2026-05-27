/**
 * Terminal Session Manager
 *
 * Manages PTY (pseudo-terminal) sessions for the dashboard terminal integration.
 * Handles session lifecycle, I/O routing, security filtering, and cleanup.
 *
 * @module lib/terminal-session-manager
 */

const { EventEmitter } = require('events');
const path = require('path');
const logger = require('./logger');
const pathResolver = require('./path-resolver');

// node-pty is an optional dependency - will be loaded on demand
let pty = null;

try {
  pty = require('node-pty');
} catch (error) {
  logger.warn('node-pty not installed. Terminal integration will be disabled.', {
    error: error.message
  });
}

const DEFAULT_SHELL = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';

/**
 * Terminal Session Manager
 *
 * Manages multiple PTY sessions with security controls and lifecycle management.
 */
class TerminalSessionManager extends EventEmitter {
  constructor(options = {}) {
    super();

    if (!pty) {
      throw new Error('node-pty is not installed. Terminal integration requires node-pty.');
    }

    this.options = {
      maxSessions: 5,
      defaultCwd: pathResolver.findProjectRoot(),
      defaultShell: DEFAULT_SHELL,
      allowedCommands: null, // null = allow all, array = whitelist
      blockedCommands: [
        'rm -rf /',
        'dd if=',
        ':(){',
        'mkfs',
        'shutdown',
        'reboot'
      ],
      sandboxMode: false,
      ...options,
    };

    this.sessions = new Map(); // sessionId -> { pty, clientWs, createdAt, lastActivity, cwd }
  }

  /**
   * Create a new terminal session
   * @param {string} sessionId - Unique session identifier
   * @param {Object} options - Session options
   * @returns {string} Session ID
   */
  createSession(sessionId, options = {}) {
    if (this.sessions.size >= this.options.maxSessions) {
      throw new Error(`Maximum sessions (${this.options.maxSessions}) reached`);
    }

    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const shell = options.shell || this.options.defaultShell;
    const cwd = options.cwd || this.options.defaultCwd;

    // Validate working directory
    const cwdValidation = this._validatePath(cwd);
    if (!cwdValidation.valid) {
      throw new Error(`Invalid working directory: ${cwdValidation.reason}`);
    }

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        // Restrict PATH if sandboxing
        ...(this.options.sandboxMode ? { PATH: '/usr/bin:/bin' } : {}),
      },
    });

    const session = {
      pty: ptyProcess,
      clientWs: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      cwd,
      sessionId,
    };

    // Handle PTY output
    ptyProcess.onData((data) => {
      session.lastActivity = Date.now();
      this.emit('data', { sessionId, data });

      if (session.clientWs && session.clientWs.readyState === 1) {
        session.clientWs.send(JSON.stringify({
          type: 'terminal_output',
          sessionId,
          data: Buffer.from(data).toString('base64'),
        }));
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      logger.info('Terminal session exited', {
        sessionId,
        exitCode,
        signal
      });
      this.emit('exit', { sessionId, exitCode, signal });

      // Notify client if connected
      if (session.clientWs && session.clientWs.readyState === 1) {
        session.clientWs.send(JSON.stringify({
          type: 'terminal_exit',
          sessionId,
          exitCode,
          signal,
        }));
      }

      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    logger.info('Terminal session created', {
      sessionId,
      shell,
      cwd,
      totalSessions: this.sessions.size
    });

    return sessionId;
  }

  /**
   * Attach WebSocket client to session
   * @param {string} sessionId - Session ID
   * @param {WebSocket} ws - WebSocket client
   */
  attachClient(sessionId, ws) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.clientWs = ws;
    session.lastActivity = Date.now();

    logger.info('Client attached to terminal session', { sessionId });

    // Send initial data
    ws.send(JSON.stringify({
      type: 'terminal_ready',
      sessionId,
      cols: session.pty.cols,
      rows: session.pty.rows,
      cwd: session.cwd,
    }));
  }

  /**
   * Write input to terminal
   * @param {string} sessionId - Session ID
   * @param {string} data - Base64-encoded input data
   * @returns {boolean} True if written successfully
   */
  write(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Decode base64 input
    const decoded = Buffer.from(data, 'base64').toString('utf8');

    // Security check
    if (this._isBlockedCommand(decoded)) {
      logger.warn('Blocked dangerous command in terminal session', {
        sessionId,
        command: decoded.substring(0, 50)
      });
      session.pty.write('\r\n\x1b[31mCommand blocked for security reasons\x1b[0m\r\n');
      return false;
    }

    // Whitelist check if configured
    if (this.options.allowedCommands) {
      const firstWord = decoded.trim().split(/\s+/)[0];
      if (!this.options.allowedCommands.includes(firstWord)) {
        logger.warn('Command not in whitelist', {
          sessionId,
          command: firstWord
        });
        session.pty.write('\r\n\x1b[31mCommand not allowed\x1b[0m\r\n');
        return false;
      }
    }

    session.pty.write(decoded);
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Resize terminal
   * @param {string} sessionId - Session ID
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   */
  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.pty.resize(cols, rows);
    logger.debug('Terminal session resized', {
      sessionId,
      cols,
      rows
    });
  }

  /**
   * Close terminal session
   * @param {string} sessionId - Session ID
   * @returns {boolean} True if session existed and was closed
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      session.pty.kill();
    } catch (error) {
      logger.warn('Error killing PTY process', {
        sessionId,
        error: error.message
      });
    }

    this.sessions.delete(sessionId);
    logger.info('Terminal session closed', {
      sessionId,
      remainingSessions: this.sessions.size
    });
    return true;
  }

  /**
   * Get all sessions
   * @returns {Array} Array of session info objects
   */
  getSessions() {
    const sessions = [];
    for (const [id, session] of this.sessions) {
      sessions.push({
        id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        hasClient: !!session.clientWs,
        cwd: session.cwd,
      });
    }
    return sessions;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session object or null
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      hasClient: !!session.clientWs,
      cwd: session.cwd,
    };
  }

  /**
   * Check if command is blocked
   * @private
   * @param {string} input - Command input
   * @returns {boolean} True if blocked
   */
  _isBlockedCommand(input) {
    const normalizedInput = input.toLowerCase().trim();

    for (const blocked of this.options.blockedCommands) {
      if (normalizedInput.includes(blocked.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate path is within allowed directories
   * @private
   * @param {string} targetPath - Path to validate
   * @returns {Object} Validation result
   */
  _validatePath(targetPath) {
    try {
      const resolved = path.resolve(targetPath);
      const projectRoot = pathResolver.findProjectRoot();

      // Allow project root and subdirectories
      if (resolved.startsWith(projectRoot)) {
        return { valid: true };
      }

      // Additional allowed paths could be configured here
      return {
        valid: false,
        reason: `Path outside project root: ${targetPath}`
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid path: ${error.message}`
      };
    }
  }

  /**
   * Cleanup idle sessions
   * @param {number} maxIdleMs - Maximum idle time in milliseconds
   * @returns {number} Number of sessions cleaned up
   */
  cleanupIdleSessions(maxIdleMs = 30 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > maxIdleMs) {
        logger.info('Cleaning up idle terminal session', {
          sessionId,
          idleTime: now - session.lastActivity
        });
        this.closeSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up idle terminal sessions', {
        count: cleaned
      });
    }

    return cleaned;
  }

  /**
   * Get session statistics
   * @returns {Object} Statistics about sessions
   */
  getStats() {
    const now = Date.now();
    let totalIdleTime = 0;
    let oldestSession = null;
    let newestSession = null;

    for (const [sessionId, session] of this.sessions) {
      const idleTime = now - session.lastActivity;
      totalIdleTime += idleTime;

      if (!oldestSession || session.createdAt < oldestSession.createdAt) {
        oldestSession = session;
      }
      if (!newestSession || session.createdAt > newestSession.createdAt) {
        newestSession = session;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.clientWs).length,
      averageIdleTime: this.sessions.size > 0 ? totalIdleTime / this.sessions.size : 0,
      oldestSession: oldestSession ? {
        id: oldestSession.sessionId,
        age: now - oldestSession.createdAt
      } : null,
      newestSession: newestSession ? {
        id: newestSession.sessionId,
        age: now - newestSession.createdAt
      } : null,
    };
  }

  /**
   * Close all sessions
   */
  closeAll() {
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      this.closeSession(sessionId);
    }
    logger.info('All terminal sessions closed', {
      count: sessionIds.length
    });
  }
}

// Singleton instance
let instance = null;
let cleanupTimer = null;

/**
 * Get existing terminal manager instance
 * @returns {TerminalSessionManager|null} Manager instance or null
 */
function getTerminalManager() {
  return instance;
}

/**
 * Create or get terminal manager instance
 * @param {Object} options - Manager options
 * @returns {TerminalSessionManager} Manager instance
 */
function createTerminalManager(options) {
  if (instance) {
    logger.warn('Terminal manager already exists, returning existing instance');
    return instance;
  }

  instance = new TerminalSessionManager(options);

  // Cleanup idle sessions every 5 minutes
  cleanupTimer = setInterval(() => {
    if (instance) {
      instance.cleanupIdleSessions();
    }
  }, 5 * 60 * 1000);

  logger.info('Terminal manager created', {
    maxSessions: instance.options.maxSessions,
    sandboxMode: instance.options.sandboxMode
  });

  return instance;
}

/**
 * Close terminal manager and cleanup
 */
function closeTerminalManager() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }

  if (instance) {
    instance.closeAll();
    instance = null;
  }

  logger.info('Terminal manager closed');
}

/**
 * Check if terminal integration is available
 * @returns {boolean} True if node-pty is installed
 */
function isTerminalAvailable() {
  return pty !== null;
}

module.exports = {
  TerminalSessionManager,
  getTerminalManager,
  createTerminalManager,
  closeTerminalManager,
  isTerminalAvailable,
};
