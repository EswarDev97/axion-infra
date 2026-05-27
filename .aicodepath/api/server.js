/**
 * AICodePath API Server
 *
 * Central API server for dashboard and other clients.
 * Mounts route modules from the routes directory.
 *
 * Environment Variables:
 * - PORT: Server port (default: 3888, configured in .env.aicodepath)
 * - ANTHROPIC_API_KEY: Required for AI assistant features
 *
 * Usage:
 *   node .aicodepath/api/server.js
 */

// Load .env.aicodepath first (AICodePath config), then .env (project config)
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.aicodepath') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const logger = require('../lib/logger');

const app = express();
const server = http.createServer(app);
const PORT = process.env.API_PORT || process.env.PORT || 3888;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('[API] Request', {
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
  });
});

// Mount route modules
try {
  const assistantRoutes = require('./routes/assistant');
  app.use('/api/assistant', assistantRoutes);
  logger.info('[API] Mounted assistant routes');
} catch (error) {
  logger.error('[API] Failed to mount assistant routes', { error: error.message });
}

// Mount dashboard data routes
const routeMounts = [
  { path: '/api/overview', module: './routes/overview', name: 'overview' },
  { path: '/api/workflow-state', module: './routes/workflow', name: 'workflow' },
  { path: '/api/agent-status', module: './routes/agents', name: 'agents' },
  { path: '/api/visual-memory', module: './routes/visual-memory', name: 'visual-memory' },
  { path: '/api/schedules', module: './routes/schedules', name: 'schedules' },
  { path: '/api/units/graph', module: './routes/graph', name: 'graph' },
  { path: '/api/cost', module: './routes/cost', name: 'cost' },
  { path: '/api/conversations', module: './routes/conversation-search', name: 'conversation-search' },
  { path: '/api/conversations', module: './routes/conversations', name: 'conversations' },
  { path: '/api', module: './routes/monitoring', name: 'monitoring' },
  { path: '/api', module: './routes/code-analysis', name: 'code-analysis' },
];

for (const route of routeMounts) {
  try {
    const routeModule = require(route.module);
    app.use(route.path, routeModule);
    logger.info(`[API] Mounted ${route.name} routes at ${route.path}`);
  } catch (error) {
    logger.error(`[API] Failed to mount ${route.name} routes`, { error: error.message });
  }
}

// WebSocket integration with centralized upgrade routing
let dashboardWs = null;
let terminalWss = null;
let terminalHandlerInfo = null;

