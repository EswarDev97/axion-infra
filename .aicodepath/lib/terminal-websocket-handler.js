/**
 * Terminal WebSocket Handler
 *
 * Handles WebSocket connections for terminal sessions, routing messages
 * between clients and PTY processes.
 *
 * @module lib/terminal-websocket-handler
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { getTerminalManager, createTerminalManager, isTerminalAvailable } = require('./terminal-session-manager');

// Terminal WebSocket path
const TERMINAL_WS_PATH = '/ws/terminal';

/**
 * Setup terminal WebSocket handler
 * @param {WebSocket.Server} wss - WebSocket server instance
 * @param {Object} options - Configuration options
 */
function setupTerminalWebSocket(wss, options = {}) {
  if (!isTerminalAvailable()) {
    logger.warn('Terminal WebSocket handler disabled - node-pty not installed');
    return;
  }

  const terminalManager = getTerminalManager() || createTerminalManager(options);

  wss.on('connection', (ws, req) => {
    // Check if this is a terminal connection
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith(TERMINAL_WS_PATH)) {
      return;
    }

    _handleTerminalConnection(ws, req, url, terminalManager);
  });

  logger.info('Terminal WebSocket handler registered', {
    path: TERMINAL_WS_PATH
  });
}

/**
 * Handle terminal WebSocket connection
 * @private
 */
function _handleTerminalConnection(ws, req, url, terminalManager) {
  const sessionId = url.searchParams.get('session') || uuidv4();
  const clientIp = req.socket.remoteAddress;

  logger.info('Terminal WebSocket connection initiated', {
    sessionId,
    clientIp
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      _handleTerminalMessage(sessionId, message, ws, terminalManager);
    } catch (error) {
      logger.error('Error parsing terminal WebSocket message', {
        sessionId,
        error: error.message
      });
      _sendError(ws, 'Invalid message format');
    }
  });

  ws.on('close', (code, reason) => {
    logger.info('Terminal WebSocket client disconnected', {
      sessionId,
      code,
      reason: reason?.toString()
    });
  });

  ws.on('error', (error) => {
    logger.error('Terminal WebSocket error', {
      sessionId,
      error: error.message
    });
  });

  // Send initial acknowledgment
  ws.send(JSON.stringify({
    type: 'terminal_connected',
    sessionId,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Handle terminal WebSocket message
 * @private
 */
function _handleTerminalMessage(sessionId, message, ws, terminalManager) {
  switch (message.type) {
    case 'terminal_create':
      _handleCreateSession(sessionId, message, ws, terminalManager);
      break;

    case 'terminal_input':
      _handleInput(sessionId, message, ws, terminalManager);
      break;

    case 'terminal_resize':
      _handleResize(sessionId, message, ws, terminalManager);
      break;

    case 'terminal_close':
      _handleClose(sessionId, terminalManager);
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'terminal_list':
      _handleListSessions(ws, terminalManager);
      break;

    case 'terminal_stats':
      _handleGetStats(ws, terminalManager);
      break;

    default:
      logger.debug('Unknown terminal message type', {
        sessionId,
        messageType: message.type
      });
  }
}

/**
 * Handle session creation request
 * @private
 */
function _handleCreateSession(sessionId, message, ws, terminalManager) {
  try {
    // Check if session exists
    const existingSession = terminalManager.getSession(sessionId);
    if (existingSession) {
      // Attach to existing session
      terminalManager.attachClient(sessionId, ws);
      logger.info('Client attached to existing terminal session', {
        sessionId
      });
      return;
    }

    // Create new session
    terminalManager.createSession(sessionId, {
      cols: message.cols || 80,
      rows: message.rows || 24,
      cwd: message.cwd,
      shell: message.shell,
    });

    terminalManager.attachClient(sessionId, ws);

  } catch (error) {
    logger.error('Failed to create terminal session', {
      sessionId,
      error: error.message
    });
    _sendError(ws, error.message);
  }
}

/**
 * Handle terminal input
 * @private
 */
function _handleInput(sessionId, message, ws, terminalManager) {
  try {
    terminalManager.write(sessionId, message.data);
  } catch (error) {
    logger.error('Failed to write to terminal session', {
      sessionId,
      error: error.message
    });
    _sendError(ws, error.message);
  }
}

/**
 * Handle terminal resize
 * @private
 */
function _handleResize(sessionId, message, ws, terminalManager) {
  try {
    terminalManager.resize(sessionId, message.cols, message.rows);
  } catch (error) {
    logger.error('Failed to resize terminal session', {
      sessionId,
      error: error.message
    });
  }
}

/**
 * Handle session close request
 * @private
 */
function _handleClose(sessionId, terminalManager) {
  try {
    terminalManager.closeSession(sessionId);
  } catch (error) {
    logger.error('Failed to close terminal session', {
      sessionId,
      error: error.message
    });
  }
}

/**
 * Handle list sessions request
 * @private
 */
function _handleListSessions(ws, terminalManager) {
  try {
    const sessions = terminalManager.getSessions();
    ws.send(JSON.stringify({
      type: 'terminal_sessions',
      sessions,
    }));
  } catch (error) {
    logger.error('Failed to list terminal sessions', {
      error: error.message
    });
  }
}

/**
 * Handle get stats request
 * @private
 */
function _handleGetStats(ws, terminalManager) {
  try {
    const stats = terminalManager.getStats();
    ws.send(JSON.stringify({
      type: 'terminal_stats',
      stats,
    }));
  } catch (error) {
    logger.error('Failed to get terminal stats', {
      error: error.message
    });
  }
}

/**
 * Send error message to client
 * @private
 */
function _sendError(ws, errorMessage) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({
      type: 'terminal_error',
      error: errorMessage,
    }));
  }
}

/**
 * Attach terminal handler to an existing WebSocket server
 * @param {Object} wss - WebSocket server instance
 * @param {Object} options - Options to pass to terminal manager
 * @returns {Object} Handler info
 */
function attachToWebSocketServer(wss, options = {}) {
  setupTerminalWebSocket(wss, options);

  return {
    path: TERMINAL_WS_PATH,
    available: isTerminalAvailable(),
  };
}

/**
 * Create a standalone WebSocket server for terminals
 * @param {Object} httpServer - HTTP server to attach to
 * @param {Object} options - Configuration options
 * @returns {Object} Handler info
 */
function createTerminalWebSocketServer(httpServer, options = {}) {
  if (!isTerminalAvailable()) {
    logger.warn('Terminal WebSocket server not created - node-pty not installed');
    return {
      path: TERMINAL_WS_PATH,
      available: false,
    };
  }

  const WebSocket = require('ws');
  const wss = new WebSocket.Server({
    server: httpServer,
    path: TERMINAL_WS_PATH,
  });

  setupTerminalWebSocket(wss, options);

  logger.info('Terminal WebSocket server created', {
    path: TERMINAL_WS_PATH
  });

  return {
    wss,
    path: TERMINAL_WS_PATH,
    available: true,
  };
}

/**
 * Get terminal WebSocket handler info
 * @returns {Object} Handler information
 */
function getTerminalHandlerInfo() {
  return {
    path: TERMINAL_WS_PATH,
    available: isTerminalAvailable(),
  };
}

module.exports = {
  setupTerminalWebSocket,
  attachToWebSocketServer,
  createTerminalWebSocketServer,
  getTerminalHandlerInfo,
  isTerminalAvailable,
};
