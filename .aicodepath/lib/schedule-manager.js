/**
 * Schedule Manager - Backend cron job scheduler
 *
 * Manages scheduled tasks using node-cron with database persistence.
 * Supports test runs, builds, linting, and custom commands.
 *
 * @module lib/schedule-manager
 */

const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const pathResolver = require('./path-resolver');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class ScheduleManager {
  constructor(db = null) {
    this.db = db;
    this.jobs = new Map(); // id -> cron job
    this.runCallbacks = new Set(); // Callbacks for run events

    // If no DB provided, create one
    if (!this.db) {
      this._initDatabase();
    }

    this._prepareStatements();
    this._loadSchedules();

    // Clean up on exit
    process.on('exit', () => this._cleanup());
    process.on('SIGINT', () => {
      this._cleanup();
      process.exit(0);
    });
  }

  /**
   * Initialize the schedules database
   * @private
   */
  _initDatabase() {
    const dbDir = path.dirname(pathResolver.getDbPath());
    const dbPath = path.join(dbDir, 'schedules.db');

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        action TEXT NOT NULL,
        custom_command TEXT,
        cron_expression TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedule_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id TEXT NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        status TEXT DEFAULT 'running',
        output TEXT,
        exit_code INTEGER,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_runs_schedule_id ON schedule_runs(schedule_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_runs_status ON schedule_runs(status);
    `);
  }

  /**
   * Prepare SQL statements for performance
   * @private
   */
  _prepareStatements() {
    this.stmts = {
      // Schedules
      getAll: this.db.prepare('SELECT * FROM schedules ORDER BY created_at DESC'),
      get: this.db.prepare('SELECT * FROM schedules WHERE id = ?'),
      getEnabled: this.db.prepare('SELECT * FROM schedules WHERE enabled = 1'),
      insert: this.db.prepare(`
        INSERT INTO schedules (id, name, action, custom_command, cron_expression, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      update: this.db.prepare(`
        UPDATE schedules
        SET name = ?, action = ?, custom_command = ?, cron_expression = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `),
      updateEnabled: this.db.prepare('UPDATE schedules SET enabled = ? WHERE id = ?'),
      delete: this.db.prepare('DELETE FROM schedules WHERE id = ?'),

      // Runs
      recordRunStart: this.db.prepare(`
        INSERT INTO schedule_runs (schedule_id, started_at, status)
        VALUES (?, datetime('now'), 'running')
      `),
      recordRunComplete: this.db.prepare(`
        UPDATE schedule_runs
        SET completed_at = datetime('now'), status = ?, output = ?, exit_code = ?
        WHERE id = ?
      `),
      getRecentRuns: this.db.prepare(`
        SELECT * FROM schedule_runs
        WHERE schedule_id = ?
        ORDER BY started_at DESC
        LIMIT 10
      `),
      getRunsByStatus: this.db.prepare(`
        SELECT sr.*, s.name as schedule_name
        FROM schedule_runs sr
        JOIN schedules s ON sr.schedule_id = s.id
        WHERE sr.status = ?
        ORDER BY sr.started_at DESC
        LIMIT 50
      `),
    };
  }

  /**
   * Load and start all enabled schedules from database
   * @private
   */
  _loadSchedules() {
    const schedules = this.stmts.getEnabled.all();

    for (const schedule of schedules) {
      try {
        this._startJob(schedule);
      } catch (error) {
        console.error(`[Scheduler] Failed to load schedule ${schedule.name}:`, error.message);
      }
    }

    console.log(`[Scheduler] Loaded ${schedules.length} schedule(s), ${this.jobs.size} active`);
  }

  /**
   * Start a cron job for a schedule
   * @private
   * @param {Object} schedule - Schedule object from database
   */
  _startJob(schedule) {
    // Stop existing job if running
    this._stopJob(schedule.id);

    // Validate cron expression
    if (!cron.validate(schedule.cron_expression)) {
      console.error(`[Scheduler] Invalid cron expression for ${schedule.name}: ${schedule.cron_expression}`);
      return;
    }

    // Create scheduled task
    const task = cron.schedule(schedule.cron_expression, () => {
      this._runSchedule(schedule);
    }, {
      scheduled: false,
    });

    // Start the task
    task.start();

    // Store job
    this.jobs.set(schedule.id, {
      task,
      schedule,
    });

    console.log(`[Scheduler] Started: ${schedule.name} (${schedule.cron_expression})`);
  }

  /**
   * Stop a cron job
   * @private
   * @param {string} scheduleId - Schedule ID to stop
   */
  _stopJob(scheduleId) {
    const job = this.jobs.get(scheduleId);
    if (job) {
      job.task.stop();
      this.jobs.delete(scheduleId);
    }
  }

  /**
   * Execute a scheduled task
   * @private
   * @param {Object} schedule - Schedule to run
   */
  async _runSchedule(schedule) {
    const runId = this.stmts.recordRunStart.run(schedule.id).lastInsertRowid;
    console.log(`[Scheduler] Running: ${schedule.name} (run #${runId})`);

    // Notify callbacks
    this._notifyRunStart(schedule, runId);

    let command, args;

    // Determine command based on action
    switch (schedule.action) {
      case 'run_tests':
        command = 'npm';
        args = ['test'];
        break;
      case 'build':
        command = 'npm';
        args = ['run', 'build'];
        break;
      case 'lint':
        command = 'npm';
        args = ['run', 'lint'];
        break;
      case 'custom':
        const parts = (schedule.custom_command || '').split(/\s+/);
        command = parts[0];
        args = parts.slice(1);
        break;
      default:
        this._recordRunComplete(runId, 'failed', 'Unknown action type', 1);
        return;
    }

    // Spawn process
    const proc = spawn(command, args, {
      shell: true,
      cwd: pathResolver.findProjectRoot(),
      env: { ...process.env },
    });

    let output = '';
    let errorOutput = '';

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      const status = code === 0 ? 'success' : 'failed';
      const fullOutput = output + errorOutput;

      // Truncate output to prevent database bloat
      const truncatedOutput = fullOutput.slice(-50000);

      this._recordRunComplete(runId, status, truncatedOutput, code);
      this._notifyRunComplete(schedule, runId, status, code);
    });

    proc.on('error', (error) => {
      console.error(`[Scheduler] Process error for ${schedule.name}:`, error);
      this._recordRunComplete(runId, 'failed', error.message, 1);
      this._notifyRunComplete(schedule, runId, 'failed', 1);
    });
  }

  /**
   * Record run completion in database
   * @private
   */
  _recordRunComplete(runId, status, output, exitCode) {
    this.stmts.recordRunComplete.run(status, output, exitCode, runId);
  }

  /**
   * Notify callbacks of run start
   * @private
   */
  _notifyRunStart(schedule, runId) {
    for (const callback of this.runCallbacks) {
      try {
        callback({
          type: 'start',
          schedule,
          runId,
        });
      } catch (error) {
        console.error('[Scheduler] Callback error:', error);
      }
    }
  }

  /**
   * Notify callbacks of run completion
   * @private
   */
  _notifyRunComplete(schedule, runId, status, exitCode) {
    for (const callback of this.runCallbacks) {
      try {
        callback({
          type: 'complete',
          schedule,
          runId,
          status,
          exitCode,
        });
      } catch (error) {
        console.error('[Scheduler] Callback error:', error);
      }
    }
  }

  /**
   * Clean up resources
   * @private
   */
  _cleanup() {
    console.log('[Scheduler] Stopping all jobs...');
    for (const [id, job] of this.jobs.entries()) {
      job.task.stop();
    }
    this.jobs.clear();
  }

  /**
   * Get all schedules
   * @returns {Array} All schedules from database
   */
  getAll() {
    const schedules = this.stmts.getAll.all();
    return schedules.map(s => this._enrichSchedule(s));
  }

  /**
   * Get a schedule by ID
   * @param {string} id - Schedule ID
   * @returns {Object|null} Schedule object or null
   */
  get(id) {
    const schedule = this.stmts.get.get(id);
    return schedule ? this._enrichSchedule(schedule) : null;
  }

  /**
   * Enrich schedule with computed properties
   * @private
   */
  _enrichSchedule(schedule) {
    const recentRuns = this.stmts.getRecentRuns.all(schedule.id);
    const lastRun = recentRuns[0];

    return {
      ...schedule,
      enabled: Boolean(schedule.enabled),
      runCount: recentRuns.length,
      lastRun: lastRun?.started_at,
      lastStatus: lastRun?.status,
    };
  }

  /**
   * Create a new schedule
   * @param {Object} data - Schedule data
   * @returns {Object} Created schedule
   */
  create(data) {
    const id = uuidv4();

    this.stmts.insert.run(
      id,
      data.name,
      data.action,
      data.customCommand || null,
      data.cron,
      data.enabled ? 1 : 0
    );

    const schedule = this.stmts.get.get(id);

    if (schedule.enabled) {
      this._startJob(schedule);
    }

    return this._enrichSchedule(schedule);
  }

  /**
   * Update an existing schedule
   * @param {string} id - Schedule ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated schedule
   */
  update(id, data) {
    this.stmts.update.run(
      data.name,
      data.action,
      data.customCommand || null,
      data.cron,
      data.enabled ? 1 : 0,
      id
    );

    const schedule = this.stmts.get.get(id);

    // Restart job if enabled
    if (schedule.enabled) {
      this._startJob(schedule);
    } else {
      this._stopJob(id);
    }

    return this._enrichSchedule(schedule);
  }

  /**
   * Update schedule enabled state
   * @param {string} id - Schedule ID
   * @param {boolean} enabled - Enabled state
   * @returns {Object} Updated schedule
   */
  setEnabled(id, enabled) {
    this.stmts.updateEnabled.run(enabled ? 1 : 0, id);
    const schedule = this.stmts.get.get(id);

    if (enabled) {
      this._startJob(schedule);
    } else {
      this._stopJob(id);
    }

    return this._enrichSchedule(schedule);
  }

  /**
   * Delete a schedule
   * @param {string} id - Schedule ID
   */
  delete(id) {
    this._stopJob(id);
    this.stmts.delete.run(id);
  }

  /**
   * Run a schedule immediately
   * @param {string} id - Schedule ID
   */
  runNow(id) {
    const schedule = this.stmts.get.get(id);
    if (schedule) {
      this._runSchedule(schedule);
    }
  }

  /**
   * Get recent runs for a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Array} Recent runs
   */
  getRuns(scheduleId) {
    return this.stmts.getRecentRuns.all(scheduleId);
  }

  /**
   * Register callback for run events
   * @param {Function} callback - Callback function
   */
  onRun(callback) {
    this.runCallbacks.add(callback);
  }

  /**
   * Unregister callback
   * @param {Function} callback - Callback function
   */
  offRun(callback) {
    this.runCallbacks.delete(callback);
  }

  /**
   * Get scheduler statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const all = this.stmts.getAll.all();
    const enabled = all.filter(s => s.enabled);

    return {
      total: all.length,
      enabled: enabled.length,
      disabled: all.length - enabled.length,
      activeJobs: this.jobs.size,
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton ScheduleManager instance
 * @returns {ScheduleManager} The ScheduleManager instance
 */
function getScheduleManager() {
  if (!instance) {
    instance = new ScheduleManager();
  }
  return instance;
}

module.exports = { ScheduleManager, getScheduleManager };