try {
  const WebSocket = require('ws');
  const { createWebSocketServer } = require('../lib/websocket-server');
  const { attachToWebSocketServer, isTerminalAvailable } = require('../lib/terminal-websocket-handler');

  // Create dashboard WebSocket server in noServer mode
  dashboardWs = createWebSocketServer({ path: '/ws/dashboard' });
  dashboardWs.attach(server);
  logger.info('[API] Dashboard WebSocket created (noServer mode)');

  // Create terminal WebSocket server in noServer mode if available
  if (isTerminalAvailable()) {
    terminalWss = new WebSocket.Server({ noServer: true, perMessageDeflate: false });
    terminalHandlerInfo = attachToWebSocketServer(terminalWss, {
      maxSessions: 5,
      sandboxMode: false,
    });

    if (terminalHandlerInfo.available) {
      logger.info('[API] Terminal WebSocket created (noServer mode)', {
        maxSessions: 5,
      });
    }
  } else {
    logger.info('[API] Terminal WebSocket disabled - node-pty not installed');
  }

  // Centralized upgrade request routing
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === '/ws/dashboard') {
      if (dashboardWs && dashboardWs.handleUpgrade) {
        dashboardWs.handleUpgrade(request, socket, head);
      } else {
        logger.error('[API] Dashboard WebSocket not ready for upgrade');
        socket.destroy();
      }
    } else if (pathname === '/ws/terminal') {
      if (terminalWss && terminalHandlerInfo?.available) {
        terminalWss.handleUpgrade(request, socket, head, (ws) => {
          terminalWss.emit('connection', ws, request);
        });
      } else {
        logger.warn('[API] Terminal WebSocket not available');
        socket.destroy();
      }
    } else {
      logger.warn('[API] Unknown WebSocket path', { pathname });
      socket.destroy();
    }
  });

  logger.info('[API] WebSocket upgrade routing configured');
} catch (error) {
  logger.warn('[API] Failed to setup WebSocket servers', { error: error.message });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('[API] Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`[API] Server running on http://localhost:${PORT}`);
  logger.info('[API] Available endpoints:');
  logger.info('  - GET  /api/health');
  logger.info('  - GET  /api/overview');
  logger.info('  - GET  /api/workflow-state');
  logger.info('  - GET  /api/agent-status');
  logger.info('  - GET  /api/validations');
  logger.info('  - GET  /api/validation-summary');
  logger.info('  - GET  /api/artifacts');
  logger.info('  - GET  /api/artifact-stats');
  logger.info('  - GET  /api/units/graph');
  logger.info('  - GET  /api/code-entities');
  logger.info('  - GET  /api/code-relations');
  logger.info('  - GET  /api/session-history');
  logger.info('  - GET  /api/design-violations');
  logger.info('  - GET  /api/visual-memory');
  logger.info('  - GET  /api/visual-memory/stats');
  logger.info('  - GET  /api/schedules');
  logger.info('  - POST /api/assistant/chat');
  logger.info('  - POST /api/assistant/expand');

  // WebSocket endpoints
  logger.info('  - WS   /ws/dashboard (Dashboard events)');
  if (terminalHandlerInfo && terminalHandlerInfo.available) {
    logger.info(`  - WS   ${terminalHandlerInfo.path} (Terminal)`);
  } else {
    logger.info('[API] Terminal integration disabled - install node-pty to enable');
  }

  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('[API] ⚠️  ANTHROPIC_API_KEY not set - AI features will fail');
  }
});

// Initialize tiered file watcher for project files (non-critical)
try {
  const { getTieredWatcher } = require('../lib/tiered-watcher');
  const watcher = getTieredWatcher({
    maxHotPaths: 50,
    pollingInterval: 10000,
    hotTierTimeout: 600000,
  });

  watcher.on('changed', (data) => {
    try {
      const { getWebSocketServer } = require('../lib/websocket-server');
      const wsServer = getWebSocketServer();
      if (wsServer) wsServer.emitFileChanged(data);
    } catch (e) { /* non-critical */ }
  });

  const pathResolver = require('../lib/path-resolver');
  const projectRoot = pathResolver.findProjectRoot();
  const watchPaths = [
    path.join(projectRoot, 'aicodepath-docs'),
    pathResolver.getDbPath(),
  ];
  for (const watchPath of watchPaths) {
    watcher.addPath(watchPath, 'auto').catch(() => {});
  }

  logger.info('[API] Tiered file watcher initialized');
} catch (error) {
  logger.warn('[API] Tiered watcher setup failed (non-critical)', { error: error.message });
}

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`[API] ${signal} received, shutting down gracefully...`);

  // Close database connections
  try {
    const { closeDatabase } = require('./routes/db-helpers');
    closeDatabase();
    logger.info('[API] Database connection closed');
  } catch (error) {
    // Ignore if db-helpers not loaded
  }
  try {
    const conversationsRouter = require('./routes/conversations');
    if (conversationsRouter.closeConversationsDb) {
      conversationsRouter.closeConversationsDb();
      logger.info('[API] Conversations DB connection closed');
    }
  } catch (error) {
    // Ignore if conversations route not loaded
  }

  // Close terminal manager
  try {
    const { closeTerminalManager, isTerminalAvailable } = require('../lib/terminal-session-manager');
    if (isTerminalAvailable()) {
      closeTerminalManager();
      logger.info('[API] Terminal manager closed');
    }
  } catch (error) {
    // Ignore terminal manager errors during shutdown
  }

  server.close(() => {
    logger.info('[API] Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('[API] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('[API] Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[API] Unhandled rejection', { reason, promise });
});

module.exports = app;
