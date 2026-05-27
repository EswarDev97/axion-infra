/**
 * WebSocket Server for AICodePath Dashboard
 *
 * Provides real-time communication between backend hooks and the React dashboard.
 * Supports connection management, broadcasting, heartbeats, and client subscriptions.
 *
 * @module lib/websocket-server
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Dashboard WebSocket Server
 *
 * Manages WebSocket connections for real-time dashboard updates.
 */
class DashboardWebSocketServer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      path: '/ws/dashboard',
      heartbeatInterval: 30000,
      clientTimeout: 60000,
      maxClients: 100,
      ...options,
    };

    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, lastPing, subscriptions }
    this.heartbeatTimer = null;
  }

  /**
   * Attach to an existing HTTP server (noServer mode)
   * @param {Object} httpServer - HTTP server instance
   * @returns {DashboardWebSocketServer} This instance for chaining
   */
  attach(httpServer) {
    this.wss = new WebSocket.Server({
      noServer: true,
      perMessageDeflate: false,
    });

    this.wss.on('connection', (ws, req) => this._handleConnection(ws, req));
    this.wss.on('error', (error) => this._handleServerError(error));

    this._startHeartbeat();

    logger.info('WebSocket server attached (noServer mode)', {
      path: this.options.path
    });

    return this;
  }

  /**
   * Handle upgrade request (used with noServer: true)
   * @param {Object} request - HTTP request
   * @param {Object} socket - Network socket
   * @param {Buffer} head - First packet of upgraded stream
   */
  handleUpgrade(request, socket, head) {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  /**
   * Create standalone server on a port
   * @param {number} port - Port to listen on
   * @returns {DashboardWebSocketServer} This instance for chaining
   */
  listen(port) {
    this.wss = new WebSocket.Server({
      port,
      path: this.options.path,
    });

    this.wss.on('connection', (ws, req) => this._handleConnection(ws, req));
    this.wss.on('error', (error) => this._handleServerError(error));

    this._startHeartbeat();

    logger.info('WebSocket server listening', {
      port,
      path: this.options.path
    });

    return this;
  }

  /**
   * Handle new client connection
   * @private
   */
  _handleConnection(ws, req) {
    const clientId = uuidv4();
    const clientIp = req.socket.remoteAddress;

    if (this.clients.size >= this.options.maxClients) {
      logger.warn('Max clients reached, rejecting connection', {
        ip: clientIp
      });
      ws.close(1013, 'Server capacity reached');
      return;
    }

    this.clients.set(clientId, {
      ws,
      lastPing: Date.now(),
      isAlive: true,
      subscriptions: new Set(['*']), // Default: subscribe to all
      ip: clientIp,
    });

    logger.info('WebSocket client connected', {
      clientId,
      ip: clientIp,
      totalClients: this.clients.size
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
    });
    ws.on('message', (data) => this._handleMessage(clientId, data));
    ws.on('close', (code, reason) => this._handleClose(clientId, code, reason));
    ws.on('error', (error) => this._handleClientError(clientId, error));

    // Send welcome message
    this._send(clientId, {
      type: 'welcome',
      clientId,
      serverTime: new Date().toISOString(),
    });

    this.emit('client:connect', { clientId, ip: clientIp });
  }

  /**
   * Handle incoming message from client
   * @private
   */
  _handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastPing = Date.now();

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          this._send(clientId, { type: 'pong', timestamp: Date.now() });
          break;

        case 'subscribe':
          // Subscribe to specific event types
          if (Array.isArray(message.events)) {
            message.events.forEach(e => client.subscriptions.add(e));
            logger.debug('Client subscribed to events', {
              clientId,
              events: message.events
            });
          }
          break;

        case 'unsubscribe':
          if (Array.isArray(message.events)) {
            message.events.forEach(e => client.subscriptions.delete(e));
            logger.debug('Client unsubscribed from events', {
              clientId,
              events: message.events
            });
          }
          break;

        default:
          this.emit('message', { clientId, message });
      }
    } catch (error) {
      logger.warn('Invalid WebSocket message', {
        clientId,
        error: error.message
      });
    }
  }

  /**
   * Handle client disconnect
   * @private
   */
  _handleClose(clientId, code, reason) {
    this.clients.delete(clientId);
    logger.info('WebSocket client disconnected', {
      clientId,
      code,
      reason: reason?.toString(),
      remainingClients: this.clients.size
    });
    this.emit('client:disconnect', { clientId, code, reason: reason?.toString() });
  }

  /**
   * Handle client error
   * @private
   */
  _handleClientError(clientId, error) {
    logger.error('WebSocket client error', {
      clientId,
      error: error.message
    });
    this.emit('client:error', { clientId, error });
  }

  /**
   * Handle server error
   * @private
   */
  _handleServerError(error) {
    logger.error('WebSocket server error', {
      error: error.message
    });
    this.emit('server:error', { error });
  }

  /**
   * Start heartbeat timer
   * @private
   */
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      for (const [clientId, client] of this.clients.entries()) {
        // Check if client responded to last WebSocket-level ping
        if (client.isAlive === false) {
          logger.info('WebSocket client timeout (no pong)', { clientId });
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        // Send WebSocket-level ping (browser auto-responds with pong)
        client.isAlive = false;
        try {
          client.ws.ping();
        } catch (e) {
          // Ignore ping errors on closing connections
        }

        // Send application-level heartbeat message
        if (client.ws.readyState === WebSocket.OPEN) {
          this._send(clientId, { type: 'heartbeat', timestamp: now });
        }
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Send message to specific client
   * @private
   */
  _send(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.warn('Failed to send WebSocket message', {
          clientId,
          error: error.message
        });
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message object to broadcast
   */
  broadcast(message) {
    const data = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });

    for (const [clientId, client] of this.clients.entries()) {
      // Check subscription
      if (!client.subscriptions.has('*') && !client.subscriptions.has(message.type)) {
        continue;
      }

      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(data);
        } catch (error) {
          logger.warn('Failed to broadcast to client', {
            clientId,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection stats
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      clients: Array.from(this.clients.entries()).map(([id, c]) => ({
        id,
        ip: c.ip,
        lastPing: c.lastPing,
        subscriptions: Array.from(c.subscriptions),
      })),
    };
  }

  /**
   * Close the server and all connections
   */
  close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    for (const [_, client] of this.clients) {
      try {
        client.ws.close(1001, 'Server shutting down');
      } catch (error) {
        // Ignore close errors
      }
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info('WebSocket server closed');
  }
}

// Event emitter methods for hooks
const emitMethods = {
  /**
   * Emit agent status update
   */
  emitAgentUpdate(data) {
    this.broadcast({
      type: 'agent_update',
      agentIndex: data.agentIndex,
      agentName: data.agentName,
      featureId: data.featureId,
      featureName: data.featureName,
      state: data.state, // thinking, working, testing, success, error
      thought: data.thought,
      progress: data.progress,
    });
  },

  /**
   * Emit log line
   */
  emitLog(line, options = {}) {
    this.broadcast({
      type: 'log',
      line,
      level: options.level || 'info',
      agentIndex: options.agentIndex,
      featureId: options.featureId,
      source: options.source || 'system',
    });
  },

  /**
   * Emit phase transition
   */
  emitPhaseChange(data) {
    this.broadcast({
      type: 'phase_change',
      previousPhase: data.previousPhase,
      currentPhase: data.currentPhase,
      stage: data.stage,
      unit: data.unit,
    });
  },

  /**
   * Emit progress update
   */
  emitProgress(data) {
    this.broadcast({
      type: 'progress',
      passing: data.passing,
      inProgress: data.inProgress,
      total: data.total,
      percentage: data.percentage,
    });
  },

  /**
   * Emit checkpoint saved
   */
  emitCheckpoint(data) {
    this.broadcast({
      type: 'checkpoint',
      checkpointId: data.checkpointId,
      phase: data.phase,
      stage: data.stage,
      message: data.message,
    });
  },

  /**
   * Emit feature/task update
   */
  emitFeatureUpdate(data) {
    this.broadcast({
      type: 'feature_update',
      featureId: data.featureId,
      status: data.status,
      title: data.title,
      assignedAgent: data.assignedAgent,
    });
  },

  /**
   * Emit orchestrator status
   */
  emitOrchestratorUpdate(data) {
    this.broadcast({
      type: 'orchestrator_update',
      state: data.state, // idle, initializing, orchestrating, complete
      codingAgents: data.codingAgents,
      testingAgents: data.testingAgents,
      readyCount: data.readyCount,
      blockedCount: data.blockedCount,
    });
  },

  /**
   * Emit celebration trigger
   */
  emitCelebration(data) {
    this.broadcast({
      type: 'celebration',
      featureId: data.featureId,
      featureName: data.featureName,
      agentName: data.agentName,
    });
  },

  /**
   * Emit swarm team formation event
   */
  emitTeamFormation(data) {
    this.broadcast({
      type: 'team_formation',
      teamName: data.teamName,
      pattern: data.pattern,
      memberCount: data.memberCount,
      phase: data.phase,
      members: data.members, // [{ agentName, role }]
    });
  },

  /**
   * Emit swarm team status update
   */
  emitTeamUpdate(data) {
    this.broadcast({
      type: 'team_update',
      teamName: data.teamName,
      status: data.status,
      tasksCompleted: data.tasksCompleted,
      tasksTotal: data.tasksTotal,
      activeMembers: data.activeMembers,
    });
  },

  /**
   * Emit swarm team member status change
   */
  emitTeamMemberStatus(data) {
    this.broadcast({
      type: 'team_member_status',
      teamName: data.teamName,
      memberName: data.memberName,
      agentName: data.agentName,
      status: data.status,
      currentTask: data.currentTask,
    });
  },

  /**
   * Emit unit/task status change (triggers dashboard Kanban refetch)
   */
  emitUnitUpdate(data) {
    this.broadcast({
      type: 'feature_update',
      featureId: data.featureId,
      status: data.status,
      title: data.title,
      assignedAgent: data.assignedAgent,
    });
  },

  /**
   * Emit GICL session start
   */
  emitGICLSessionStart(data) {
    this.broadcast({
      type: 'gicl_session_start',
      sessionId: data.sessionId,
      targetFile: data.targetFile,
      complexity: data.complexity,
      maxIterations: data.maxIterations,
    });
  },

  /**
   * Emit GICL iteration complete
   */
  emitGICLIterationComplete(data) {
    this.broadcast({
      type: 'gicl_iteration_complete',
      sessionId: data.sessionId,
      iteration: data.iteration,
      score: data.score,
      grade: data.grade,
      shouldContinue: data.shouldContinue,
    });
  },

  /**
   * Emit GICL session complete
   */
  emitGICLSessionComplete(data) {
    this.broadcast({
      type: 'gicl_session_complete',
      sessionId: data.sessionId,
      finalScore: data.finalScore,
      reason: data.reason,
      totalIterations: data.totalIterations,
    });
  },

  /**
   * Emit cost update for a GICL iteration
   */
  emitCostUpdate(data) {
    this.broadcast({
      type: 'cost_update',
      sessionId: data.sessionId,
      iteration: data.iteration,
      costUsd: data.costUsd,
      modelId: data.modelId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Emit AI session discovered event
   */
  emitSessionDiscovered(data) {
    this.broadcast({
      type: 'session_discovered',
      adapterID: data.adapterID,
      session: data.session,
    });
  },

  /**
   * Emit AI session updated event
   */
  emitSessionUpdated(data) {
    this.broadcast({
      type: 'session_updated',
      adapterID: data.adapterID,
      sessionID: data.sessionID,
      filePath: data.filePath,
    });
  },

  /**
   * Emit AI message added event
   */
  emitMessageAdded(data) {
    this.broadcast({
      type: 'message_added',
      adapterID: data.adapterID,
      sessionID: data.sessionID,
      message: data.message,
    });
  },

  /**
   * Emit file changed event from tiered watcher
   */
  emitFileChanged(data) {
    this.broadcast({
      type: 'file_changed',
      path: data.path,
      tier: data.tier,
      timestamp: new Date().toISOString(),
    });
  },
};

// Add emit methods to class prototype
Object.assign(DashboardWebSocketServer.prototype, emitMethods);

// Singleton instance
let instance = null;

/**
 * Get existing WebSocket server instance
 * @returns {DashboardWebSocketServer|null} Server instance or null if not created
 */
function getWebSocketServer() {
  return instance;
}

/**
 * Create new WebSocket server instance
 * @param {Object} options - Server options
 * @returns {DashboardWebSocketServer} New server instance
 */
function createWebSocketServer(options) {
  if (instance) {
    logger.warn('WebSocket server already exists, returning existing instance');
    return instance;
  }
  instance = new DashboardWebSocketServer(options);
  return instance;
}

module.exports = {
  DashboardWebSocketServer,
  getWebSocketServer,
  createWebSocketServer,
};
