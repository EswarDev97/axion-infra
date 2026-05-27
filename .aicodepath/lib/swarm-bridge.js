/**
 * Swarm Bridge
 *
 * Adapter that bridges AICodePath's SQLite DAG-based unit system with
 * Claude Code's file-based task system for Agent Teams.
 *
 * Responsibilities:
 * - Sync units table -> task files (for teammates to consume)
 * - Sync task file statuses -> units table + WebSocket events
 * - Translate DAG dependencies into blockedBy references
 * - Polling sync loop to keep dashboard/WebSocket accurate
 *
 * @module lib/swarm-bridge
 */

const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const pathResolver = require('./path-resolver');

/**
 * Swarm Bridge - syncs between AICodePath DB and Claude Code task files
 */
class SwarmBridge {
  /**
   * @param {Object} db - better-sqlite3 database instance
   * @param {string} teamName - Active swarm team name
   */
  constructor(db, teamName) {
    this.db = db;
    this.teamName = teamName;
    this.syncTimer = null;
    this.taskDir = this._getTaskDir();
    this.wsEmitter = null;

    // Lazy-load ws-emitter
    try {
      this.wsEmitter = require('../hooks/lib/ws-emitter');
    } catch {
      // WebSocket emitter not available - non-fatal
    }
  }

  /**
   * Sync AICodePath units to Claude Code task files
   *
   * Reads units from the database for the given session and writes
   * them as JSON task files that teammates can discover and work on.
   *
   * @param {string} sessionId - Current session ID
   * @returns {Object} Sync result with counts
   */
  async syncUnitsToTasks(sessionId) {
    logger.info('Syncing units to task files', {
      context: 'swarm-bridge',
      teamName: this.teamName,
      sessionId,
    });

    this._ensureTaskDir();

    // Get team ID
    const team = this._getTeam();
    if (!team) {
      logger.warn('No active team found', { context: 'swarm-bridge', teamName: this.teamName });
      return { synced: 0, skipped: 0, errors: 0 };
    }

    // Get all units for this session
    const units = this.db.prepare(`
      SELECT u.id, u.name, u.description, u.status, u.priority, u.assigned_agent
      FROM units u
      WHERE u.session_id = ?
      ORDER BY u.priority DESC, u.id ASC
    `).all(sessionId);

    if (units.length === 0) {
      logger.info('No units to sync', { context: 'swarm-bridge' });
      return { synced: 0, skipped: 0, errors: 0 };
    }

    // Get dependency graph for blockedBy translation
    const deps = this.db.prepare(`
      SELECT unit_id, depends_on_unit_id
      FROM unit_dependencies
      WHERE unit_id IN (SELECT id FROM units WHERE session_id = ?)
    `).all(sessionId);

    const depMap = new Map();
    for (const dep of deps) {
      if (!depMap.has(dep.unit_id)) {
        depMap.set(dep.unit_id, []);
      }
      depMap.get(dep.unit_id).push(dep.depends_on_unit_id);
    }

    // Get existing task mappings
    const existingMappings = this.db.prepare(`
      SELECT unit_id, task_id FROM swarm_task_mapping WHERE team_id = ?
    `).all(team.id);

    const existingMap = new Map();
    for (const m of existingMappings) {
      existingMap.set(m.unit_id, m.task_id);
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const unit of units) {
      try {
        // Generate or reuse task ID
        let taskId = existingMap.get(unit.id);
        const isNew = !taskId;
        if (isNew) {
          taskId = `task-${unit.id}-${Date.now().toString(36)}`;
        }

        // Build task file content
        const blockedBy = (depMap.get(unit.id) || [])
          .map(depId => existingMap.get(depId))
          .filter(Boolean);

        const taskData = {
          id: taskId,
          title: unit.name,
          description: unit.description || unit.name,
          status: this._mapUnitStatusToTaskStatus(unit.status),
          priority: unit.priority,
          assignedTo: unit.assigned_agent || null,
          blockedBy,
          metadata: {
            unitId: unit.id,
            teamName: this.teamName,
            source: 'aicodepath',
          },
        };

        // Write task file
        const taskFilePath = path.join(this.taskDir, `${taskId}.json`);
        fs.writeFileSync(taskFilePath, JSON.stringify(taskData, null, 2));

        // Record mapping in database
        if (isNew) {
          this.db.prepare(`
            INSERT INTO swarm_task_mapping (team_id, unit_id, task_id, status, synced_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `).run(team.id, unit.id, taskId, unit.status);
        } else {
          this.db.prepare(`
            UPDATE swarm_task_mapping
            SET status = ?, synced_at = datetime('now')
            WHERE team_id = ? AND unit_id = ?
          `).run(unit.status, team.id, unit.id);
        }

        synced++;
      } catch (error) {
        errors++;
        logger.error('Failed to sync unit to task', {
          context: 'swarm-bridge',
          unitId: unit.id,
          error: error.message,
        });
      }
    }

    // Emit team update
    this._emitTeamUpdate(team);

    logger.info('Units synced to tasks', {
      context: 'swarm-bridge',
      synced,
      skipped,
      errors,
    });

    return { synced, skipped, errors };
  }

