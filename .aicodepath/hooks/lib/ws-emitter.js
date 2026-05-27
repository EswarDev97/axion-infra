/**
 * WebSocket Emitter for AICodePath Hooks
 *
 * Safe WebSocket emitter for hooks that gracefully handles cases where
 * WebSocket server isn't running. This allows hooks to emit events
 * without breaking when the dashboard/WebSocket server is not active.
 *
 * @module hooks/lib/ws-emitter
 */

/**
 * Get WebSocket server instance
 * @returns {Object|null} WebSocket server instance or null
 */
function _getServer() {
  try {
    // Try to get the WebSocket server instance
    // This will be created by the dashboard server when it starts
    const { getWebSocketServer } = require('../../lib/websocket-server');
    return getWebSocketServer();
  } catch (e) {
    // WebSocket server not available - that's OK
    return null;
  }
}

/**
 * Hook WebSocket Emitter Class
 *
 * Provides safe emission methods that won't break when WebSocket
 * server is not running.
 */
class HookWebSocketEmitter {
  /**
   * Emit agent status update
   * @param {Object} data - Agent update data
   * @param {number} data.agentIndex - Agent index
   * @param {string} data.agentName - Agent name (e.g., 'Coder', 'Tester')
   * @param {number} data.featureId - Feature/task ID
   * @param {string} data.featureName - Feature/task name
   * @param {string} data.state - Agent state: 'thinking', 'working', 'testing', 'success', 'error'
   * @param {string} [data.thought] - Current thought/reasoning
   * @param {number} [data.progress] - Progress percentage (0-100)
   */
  emitAgentUpdate(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitAgentUpdate(data);
      } catch (e) {
        // Silently fail - WebSocket emission is non-critical
      }
    }
  }

  /**
   * Emit log line
   * @param {string} line - Log message
   * @param {Object} [options] - Optional parameters
   * @param {string} [options.level] - Log level: 'info', 'warn', 'error', 'debug'
   * @param {number} [options.agentIndex] - Associated agent index
   * @param {number} [options.featureId] - Associated feature ID
   * @param {string} [options.source] - Log source (e.g., 'phase-transition-hook')
   */
  emitLog(line, options = {}) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitLog(line, options);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit phase transition
   * @param {Object} data - Phase change data
   * @param {string} data.previousPhase - Previous phase name
   * @param {string} data.currentPhase - New phase name
   * @param {string} [data.stage] - Current stage
   * @param {string} [data.unit] - Current unit
   */
  emitPhaseChange(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitPhaseChange(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit progress update
   * @param {Object} data - Progress data
   * @param {number} data.passing - Number of passing items
   * @param {number} data.inProgress - Number of in-progress items
   * @param {number} data.total - Total number of items
   * @param {number} data.percentage - Progress percentage (0-100)
   */
  emitProgress(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitProgress(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit checkpoint saved event
   * @param {Object} data - Checkpoint data
   * @param {string} data.checkpointId - Checkpoint ID
   * @param {string} data.phase - Current phase
   * @param {string} data.stage - Current stage
   * @param {string} [data.message] - Optional message
   */
  emitCheckpoint(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitCheckpoint(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit feature/task update
   * @param {Object} data - Feature update data
   * @param {number} data.featureId - Feature ID
   * @param {string} data.status - Feature status
   * @param {string} data.title - Feature title
   * @param {string} [data.assignedAgent] - Assigned agent name
   */
  emitFeatureUpdate(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitFeatureUpdate(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit orchestrator status update
   * @param {Object} data - Orchestrator status
   * @param {string} data.state - Orchestrator state: 'idle', 'initializing', 'orchestrating', 'complete'
   * @param {number} data.codingAgents - Number of active coding agents
   * @param {number} data.testingAgents - Number of active testing agents
   * @param {number} data.readyCount - Number of ready agents
   * @param {number} data.blockedCount - Number of blocked agents
   */
  emitOrchestratorUpdate(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitOrchestratorUpdate(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit celebration trigger
   * @param {Object} data - Celebration data
   * @param {number} data.featureId - Completed feature ID
   * @param {string} data.featureName - Completed feature name
   * @param {string} data.agentName - Agent that completed it
   */
  emitCelebration(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitCelebration(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit swarm team formation event
   * @param {Object} data - Team formation data
   * @param {string} data.teamName - Team name
   * @param {string} data.pattern - Orchestration pattern
   * @param {number} data.memberCount - Number of members
   * @param {string} data.phase - AIDLC phase
   * @param {Array} data.members - Array of { agentName, role }
   */
  emitTeamFormation(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitTeamFormation(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit swarm team status update
   * @param {Object} data - Team update data
   * @param {string} data.teamName - Team name
   * @param {string} data.status - Team status
   * @param {number} data.tasksCompleted - Completed task count
   * @param {number} data.tasksTotal - Total task count
   * @param {number} data.activeMembers - Active member count
   */
  emitTeamUpdate(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitTeamUpdate(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit swarm team member status change
   * @param {Object} data - Member status data
   * @param {string} data.teamName - Team name
   * @param {string} data.memberName - Teammate display name
   * @param {string} data.agentName - AICodePath agent name
   * @param {string} data.status - Member status
   * @param {string} [data.currentTask] - Currently assigned task
   */
  emitTeamMemberStatus(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitTeamMemberStatus(data);
      } catch (e) {
        // Silently fail
      }
    }
  }

  /**
   * Emit unit/task status change (triggers dashboard Kanban refetch)
   * @param {Object} data - Unit update data
   * @param {number} data.featureId - Feature/unit ID
   * @param {string} data.status - Unit status
   * @param {string} data.title - Unit title
   * @param {string} [data.assignedAgent] - Assigned agent name
   */
  emitUnitUpdate(data) {
    const ws = _getServer();
    if (ws) {
      try {
        ws.emitUnitUpdate(data);
      } catch (e) {
        // Silently fail - WebSocket emission is non-critical
      }
    }
  }

  /**
   * Emit GICL session start
   * @param {Object} data - Session start data
   * @param {string} data.sessionId - GICL session ID
   * @param {string} data.targetFile - Target file path
   * @param {string} data.complexity - Complexity level
   * @param {number} data.maxIterations - Max iterations allowed
   */
  emitGICLSessionStart(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitGICLSessionStart(data); } catch (e) { /* non-critical */ }
    }
  }

  /**
   * Emit GICL iteration complete
   * @param {Object} data - Iteration result data
   * @param {string} data.sessionId - GICL session ID
   * @param {number} data.iteration - Iteration number
   * @param {number} data.score - Final score
   * @param {string} data.grade - Score grade
   * @param {boolean} data.shouldContinue - Whether loop continues
   */
  emitGICLIterationComplete(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitGICLIterationComplete(data); } catch (e) { /* non-critical */ }
    }
  }

  /**
   * Emit GICL session complete
   * @param {Object} data - Session completion data
   * @param {string} data.sessionId - GICL session ID
   * @param {number} data.finalScore - Final session score
   * @param {string} data.reason - Completion reason
   * @param {number} data.totalIterations - Total iterations run
   */
  emitGICLSessionComplete(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitGICLSessionComplete(data); } catch (e) { /* non-critical */ }
    }
  }

  /**
   * Emit cost update for a GICL iteration
   * @param {Object} data - Cost data
   * @param {string} data.sessionId - GICL session ID
   * @param {number} data.iteration - Iteration number
   * @param {number} data.costUsd - Iteration cost in USD
   * @param {string} data.modelId - Model ID used
   */
  emitCostUpdate(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitCostUpdate(data); } catch (e) { /* non-critical */ }
    }
  }

  /**
   * Emit AI session discovered event
   */
  emitSessionDiscovered(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitSessionDiscovered(data); } catch (e) { /* non-critical */ }
    }
  }

  /**
   * Emit AI session updated event
   */
  emitSessionUpdated(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitSessionUpdated(data); } catch (e) { /* non-critical */ }
    }
  }

  /**
   * Emit AI message added event
   */
  emitMessageAdded(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitMessageAdded(data); } catch (e) { /* non-critical */ }
    }
  }

  /**
   * Emit file changed event from tiered watcher
   */
  emitFileChanged(data) {
    const ws = _getServer();
    if (ws) {
      try { ws.emitFileChanged(data); } catch (e) { /* non-critical */ }
    }
  }
}

// Export singleton instance
module.exports = new HookWebSocketEmitter();
