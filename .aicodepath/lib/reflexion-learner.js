/**
 * Reflexion Learner — Cross-session error pattern learning
 *
 * Records failed attempts and their resolutions so future sessions
 * can avoid repeating the same mistakes (Reflexion pattern from ML).
 *
 * Usage (in GICL "Learn" phase or debug skill):
 *   const rl = new ReflexionLearner(db, projectRoot);
 *   await rl.recordFailure({ errorType, description, failureReason });
 *   const hints = await rl.findSimilar({ errorType, description });
 *   await rl.recordResolution(id, solution);
 *
 * @module lib/reflexion-learner
 */

'use strict';

const crypto = require('crypto');
const pathResolver = require('./path-resolver');
const logger = require('./logger');

class ReflexionLearner {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {string} projectRoot
   */
  constructor(db, projectRoot) {
    this.db = db;
    this.projectRoot = projectRoot || pathResolver.findProjectRoot(process.cwd());
    this._ensureTable();
  }

  // ─── Schema ──────────────────────────────────────────────────────────────

  _ensureTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reflexion_patterns (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        error_type     TEXT NOT NULL,
        context_hash   TEXT NOT NULL,
        description    TEXT NOT NULL,
        failure_reason TEXT NOT NULL,
        solution       TEXT,
        confidence     REAL DEFAULT 0.0,
        times_used     INTEGER DEFAULT 0,
        times_helped   INTEGER DEFAULT 0,
        project_root   TEXT NOT NULL,
        session_id     TEXT,
        created_at     TEXT DEFAULT (datetime('now')),
        resolved_at    TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_reflexion_error_type
        ON reflexion_patterns(error_type);
      CREATE INDEX IF NOT EXISTS idx_reflexion_context_hash
        ON reflexion_patterns(context_hash);
    `);
  }

  // ─── Hashing ─────────────────────────────────────────────────────────────

  /**
   * Generate a short context hash for similarity matching.
   * Normalises the description to reduce noise.
   */
  _hash(text) {
    const normalised = (text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .slice(0, 200);
    return crypto.createHash('sha1').update(normalised).digest('hex').slice(0, 16);
  }

  // ─── Write ────────────────────────────────────────────────────────────────

  /**
   * Record a failed implementation attempt.
   * @param {Object} opts
   * @param {string} opts.errorType      - Category: 'test_failure' | 'syntax_error' | 'api_mismatch' | ...
   * @param {string} opts.description    - What was attempted
   * @param {string} opts.failureReason  - Why it failed
   * @param {string} [opts.sessionId]
   * @returns {number} inserted row id
   */
  recordFailure({ errorType, description, failureReason, sessionId }) {
    const contextHash = this._hash(description);
    const stmt = this.db.prepare(`
      INSERT INTO reflexion_patterns
        (error_type, context_hash, description, failure_reason, project_root, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      errorType || 'unknown',
      contextHash,
      description || '',
      failureReason || '',
      this.projectRoot,
      sessionId || null
    );
    logger.info('Reflexion: failure recorded', {
      context: 'reflexion-learner',
      id: result.lastInsertRowid,
      errorType,
    });
    return result.lastInsertRowid;
  }

  /**
   * Record the resolution for a previously logged failure.
   * @param {number} id        - Row id from recordFailure
   * @param {string} solution  - What ultimately worked
   */
  recordResolution(id, solution) {
    this.db.prepare(`
      UPDATE reflexion_patterns
      SET solution = ?, confidence = 0.8, resolved_at = datetime('now')
      WHERE id = ?
    `).run(solution, id);
    logger.info('Reflexion: resolution recorded', { context: 'reflexion-learner', id });
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  /**
   * Find similar past failures to inform the current approach.
   * Returns resolved patterns first, sorted by confidence desc.
   *
   * @param {Object} opts
   * @param {string} opts.errorType   - Filter by error category
   * @param {string} opts.description - Used for hash-based similarity
   * @param {number} [opts.limit=5]
   * @returns {Array<Object>} matching patterns
   */
  findSimilar({ errorType, description, limit = 5 }) {
    const contextHash = this._hash(description);

    // Exact hash match first (same problem context)
    const exact = this.db.prepare(`
      SELECT * FROM reflexion_patterns
      WHERE project_root = ?
        AND (context_hash = ? OR error_type = ?)
        AND solution IS NOT NULL
      ORDER BY confidence DESC, times_helped DESC
      LIMIT ?
    `).all(this.projectRoot, contextHash, errorType || '', limit);

    if (exact.length >= limit) return exact;

    // Fallback: same error type, any project
    const broader = this.db.prepare(`
      SELECT * FROM reflexion_patterns
      WHERE error_type = ?
        AND solution IS NOT NULL
        AND id NOT IN (${exact.map(() => '?').join(',') || '0'})
      ORDER BY confidence DESC
      LIMIT ?
    `).all(errorType || 'unknown', ...exact.map(r => r.id), limit - exact.length);

    return [...exact, ...broader];
  }

  /**
   * Increment times_used and times_helped for a pattern that was useful.
   * Call this when the suggested pattern actually helped solve the problem.
   * @param {number} id
   */
  markHelpful(id) {
    this.db.prepare(`
      UPDATE reflexion_patterns
      SET times_used = times_used + 1,
          times_helped = times_helped + 1,
          confidence = MIN(1.0, confidence + 0.1)
      WHERE id = ?
    `).run(id);
  }

  /**
   * Format similar patterns as a markdown hint block for injection into context.
   * @param {Array<Object>} patterns
   * @returns {string}
   */
  formatHints(patterns) {
    if (!patterns.length) return '';

    const rows = patterns.map(p =>
      `- **${p.error_type}**: Tried "${p.description.slice(0, 80)}..." — failed because: ${p.failure_reason.slice(0, 120)}\n  ✅ Solution: ${p.solution ? p.solution.slice(0, 200) : 'unknown'} (confidence: ${(p.confidence * 100).toFixed(0)}%)`
    ).join('\n');

    return `## Past Similar Failures (Reflexion Memory)\n\n${rows}\n\nConsider these lessons before attempting implementation.\n`;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  /** Return summary stats for this project's reflexion history. */
  getStats() {
    return this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN solution IS NOT NULL THEN 1 ELSE 0 END) as resolved,
        COUNT(DISTINCT error_type) as error_types,
        AVG(confidence) as avg_confidence
      FROM reflexion_patterns
      WHERE project_root = ?
    `).get(this.projectRoot);
  }
}

module.exports = ReflexionLearner;