  /**
   * Sync Claude Code task file statuses back to AICodePath units
   *
   * Reads task files and updates the units table + emits WebSocket events
   * when statuses change.
   *
   * @param {string} sessionId - Current session ID
   * @returns {Object} Sync result with counts
   */
  async syncTasksToUnits(sessionId) {
    const team = this._getTeam();
    if (!team) return { updated: 0, errors: 0 };

    const mappings = this.db.prepare(`
      SELECT stm.id, stm.unit_id, stm.task_id, stm.status as mapping_status,
             stm.assigned_member_id,
             u.status as unit_status, u.name as unit_name
      FROM swarm_task_mapping stm
      JOIN units u ON u.id = stm.unit_id
      WHERE stm.team_id = ?
    `).all(team.id);

    let updated = 0;
    let errors = 0;

    for (const mapping of mappings) {
      try {
        const taskFilePath = path.join(this.taskDir, `${mapping.task_id}.json`);

        if (!fs.existsSync(taskFilePath)) continue;

        const taskData = JSON.parse(fs.readFileSync(taskFilePath, 'utf-8'));
        const newStatus = this._mapTaskStatusToUnitStatus(taskData.status);

        // Skip if no change
        if (newStatus === mapping.unit_status) continue;

        // Update unit status in database
        this.db.prepare(`
          UPDATE units SET status = ?, ${newStatus === 'completed' ? 'completed_at = datetime("now"),' : ''} assigned_agent = COALESCE(?, assigned_agent)
          WHERE id = ?
        `).run(newStatus, taskData.assignedTo, mapping.unit_id);

        // Update mapping status
        this.db.prepare(`
          UPDATE swarm_task_mapping SET status = ?, synced_at = datetime('now') WHERE id = ?
        `).run(newStatus, mapping.id);

        // Update member stats if assigned
        if (mapping.assigned_member_id) {
          if (newStatus === 'completed') {
            this.db.prepare(`
              UPDATE swarm_team_members SET tasks_completed = tasks_completed + 1 WHERE id = ?
            `).run(mapping.assigned_member_id);
          } else if (newStatus === 'failed') {
            this.db.prepare(`
              UPDATE swarm_team_members SET tasks_failed = tasks_failed + 1 WHERE id = ?
            `).run(mapping.assigned_member_id);
          }
        }

        // Emit feature update via WebSocket
        if (this.wsEmitter) {
          this.wsEmitter.emitFeatureUpdate({
            featureId: mapping.unit_id,
            status: newStatus,
            title: mapping.unit_name,
            assignedAgent: taskData.assignedTo,
          });
        }

        updated++;
      } catch (error) {
        errors++;
        logger.error('Failed to sync task to unit', {
          context: 'swarm-bridge',
          taskId: mapping.task_id,
          error: error.message,
        });
      }
    }

    if (updated > 0) {
      this._emitTeamUpdate(team);
    }

    return { updated, errors };
  }

  /**
   * Start the polling sync loop
   *
   * Periodically syncs task file statuses back to the database and emits
   * WebSocket events to keep the dashboard accurate.
   *
   * @param {number} intervalMs - Polling interval in milliseconds (default: 5000)
   * @param {string} sessionId - Session ID for sync operations
   */
  startSyncLoop(intervalMs = 5000, sessionId) {
    if (this.syncTimer) {
      logger.warn('Sync loop already running', { context: 'swarm-bridge' });
      return;
    }

    logger.info('Starting sync loop', {
      context: 'swarm-bridge',
      intervalMs,
      teamName: this.teamName,
    });

    this.syncTimer = setInterval(async () => {
      try {
        await this.syncTasksToUnits(sessionId);
      } catch (error) {
        logger.warn('Sync loop iteration failed', {
          context: 'swarm-bridge',
          error: error.message,
        });
      }
    }, intervalMs);
  }

  /**
   * Stop the polling sync loop
   */
  stopSyncLoop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('Sync loop stopped', { context: 'swarm-bridge', teamName: this.teamName });
    }
  }

  /**
   * Get the current team from database
   * @private
   */
  _getTeam() {
    return this.db.prepare(`
      SELECT * FROM swarm_teams WHERE team_name = ? AND status != 'disbanded'
    `).get(this.teamName);
  }

  /**
   * Get task directory path for the team
   * @private
   */
  _getTaskDir() {
    const projectRoot = pathResolver.findProjectRoot();
    return path.join(projectRoot, '.claude', 'tasks', this.teamName || 'default');
  }

  /**
   * Ensure the task directory exists
   * @private
   */
  _ensureTaskDir() {
    if (!fs.existsSync(this.taskDir)) {
      fs.mkdirSync(this.taskDir, { recursive: true });
    }
  }

  /**
   * Map AICodePath unit status to Claude Code task status
   * @private
   */
  _mapUnitStatusToTaskStatus(unitStatus) {
    const map = {
      pending: 'todo',
      ready: 'todo',
      in_progress: 'in_progress',
      completed: 'done',
      failed: 'error',
      blocked: 'blocked',
    };
    return map[unitStatus] || 'todo';
  }

  /**
   * Map Claude Code task status to AICodePath unit status
   * @private
   */
  _mapTaskStatusToUnitStatus(taskStatus) {
    const map = {
      todo: 'pending',
      in_progress: 'in_progress',
      done: 'completed',
      error: 'failed',
      blocked: 'blocked',
    };
    return map[taskStatus] || 'pending';
  }

  /**
   * Emit team update event via WebSocket
   * @private
   */
  _emitTeamUpdate(team) {
    if (!this.wsEmitter) return;

    try {
      // Count task stats
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
        FROM swarm_task_mapping
        WHERE team_id = ?
      `).get(team.id);

      // Count active members
      const activeMembers = this.db.prepare(`
        SELECT COUNT(*) as count FROM swarm_team_members
        WHERE team_id = ? AND status = 'active'
      `).get(team.id);

      this.wsEmitter.emitTeamUpdate({
        teamName: team.team_name,
        status: team.status,
        tasksCompleted: stats.completed || 0,
        tasksTotal: stats.total || 0,
        activeMembers: activeMembers.count || 0,
      });
    } catch (error) {
      logger.debug('Failed to emit team update', {
        context: 'swarm-bridge',
        error: error.message,
      });
    }
  }
}

module.exports = { SwarmBridge };
