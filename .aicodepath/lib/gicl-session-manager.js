#!/usr/bin/env node
/**
 * GICL Session Manager
 *
 * Manages session lifecycle for the Governed Iterative Construction Loop.
 * Follows session-state-manager.js patterns: lazy DB init, WAL mode,
 * executeWithRetry, structured logging.
 *
 * @module lib/gicl-session-manager
 */

const Database = require('better-sqlite3');
const path = require('path');
const { findProjectRoot, getDbPath } = require('./path-resolver');
const dbHealth = require('./database-health');
const logger = require('./logger');

const STALE_SESSION_HOURS = 24;
const COMPLEXITY_MAX_ITERATIONS = {
  trivial: 3,
  simple: 5,
  moderate: 7,
  complex: 10,
  very_complex: 15,
};

class GICLSessionManager {
  /**
   * @param {string|null} projectPath - Project root (auto-detected if null)
   */
  constructor(projectPath = null) {
    this.projectRoot = projectPath || findProjectRoot(process.cwd());
    this.db = null;
  }

  /**
   * Lazy-initialize database connection and ensure tables exist.
   * @returns {Database} SQLite database instance
   */
  _ensureDb() {
    if (this.db) return this.db;

    const dbPath = getDbPath();
    this.db = new Database(dbPath);
    dbHealth.initializeDatabase(this.db, dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gicl_sessions (
        id TEXT PRIMARY KEY,
        unit_name TEXT,
        target_file TEXT,
        description TEXT,
        complexity TEXT DEFAULT 'moderate',
        max_iterations INTEGER DEFAULT 7,
        current_iteration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'initialized',
        stop_reason TEXT,
        final_score REAL,
        config JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        total_cost_usd REAL DEFAULT 0,
        total_input_tokens INTEGER DEFAULT 0,
        total_output_tokens INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS gicl_iterations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        iteration_number INTEGER NOT NULL,
        test_score REAL,
        guideline_score REAL,
        architecture_score REAL,
        duplication_score REAL,
        authenticity_score REAL,
        final_score REAL NOT NULL,
        violations_count INTEGER DEFAULT 0,
        incomplete_requirements_count INTEGER DEFAULT 0,
        violations JSON,
        suggestions JSON,
        fix_plan TEXT,
        file_path TEXT,
        duration_ms INTEGER,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cache_read_tokens INTEGER DEFAULT 0,
        cache_write_tokens INTEGER DEFAULT 0,
        model_id TEXT,
        cost_usd REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES gicl_sessions(id) ON DELETE CASCADE,
        UNIQUE(session_id, iteration_number)
      );
    `);

    return this.db;
  }

  /**
   * Generate a GICL session ID using timestamp and random suffix.
   * Format: gicl_YYYYMMDD_HHMMSS_xxxxx
   * @returns {string}
   */
  _generateId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const suffix = Math.random().toString(36).substring(2, 7);
    return ['gicl', dateStr, timeStr, suffix].join('_');
  }

  /**
   * Create a new GICL session. Auto-closes stale sessions (>24h)
   * and supersedes any other active session.
   *
   * @param {Object} options
   * @param {string} [options.unitName] - Unit/feature name
   * @param {string} [options.targetFile] - Primary file being worked on
   * @param {string} [options.description] - Session goal
   * @param {string} [options.complexity] - trivial|simple|moderate|complex|very_complex
   * @param {number} [options.maxIterations] - Override max iterations
   * @param {Object} [options.config] - Custom weight/threshold overrides
   * @returns {Object} Created session record
   */
  createSession(options = {}) {
    const db = this._ensureDb();

    return dbHealth.executeWithRetry(db, () => {
      const staleThreshold = new Date(
        Date.now() - STALE_SESSION_HOURS * 60 * 60 * 1000
      ).toISOString();

      // Auto-close stale sessions
      db.prepare(
        `UPDATE gicl_sessions
         SET status = 'stopped', stop_reason = 'stale_auto_closed',
             completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE status IN ('initialized', 'iterating') AND created_at < ?`
      ).run(staleThreshold);

      // Supersede any remaining active session
      db.prepare(
        `UPDATE gicl_sessions
         SET status = 'stopped', stop_reason = 'superseded',
             completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE status IN ('initialized', 'iterating')`
      ).run();

      const sessionId = this._generateId();
      const complexity = options.complexity || 'moderate';
      const maxIterations = options.maxIterations || COMPLEXITY_MAX_ITERATIONS[complexity] || 7;
      const configJson = options.config ? JSON.stringify(options.config) : null;

      db.prepare(
        `INSERT INTO gicl_sessions (id, unit_name, target_file, description, complexity, max_iterations, config)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sessionId,
        options.unitName || null,
        options.targetFile || null,
        options.description || null,
        complexity,
        maxIterations,
        configJson
      );

      const session = db.prepare('SELECT * FROM gicl_sessions WHERE id = ?').get(sessionId);

      logger.info('GICL session created', {
        context: 'gicl-session-manager',
        sessionId,
        complexity,
        maxIterations,
        targetFile: options.targetFile,
      });

      return session;
    });
  }

  /**
   * Get the active GICL session (status=initialized or iterating).
   * Attaches previousScores array from iteration history.
   *
   * @returns {Object|null} Active session with previousScores, or null
   */
  getActiveSession() {
    const db = this._ensureDb();

    return dbHealth.executeWithRetry(db, () => {
      const session = db.prepare(
        `SELECT * FROM gicl_sessions
         WHERE status IN ('initialized', 'iterating')
         ORDER BY created_at DESC LIMIT 1`
      ).get();

      if (!session) return null;

      const iterations = db.prepare(
        `SELECT final_score FROM gicl_iterations
         WHERE session_id = ? ORDER BY iteration_number ASC`
      ).all(session.id);

      session.previousScores = iterations.map(row => row.final_score);
      return session;
    });
  }

  /**
   * Record an iteration result and increment session counter.
   *
   * @param {string} sessionId
   * @param {Object} data - Iteration data
   * @param {number} data.iterationNumber
   * @param {number} data.finalScore - Weighted final score
   * @param {number} [data.testScore]
   * @param {number} [data.guidelineScore]
   * @param {number} [data.architectureScore]
   * @param {number} [data.duplicationScore]
   * @param {number} [data.authenticityScore]
   * @param {number} [data.violationsCount]
   * @param {number} [data.incompleteRequirementsCount]
   * @param {Array} [data.violations]
   * @param {Array} [data.suggestions]
   * @param {string} [data.fixPlan]
   * @param {string} [data.filePath]
   * @param {number} [data.durationMs]
   * @param {number} [data.inputTokens] - Input tokens for this iteration
   * @param {number} [data.outputTokens] - Output tokens for this iteration
   * @param {number} [data.cacheReadTokens] - Cache read tokens
   * @param {number} [data.cacheWriteTokens] - Cache write tokens
   * @param {string} [data.modelId] - Model ID used
   * @param {number} [data.costUsd] - Estimated cost in USD
   * @returns {Object} Updated session
   */
  recordIteration(sessionId, data) {
    const db = this._ensureDb();

    return dbHealth.executeWithRetry(db, () => {
      db.prepare(
        `INSERT INTO gicl_iterations
           (session_id, iteration_number, test_score, guideline_score, architecture_score,
            duplication_score, authenticity_score, final_score, violations_count,
            incomplete_requirements_count, violations, suggestions, fix_plan, file_path, duration_ms,
            input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, model_id, cost_usd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sessionId,
        data.iterationNumber,
        data.testScore != null ? data.testScore : null,
        data.guidelineScore != null ? data.guidelineScore : null,
        data.architectureScore != null ? data.architectureScore : null,
        data.duplicationScore != null ? data.duplicationScore : null,
        data.authenticityScore != null ? data.authenticityScore : null,
        data.finalScore,
        data.violationsCount || 0,
        data.incompleteRequirementsCount || 0,
        data.violations ? JSON.stringify(data.violations) : null,
        data.suggestions ? JSON.stringify(data.suggestions) : null,
        data.fixPlan || null,
        data.filePath || null,
        data.durationMs || null,
        data.inputTokens || 0,
        data.outputTokens || 0,
        data.cacheReadTokens || 0,
        data.cacheWriteTokens || 0,
        data.modelId || null,
        data.costUsd || 0.0
      );

      db.prepare(
        `UPDATE gicl_sessions
         SET current_iteration = ?, status = 'iterating', updated_at = CURRENT_TIMESTAMP,
             total_cost_usd = total_cost_usd + ?,
             total_input_tokens = total_input_tokens + ?,
             total_output_tokens = total_output_tokens + ?
         WHERE id = ?`
      ).run(
        data.iterationNumber,
        data.costUsd || 0.0,
        data.inputTokens || 0,
        data.outputTokens || 0,
        sessionId
      );

      logger.info('GICL iteration recorded', {
        context: 'gicl-session-manager',
        sessionId,
        iteration: data.iterationNumber,
        score: data.finalScore,
      });

      return this.getSession(sessionId);
    });
  }

  /**
   * Complete or stop a session.
   *
   * @param {string} sessionId
   * @param {string} reason - Stop/complete reason
   * @param {number} [finalScore] - Final score to record
   * @returns {Object} Updated session
   */
  completeSession(sessionId, reason, finalScore) {
    const db = this._ensureDb();

    return dbHealth.executeWithRetry(db, () => {
      const status = reason === 'quality_gate_passed' ? 'complete' : 'stopped';
      const now = new Date().toISOString();

      db.prepare(
        `UPDATE gicl_sessions
         SET status = ?, stop_reason = ?, final_score = COALESCE(?, final_score),
             completed_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(status, reason, finalScore != null ? finalScore : null, now, now, sessionId);

      logger.info('GICL session completed', {
        context: 'gicl-session-manager',
        sessionId,
        status,
        reason,
        finalScore,
      });

      // Trigger diagram + memory generation on session complete (non-blocking)
      setImmediate(() => {
        this._onSessionComplete(sessionId).catch(err =>
          logger.warn('Post-session generation failed (non-critical)', {
            context: 'gicl-session-manager',
            sessionId,
            error: err.message,
          })
        );
      });

      return this.getSession(sessionId);
    });
  }

  /**
   * Run post-session actions: refresh schema context and enrich KB from conversation.
   * Called non-blocking from completeSession(). Errors are caught by the caller.
   *
   * @param {string} sessionId
   */
  async _onSessionComplete(sessionId) {
    logger.info('Running post-session generation', {
      context: 'gicl-session-manager',
      sessionId,
    });

    // 1. Refresh ER diagram / schema context for next session
    try {
      const visualMemoryLoader = require('../hooks/visual-memory-loader');
      if (typeof visualMemoryLoader.refreshSchemaContext === 'function') {
        await visualMemoryLoader.refreshSchemaContext();
        logger.info('Schema context refreshed after GICL session', {
          context: 'gicl-session-manager',
          sessionId,
        });
      }
    } catch (err) {
      logger.warn('Schema context refresh skipped', {
        context: 'gicl-session-manager',
        error: err.message,
      });
    }

    // 2. Enrich knowledge base from conversation data
    try {
      await this._enrichKbFromSession(sessionId);
    } catch (err) {
      logger.warn('KB enrichment skipped', {
        context: 'gicl-session-manager',
        error: err.message,
      });
    }
  }

  /**
   * Extract insights from AI conversation messages linked to this GICL session
   * and store tool usage patterns in the knowledge base.
   *
   * @param {string} sessionId
   */
  async _enrichKbFromSession(sessionId) {
    const db = this._ensureDb();

    const session = db.prepare('SELECT * FROM gicl_sessions WHERE id = ?').get(sessionId);
    if (!session) return;

    // Pull ai_tool_uses that overlap with this GICL session's time window
    let toolUses = [];
    try {
      toolUses = db.prepare(`
        SELECT tool_name, COUNT(*) as use_count
        FROM ai_tool_uses
        WHERE timestamp BETWEEN ? AND COALESCE(?, datetime('now'))
        GROUP BY tool_name
        ORDER BY use_count DESC
        LIMIT 20
      `).all(session.created_at, session.completed_at);
    } catch (err) {
      // ai_tool_uses table may not exist yet (migration 013 not applied)
      logger.warn('Could not query ai_tool_uses for KB enrichment', {
        context: 'gicl-session-manager',
        error: err.message,
      });
      return;
    }

    if (toolUses.length === 0) return;

    const toolCounts = Object.fromEntries(toolUses.map(r => [r.tool_name, r.use_count]));
    logger.info('Session tool usage summary', {
      context: 'gicl-session-manager',
      sessionId,
      toolCounts,
    });
  }

  /**
   * Get a session with all its iterations.
   *
   * @param {string} sessionId
   * @returns {Object|null} Session with iterations array
   */
  getSession(sessionId) {
    const db = this._ensureDb();

    return dbHealth.executeWithRetry(db, () => {
      const session = db.prepare('SELECT * FROM gicl_sessions WHERE id = ?').get(sessionId);
      if (!session) return null;

      session.iterations = db.prepare(
        `SELECT * FROM gicl_iterations
         WHERE session_id = ? ORDER BY iteration_number ASC`
      ).all(sessionId);

      session.previousScores = session.iterations.map(row => row.final_score);
      return session;
    });
  }

  /**
   * Get recent session history for dashboard display.
   *
   * @param {number} [limit=20]
   * @returns {Array} Recent sessions with iteration counts
   */
  getSessionHistory(limit = 20) {
    const db = this._ensureDb();

    return dbHealth.executeWithRetry(db, () => {
      return db.prepare(
        `SELECT s.*,
           (SELECT COUNT(*) FROM gicl_iterations WHERE session_id = s.id) AS iteration_count,
           (SELECT MAX(final_score) FROM gicl_iterations WHERE session_id = s.id) AS best_score
         FROM gicl_sessions s
         ORDER BY s.created_at DESC
         LIMIT ?`
      ).all(limit);
    });
  }

  /**
   * Close the database connection.
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// CLI interface for skill invocation via Bash tool
// console.log is intentional here - this is CLI stdout output, not debug logging
if (require.main === module) {
  const command = process.argv[2];
  const manager = new GICLSessionManager();

  function parseCliOptions(args) {
    const options = {};
    let idx = 0;
    while (idx < args.length) {
      const flag = args[idx];
      const value = args[idx + 1];
      if (flag === '--target-file') options.targetFile = value;
      else if (flag === '--unit-name') options.unitName = value;
      else if (flag === '--description') options.description = value;
      else if (flag === '--complexity') options.complexity = value;
      else if (flag === '--max-iterations') options.maxIterations = parseInt(value, 10);
      idx += 2;
    }
    return options;
  }

  function printJson(data) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  }

  try {
    switch (command) {
      case 'create': {
        const options = parseCliOptions(process.argv.slice(3));
        printJson(manager.createSession(options));
        break;
      }
      case 'active': {
        const session = manager.getActiveSession();
        printJson(session || { active: false, message: 'No active GICL session' });
        break;
      }
      case 'get': {
        const sessionId = process.argv[3];
        if (!sessionId) {
          process.stderr.write('Usage: gicl-session-manager.js get <session-id>\n');
          process.exit(1);
        }
        printJson(manager.getSession(sessionId));
        break;
      }
      case 'complete': {
        const sessionId = process.argv[3];
        const reason = process.argv[4] || 'manual_stop';
        const finalScore = process.argv[5] ? parseFloat(process.argv[5]) : undefined;
        if (!sessionId) {
          process.stderr.write('Usage: gicl-session-manager.js complete <session-id> [reason] [score]\n');
          process.exit(1);
        }
        printJson(manager.completeSession(sessionId, reason, finalScore));
        break;
      }
      case 'history': {
        const limit = process.argv[3] ? parseInt(process.argv[3], 10) : 10;
        printJson(manager.getSessionHistory(limit));
        break;
      }
      default:
        process.stdout.write([
          'Usage: gicl-session-manager.js <command> [options]',
          '',
          'Commands:',
          '  create  --target-file <path> --complexity <level> --description <text>',
          '  active                         Show active session',
          '  get <session-id>               Show session details',
          '  complete <session-id> [reason]  Complete/stop a session',
          '  history [limit]                List recent sessions',
          '',
        ].join('\n'));
        process.exit(command ? 1 : 0);
    }
  } catch (error) {
    process.stderr.write(JSON.stringify({ error: error.message }) + '\n');
    process.exit(1);
  } finally {
    manager.close();
  }
}

module.exports = GICLSessionManager;
