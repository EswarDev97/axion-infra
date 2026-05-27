/**
 * Unit Orchestrator for Multi-Agent Parallel Execution
 *
 * Manages parallel unit execution with concurrency control, dependency resolution,
 * retry policies, and WebSocket event emission.
 *
 * @module lib/unit-orchestrator
 */

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const path = require('path');
const { DependencyResolver } = require('./dependency-resolver');
const { getWebSocketServer } = require('./websocket-server');
const logger = require('./logger');

/**
 * Default orchestrator configuration
 */
const DEFAULT_CONFIG = {
    maxConcurrency: 3,
    retryFailedUnits: true,
    maxRetries: 2,
    unitTimeout: 30 * 60 * 1000, // 30 minutes
    pauseOnFailure: false,
};

/**
 * Agent name generator
 * @param {number} index - Agent index
 * @returns {string} Human-readable agent name
 */
function getAgentName(index) {
    const names = ['Coder', 'Builder', 'Architect', 'Developer', 'Engineer'];
    const suffix = Math.floor(index / names.length);
    return names[index % names.length] + (suffix > 0 ? ` ${suffix + 1}` : '');
}

/**
 * UnitOrchestrator - Manages parallel unit execution
 */
class UnitOrchestrator extends EventEmitter {
    /**
     * @param {Object} db - better-sqlite3 database instance
     * @param {Object} config - Orchestrator configuration
     */
    constructor(db, config = {}) {
        super();

        this.db = db;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.resolver = new DependencyResolver(db);

        this.state = 'idle';
        this.runId = null;
        this.sessionId = null;

        this.activeSessions = new Map(); // unitId -> { process, startTime, retries, timeout, agentIndex, agentName }
    }

    /**
     * Initialize orchestration for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<number>} Orchestration run ID
     */
    async initialize(sessionId) {
        this.sessionId = sessionId;
        this.state = 'initializing';

        // Check for cycles
        const cycles = this.resolver.detectCycles(sessionId);
        if (cycles.length > 0) {
            const cycleDesc = cycles.map(c => c.join(' → ')).join('; ');
            throw new Error(`Dependency cycles detected: ${cycleDesc}`);
        }

        // Count units
        const unitCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM units WHERE session_id = ?
    `).get(sessionId);

        // Create orchestration run
        const result = this.db.prepare(`
      INSERT INTO orchestration_runs (session_id, max_concurrency, total_units)
      VALUES (?, ?, ?)
    `).run(sessionId, this.config.maxConcurrency, unitCount.count);

        this.runId = result.lastInsertRowid;

        // Mark units without dependencies as ready
        this.db.prepare(`
      UPDATE units SET status = 'ready'
      WHERE session_id = ? AND status = 'pending'
      AND id NOT IN (SELECT unit_id FROM unit_dependencies)
    `).run(sessionId);

        this._emitStatus();

        logger.info(`Orchestrator initialized for session ${sessionId}`, {
            runId: this.runId,
            totalUnits: unitCount.count,
            maxConcurrency: this.config.maxConcurrency,
        });

        return this.runId;
    }

    /**
     * Start orchestration
     * @returns {Promise<void>}
     */
    async start() {
        if (this.state !== 'initializing' && this.state !== 'paused') {
            throw new Error(`Cannot start from state: ${this.state}`);
        }

        this.state = 'running';
        this.db.prepare(`
      UPDATE orchestration_runs SET status = 'running' WHERE id = ?
    `).run(this.runId);

        this._emitStatus();
        this._scheduleNext();

        logger.info('Orchestrator started', { runId: this.runId });
    }

    /**
     * Pause orchestration (finish current units, don't start new ones)
     */
    pause() {
        this.state = 'paused';
        this.db.prepare(`
      UPDATE orchestration_runs SET status = 'paused' WHERE id = ?
    `).run(this.runId);
        this._emitStatus();
        logger.info('Orchestrator paused', { runId: this.runId });
    }

    /**
     * Resume from paused state
     */
    resume() {
        if (this.state !== 'paused') return;

        this.state = 'running';
        this.db.prepare(`
      UPDATE orchestration_runs SET status = 'running' WHERE id = ?
    `).run(this.runId);
        this._scheduleNext();
        this._emitStatus();
        logger.info('Orchestrator resumed', { runId: this.runId });
    }

    /**
     * Stop orchestration (terminate all units, abort)
     * @returns {Promise<void>}
     */
    async stop() {
        this.state = 'failed';

        // Kill all active sessions
        for (const [unitId, session] of this.activeSessions) {
            if (session.timeout) {
                clearTimeout(session.timeout);
            }
            try {
                session.process.kill('SIGTERM');
            } catch (e) {
                // Ignore kill errors
            }
            this._markUnitFailed(unitId, 'Orchestration stopped');
        }

        this.activeSessions.clear();

        this.db.prepare(`
      UPDATE orchestration_runs SET status = 'failed', completed_at = datetime('now')
      WHERE id = ?
    `).run(this.runId);

        this._emitStatus();
        logger.info('Orchestrator stopped', { runId: this.runId });
    }

    /**
     * Get current orchestration statistics
     * @returns {Object} Stats object
     */
    getStats() {
        const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready
      FROM units WHERE session_id = ?
    `).get(this.sessionId);

        return {
            state: this.state,
            runId: this.runId,
            totalUnits: stats.total || 0,
            completedUnits: stats.completed || 0,
            failedUnits: stats.failed || 0,
            inProgressUnits: stats.in_progress || 0,
            blockedUnits: stats.blocked || 0,
            readyUnits: stats.ready || 0,
            activeSessionCount: this.activeSessions.size,
            maxConcurrency: this.config.maxConcurrency,
        };
    }

    /**
     * Schedule next available units for execution
     * @private
     */
    _scheduleNext() {
        if (this.state !== 'running') return;

        const available = this.config.maxConcurrency - this.activeSessions.size;
        if (available <= 0) return;

        const readyUnits = this.resolver.getReadyUnits(this.sessionId);
        const toStart = readyUnits.slice(0, available);

        for (const unit of toStart) {
            this._startUnit(unit);
        }

        // Check if we're done
        if (this.activeSessions.size === 0 && readyUnits.length === 0) {
            this._checkCompletion();
        }
    }

    /**
     * Start processing a unit
     * @param {Object} unit - Unit to start
     * @private
     */
    _startUnit(unit) {
        const unitId = unit.id;
        const agentIndex = this.activeSessions.size;
        const genericName = getAgentName(agentIndex);
        // Preserve specialist agent assigned from the plan; fall back to generic name
        const agentName = unit.assigned_agent || genericName;

        logger.info(`Starting unit ${unitId}: ${unit.name}`, { agentName });

        // Update unit status — only set assigned_agent if not already set from the plan
        this.db.prepare(`
      UPDATE units SET
        status = 'in_progress',
        assigned_agent = COALESCE(assigned_agent, ?),
        started_at = datetime('now')
      WHERE id = ?
    `).run(genericName, unitId);

        // Create execution record
        this.db.prepare(`
      INSERT INTO unit_executions (unit_id, orchestration_run_id, agent_index, agent_name)
      VALUES (?, ?, ?, ?)
    `).run(unitId, this.runId, agentIndex, agentName);

        // Spawn session runner process
        const runnerPath = path.join(__dirname, '../bin/session-runner.js');
        const runner = spawn('node', [
            runnerPath,
            '--unit-id', unitId.toString(),
            '--session-id', this.sessionId,
            '--agent-index', agentIndex.toString(),
        ], {
            stdio: ['inherit', 'pipe', 'pipe'],
            env: {
                ...process.env,
                AICODEPATH_UNIT_ID: unitId.toString(),
                AICODEPATH_AGENT_INDEX: agentIndex.toString(),
            },
        });

        // Handle output
        runner.stdout.on('data', (data) => {
            const line = data.toString().trim();
            if (line) {
                this._emitLog(line, { agentIndex, unitId });
            }
        });

        runner.stderr.on('data', (data) => {
            const line = data.toString().trim();
            if (line) {
                this._emitLog(line, { agentIndex, unitId, level: 'error' });
            }
        });

        // Handle completion
        runner.on('exit', (code, signal) => {
            this._handleUnitComplete(unitId, code, signal);
        });

        // Setup timeout
        const timeout = setTimeout(() => {
            logger.warn(`Unit ${unitId} timed out`, { timeout: this.config.unitTimeout });
            runner.kill('SIGTERM');
            this._handleUnitComplete(unitId, 124, 'TIMEOUT');
        }, this.config.unitTimeout);

        // Track active session
        this.activeSessions.set(unitId, {
            process: runner,
            startTime: Date.now(),
            timeout,
            retries: 0,
            agentIndex,
            agentName,
        });

        // Emit agent update
        this._emitAgentUpdate(unitId, 'working', 'Starting...');
    }

    /**
     * Handle unit completion
     * @param {number} unitId - Unit ID
     * @param {number} exitCode - Process exit code
     * @param {string} signal - Process signal
     * @private
     */
    _handleUnitComplete(unitId, exitCode, signal) {
        const session = this.activeSessions.get(unitId);
        if (!session) return;

        clearTimeout(session.timeout);
        this.activeSessions.delete(unitId);

        const success = exitCode === 0;
        const unit = this.db.prepare(`SELECT * FROM units WHERE id = ?`).get(unitId);

        logger.info(`Unit ${unitId} completed`, {
            name: unit?.name,
            exitCode,
            signal,
            success,
        });

        if (success) {
            this._markUnitCompleted(unitId);
            this._emitAgentUpdate(unitId, 'success', 'Completed!');

            // Trigger celebration
            const wsServer = getWebSocketServer();
            if (wsServer && unit) {
                wsServer.emitCelebration({
                    featureId: unitId,
                    featureName: unit.name,
                    agentName: session.agentName,
                });
            }

            // Unlock dependents
            const nowReady = this.resolver.notifyCompletion(unitId);
            if (nowReady.length > 0) {
                logger.debug(`Unlocked ${nowReady.length} dependent units`);
            }
        } else {
            // Check retry
            if (this.config.retryFailedUnits && session.retries < this.config.maxRetries) {
                logger.info(`Retrying unit ${unitId}`, {
                    attempt: session.retries + 1,
                    maxRetries: this.config.maxRetries,
                });

                // Reset and retry
                this.db.prepare(`UPDATE units SET status = 'ready' WHERE id = ?`).run(unitId);

                // Re-queue with incremented retry count
                setTimeout(() => {
                    if (this.state === 'running' && unit) {
                        const newSession = { ...session, retries: session.retries + 1 };
                        // Don't re-add to activeSessions - let _scheduleNext pick it up
                    }
                    this._scheduleNext();
                }, 1000);
                return;
            }

            this._markUnitFailed(unitId, signal || `Exit code: ${exitCode}`);
            this._emitAgentUpdate(unitId, 'error', 'Failed');

            // Block downstream
            this.resolver.notifyFailure(unitId);

            if (this.config.pauseOnFailure) {
                this.pause();
                return;
            }
        }

        this._emitStatus();
        this._scheduleNext();
    }

    /**
     * Mark unit as completed
     * @param {number} unitId - Unit ID
     * @private
     */
    _markUnitCompleted(unitId) {
        this.db.prepare(`
      UPDATE units SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `).run(unitId);

        this.db.prepare(`
      UPDATE unit_executions SET status = 'completed', completed_at = datetime('now'), exit_code = 0
      WHERE unit_id = ? AND status = 'running'
    `).run(unitId);

        this.db.prepare(`
      UPDATE orchestration_runs SET completed_units = completed_units + 1
      WHERE id = ?
    `).run(this.runId);
    }

    /**
     * Mark unit as failed
     * @param {number} unitId - Unit ID
     * @param {string} errorMessage - Error description
     * @private
     */
    _markUnitFailed(unitId, errorMessage) {
        this.db.prepare(`
      UPDATE units SET status = 'failed', completed_at = datetime('now')
      WHERE id = ?
    `).run(unitId);

        this.db.prepare(`
      UPDATE unit_executions SET
        status = 'failed',
        completed_at = datetime('now'),
        exit_code = 1,
        error_message = ?
      WHERE unit_id = ? AND status = 'running'
    `).run(errorMessage, unitId);

        this.db.prepare(`
      UPDATE orchestration_runs SET failed_units = failed_units + 1
      WHERE id = ?
    `).run(this.runId);
    }

    /**
     * Check if orchestration is complete
     * @private
     */
    _checkCompletion() {
        const stats = this.getStats();

        if (stats.completedUnits + stats.failedUnits + stats.blockedUnits === stats.totalUnits) {
            this.state = stats.failedUnits > 0 || stats.blockedUnits > 0 ? 'failed' : 'completed';

            this.db.prepare(`
        UPDATE orchestration_runs SET status = ?, completed_at = datetime('now')
        WHERE id = ?
      `).run(this.state, this.runId);

            this._emitStatus();
            this.emit('complete', stats);

            logger.info(`Orchestration ${this.state}`, {
                completed: stats.completedUnits,
                failed: stats.failedUnits,
                blocked: stats.blockedUnits,
                total: stats.totalUnits,
            });
        }
    }

    /**
     * Emit orchestrator status to WebSocket
     * @private
     */
    _emitStatus() {
        const wsServer = getWebSocketServer();
        if (wsServer) {
            const stats = this.getStats();
            wsServer.emitOrchestratorUpdate({
                state: stats.state,
                codingAgents: stats.inProgressUnits,
                testingAgents: 0,
                readyCount: stats.readyUnits,
                blockedCount: stats.blockedUnits,
            });
            wsServer.emitProgress({
                passing: stats.completedUnits,
                inProgress: stats.inProgressUnits,
                total: stats.totalUnits,
                percentage: stats.totalUnits > 0 ? Math.round((stats.completedUnits / stats.totalUnits) * 100) : 0,
            });
        }
    }

    /**
     * Emit agent update to WebSocket
     * @param {number} unitId - Unit ID
     * @param {string} state - Agent state
     * @param {string} thought - Agent thought/status
     * @private
     */
    _emitAgentUpdate(unitId, state, thought) {
        const session = this.activeSessions.get(unitId);
        const unit = this.db.prepare(`SELECT * FROM units WHERE id = ?`).get(unitId);

        const wsServer = getWebSocketServer();
        if (wsServer && unit) {
            wsServer.emitAgentUpdate({
                agentIndex: session?.agentIndex || 0,
                agentName: session?.agentName || 'Agent',
                featureId: unitId,
                featureName: unit.name,
                state,
                thought,
            });
        }
    }

    /**
     * Emit log line to WebSocket
     * @param {string} line - Log line
     * @param {Object} options - Log options
     * @private
     */
    _emitLog(line, options = {}) {
        const wsServer = getWebSocketServer();
        if (wsServer) {
            wsServer.emitLog(line, options);
        }
    }
}

module.exports = { UnitOrchestrator, getAgentName };
