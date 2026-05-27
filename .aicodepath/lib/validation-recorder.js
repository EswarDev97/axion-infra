#!/usr/bin/env node
/**
 * Validation Recorder
 * Manages validation results and quality gate tracking for AICodePath
 *
 * Stores validation results in the validations table for:
 * - Guideline compliance (coding-standards, architecture, security, etc.)
 * - API design validation
 * - Data modeling validation
 * - Architecture pattern validation
 * - Code duplication detection
 * - DevOps/IaC validation
 * - Security scanning
 * - GICL loop quality gates
 */

const Database = require('better-sqlite3');
const path = require('path');
const { findProjectRoot , getDbPath } = require('./path-resolver');
const logger = require('./logger');

class ValidationRecorder {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Validation types
    this.validationTypes = [
      'guideline',      // Guidelines validation (coding-standards, architecture, etc.)
      'api',            // API design rules
      'data',           // Data modeling rules
      'architecture',   // Architecture patterns
      'duplication',    // Code duplication detection
      'devops',         // DevOps best practices
      'iac',            // Infrastructure as Code
      'security',       // Security scanning
      'gicl'            // GICL loop quality gates
    ];

    // Validation statuses
    this.statuses = ['passed', 'failed', 'warning', 'skipped'];
  }

  /**
   * Record a validation result
   *
   * @param {number|null} artifactId - Related artifact ID (optional)
   * @param {string} filePath - File path being validated
   * @param {string} validationType - Type of validation
   * @param {number} score - Validation score (0-100)
   * @param {string} status - Validation status (passed, failed, warning, skipped)
   * @param {Array|Object} violations - Violations found (will be JSON-stringified)
   * @returns {Object} - Inserted validation record
   */
  recordValidation(artifactId, filePath, validationType, score, status, violations = []) {
    // Validate inputs
    if (!this.validationTypes.includes(validationType)) {
      throw new Error(
        `Invalid validation type: ${validationType}. ` +
        `Must be one of: ${this.validationTypes.join(', ')}`
      );
    }

    if (!this.statuses.includes(status)) {
      throw new Error(
        `Invalid status: ${status}. ` +
        `Must be one of: ${this.statuses.join(', ')}`
      );
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }

    // Insert validation record
    const stmt = this.db.prepare(`
      INSERT INTO validations (
        artifact_id,
        file_path,
        validation_type,
        score,
        status,
        violations
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const violationsJson = JSON.stringify(violations);
    const result = stmt.run(
      artifactId || null,
      filePath,
      validationType,
      score,
      status,
      violationsJson
    );

    // Return the inserted record
    return this.getValidation(result.lastInsertRowid);
  }

  /**
   * Get a validation by ID
   *
   * @param {number} id - Validation ID
   * @returns {Object|null} - Validation record
   */
  getValidation(id) {
    const stmt = this.db.prepare(`
      SELECT
        v.*,
        a.title AS artifact_title,
        a.artifact_type,
        a.phase,
        a.stage,
        a.unit
      FROM validations v
      LEFT JOIN artifacts a ON v.artifact_id = a.id
      WHERE v.id = ?
    `);

    const row = stmt.get(id);
    if (row && row.violations) {
      row.violations = JSON.parse(row.violations);
    }
    return row;
  }

  /**
   * Get validations by artifact ID
   *
   * @param {number} artifactId - Artifact ID
   * @returns {Array} - Validation records
   */
  getValidationsByArtifact(artifactId) {
    const stmt = this.db.prepare(`
      SELECT
        v.*,
        a.title AS artifact_title,
        a.artifact_type
      FROM validations v
      LEFT JOIN artifacts a ON v.artifact_id = a.id
      WHERE v.artifact_id = ?
      ORDER BY v.validated_at DESC
    `);

    const rows = stmt.all(artifactId);
    return rows.map(row => {
      if (row.violations) {
        row.violations = JSON.parse(row.violations);
      }
      return row;
    });
  }

  /**
   * Get validations by type
   *
   * @param {string} type - Validation type
   * @param {number} limit - Maximum records to return (default: 50)
   * @returns {Array} - Validation records
   */
  getValidationsByType(type, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT
        v.*,
        a.title AS artifact_title,
        a.artifact_type,
        a.file_path AS artifact_file_path
      FROM validations v
      LEFT JOIN artifacts a ON v.artifact_id = a.id
      WHERE v.validation_type = ?
      ORDER BY v.validated_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(type, limit);
    return rows.map(row => {
      if (row.violations) {
        row.violations = JSON.parse(row.violations);
      }
      return row;
    });
  }

  /**
   * Get validation summary statistics
   *
   * @param {Object} options - Filter options
   * @param {string} options.validationType - Filter by validation type
   * @param {string} options.status - Filter by status
   * @param {string} options.filePath - Filter by file path pattern
   * @returns {Object} - Summary statistics
   */
  getValidationSummary(options = {}) {
    // Build WHERE clause dynamically
    const conditions = [];
    const params = [];

    if (options.validationType) {
      conditions.push('validation_type = ?');
      params.push(options.validationType);
    }

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    if (options.filePath) {
      conditions.push('file_path LIKE ?');
      params.push(`%${options.filePath}%`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get aggregate statistics
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) AS total_validations,
        AVG(score) AS average_score,
        MIN(score) AS min_score,
        MAX(score) AS max_score,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) AS passed_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) AS warning_count,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped_count
      FROM validations
      ${whereClause}
    `);

    const summary = stmt.get(...params);

    // Get breakdown by type
    const typeStmt = this.db.prepare(`
      SELECT
        validation_type,
        COUNT(*) AS count,
        AVG(score) AS avg_score,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM validations
      ${whereClause}
      GROUP BY validation_type
      ORDER BY validation_type
    `);

    const byType = typeStmt.all(...params);

    // Get recent failures
    const failuresStmt = this.db.prepare(`
      SELECT
        v.id,
        v.file_path,
        v.validation_type,
        v.score,
        v.validated_at,
        a.title AS artifact_title
      FROM validations v
      LEFT JOIN artifacts a ON v.artifact_id = a.id
      WHERE v.status = 'failed' ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
      ORDER BY v.validated_at DESC
      LIMIT 10
    `);

    const recentFailures = failuresStmt.all(...params);

    return {
      summary: {
        ...summary,
        average_score: summary.average_score ? Math.round(summary.average_score * 10) / 10 : 0,
        pass_rate: summary.total_validations > 0
          ? Math.round((summary.passed_count / summary.total_validations) * 100 * 10) / 10
          : 0
      },
      by_type: byType.map(row => ({
        ...row,
        avg_score: row.avg_score ? Math.round(row.avg_score * 10) / 10 : 0,
        pass_rate: row.count > 0
          ? Math.round((row.passed / row.count) * 100 * 10) / 10
          : 0
      })),
      recent_failures: recentFailures
    };
  }

  /**
   * Update a validation record
   *
   * @param {number} id - Validation ID
   * @param {Object} updates - Fields to update
   * @param {number} updates.score - New score
   * @param {string} updates.status - New status
   * @param {Array|Object} updates.violations - New violations
   * @returns {Object} - Updated validation record
   */
  updateValidation(id, updates) {
    const allowedFields = ['score', 'status', 'violations'];
    const setFields = [];
    const params = [];

    for (const [field, value] of Object.entries(updates)) {
      if (!allowedFields.includes(field)) {
        throw new Error(`Cannot update field: ${field}`);
      }

      if (field === 'status' && !this.statuses.includes(value)) {
        throw new Error(
          `Invalid status: ${value}. ` +
          `Must be one of: ${this.statuses.join(', ')}`
        );
      }

      if (field === 'score' && (typeof value !== 'number' || value < 0 || value > 100)) {
        throw new Error('Score must be a number between 0 and 100');
      }

      if (field === 'violations') {
        setFields.push(`${field} = ?`);
        params.push(JSON.stringify(value));
      } else {
        setFields.push(`${field} = ?`);
        params.push(value);
      }
    }

    if (setFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const stmt = this.db.prepare(`
      UPDATE validations
      SET ${setFields.join(', ')}
      WHERE id = ?
    `);

    params.push(id);
    stmt.run(...params);

    return this.getValidation(id);
  }

  /**
   * Delete old validation records
   *
   * @param {number} daysToKeep - Keep validations from last N days
   * @returns {number} - Number of records deleted
   */
  cleanupOldValidations(daysToKeep = 30) {
    const stmt = this.db.prepare(`
      DELETE FROM validations
      WHERE validated_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysToKeep);
    return result.changes;
  }

  /**
   * Get validation trends over time
   *
   * @param {number} days - Number of days to analyze (default: 7)
   * @returns {Array} - Daily statistics
   */
  getValidationTrends(days = 7) {
    const stmt = this.db.prepare(`
      SELECT
        DATE(validated_at) AS date,
        COUNT(*) AS total,
        AVG(score) AS avg_score,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM validations
      WHERE validated_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(validated_at)
      ORDER BY date DESC
    `);

    return stmt.all(days).map(row => ({
      ...row,
      avg_score: row.avg_score ? Math.round(row.avg_score * 10) / 10 : 0,
      pass_rate: row.total > 0
        ? Math.round((row.passed / row.total) * 100 * 10) / 10
        : 0
    }));
  }

  /**
   * Get failing files (files with failed validations)
   *
   * @param {string} validationType - Filter by validation type (optional)
   * @returns {Array} - Files with failure counts
   */
  getFailingFiles(validationType = null) {
    const whereClause = validationType
      ? 'WHERE validation_type = ? AND status = \'failed\''
      : 'WHERE status = \'failed\'';

    const params = validationType ? [validationType] : [];

    const stmt = this.db.prepare(`
      SELECT
        file_path,
        validation_type,
        COUNT(*) AS failure_count,
        AVG(score) AS avg_score,
        MAX(validated_at) AS last_failure
      FROM validations
      ${whereClause}
      GROUP BY file_path, validation_type
      ORDER BY failure_count DESC, last_failure DESC
      LIMIT 20
    `);

    return stmt.all(...params).map(row => ({
      ...row,
      avg_score: row.avg_score ? Math.round(row.avg_score * 10) / 10 : 0
    }));
  }

  close() {
    this.db.close();
  }
}

module.exports = ValidationRecorder;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const recorder = new ValidationRecorder();

  try {
    switch (command) {
      case 'record': {
        // record <artifact-id> <type> <score> <status> [file-path]
        const artifactId = args[1] !== 'null' ? parseInt(args[1], 10) : null;
        const validationType = args[2];
        const score = parseInt(args[3], 10);
        const status = args[4] || 'passed';
        const filePath = args[5] || 'unknown';

        const validation = recorder.recordValidation(
          artifactId,
          filePath,
          validationType,
          score,
          status,
          []
        );

        logger.info('Validation recorded', {
          validationType,
          filePath,
          score,
          status,
          validationId: validation.id
        });
        break;
      }

      case 'list': {
        // list [type|artifact-id]
        const filter = args[1];

        let validations;
        if (filter && !isNaN(filter)) {
          // Filter by artifact ID
          validations = recorder.getValidationsByArtifact(parseInt(filter, 10));
          logger.info('Listing validations for artifact', { artifactId: filter });
        } else if (filter) {
          // Filter by type
          validations = recorder.getValidationsByType(filter);
          logger.info('Listing validations by type', { validationType: filter });
        } else {
          // Get summary
          const summary = recorder.getValidationSummary();
          logger.info('Validation Summary', {
            totalValidations: summary.summary.total_validations,
            averageScore: summary.summary.average_score,
            passRate: summary.summary.pass_rate,
            passed: summary.summary.passed_count,
            failed: summary.summary.failed_count,
            warnings: summary.summary.warning_count,
            skipped: summary.summary.skipped_count
          });

          if (summary.by_type.length > 0) {
            logger.info('Validation breakdown by type', {
              breakdown: summary.by_type.map(type => ({
                validationType: type.validation_type,
                count: type.count,
                avgScore: type.avg_score,
                passRate: type.pass_rate
              }))
            });
          }

          if (summary.recent_failures.length > 0) {
            logger.warn('Recent validation failures', {
              failures: summary.recent_failures.map(f => ({
                filePath: f.file_path,
                validationType: f.validation_type,
                score: f.score,
                validatedAt: f.validated_at
              }))
            });
          }
          break;
        }

        // Display validation list
        if (validations && validations.length > 0) {
          validations.forEach(v => {
            logger.info('Validation record', {
              id: v.id,
              validationType: v.validation_type,
              filePath: v.file_path,
              score: v.score,
              status: v.status,
              validatedAt: v.validated_at,
              artifactTitle: v.artifact_title,
              violationCount: v.violations ? v.violations.length : 0
            });
          });
        } else {
          logger.info('No validations found');
        }
        break;
      }

      case 'summary': {
        // summary [type]
        const type = args[1];
        const options = type ? { validationType: type } : {};
        const summary = recorder.getValidationSummary(options);

        logger.info('Validation Summary', {
          totalValidations: summary.summary.total_validations,
          averageScore: summary.summary.average_score,
          scoreRange: `${summary.summary.min_score}-${summary.summary.max_score}`,
          passRate: summary.summary.pass_rate,
          statusBreakdown: {
            passed: summary.summary.passed_count,
            failed: summary.summary.failed_count,
            warning: summary.summary.warning_count,
            skipped: summary.summary.skipped_count
          }
        });

        if (summary.by_type.length > 0) {
          logger.info('Validation breakdown by type', {
            breakdown: summary.by_type.map(t => ({
              validationType: t.validation_type,
              count: t.count,
              avgScore: t.avg_score,
              passRate: t.pass_rate
            }))
          });
        }

        if (summary.recent_failures.length > 0) {
          logger.warn('Recent validation failures', {
            failures: summary.recent_failures.map(f => ({
              id: f.id,
              filePath: f.file_path,
              validationType: f.validation_type,
              score: f.score,
              validatedAt: f.validated_at
            }))
          });
        }
        break;
      }

      case 'show': {
        // show <id>
        const id = parseInt(args[1], 10);
        if (isNaN(id)) {
          logger.error('Invalid validation ID', { provided: args[1], expected: 'number' });
          process.exit(1);
        }

        const validation = recorder.getValidation(id);
        if (!validation) {
          logger.error('Validation not found', { validationId: id });
          process.exit(1);
        }

        logger.info('Validation details', {
          id: validation.id,
          validationType: validation.validation_type,
          filePath: validation.file_path,
          score: validation.score,
          status: validation.status,
          validatedAt: validation.validated_at,
          artifact: validation.artifact_id ? {
            id: validation.artifact_id,
            title: validation.artifact_title,
            type: validation.artifact_type,
            phase: validation.phase,
            stage: validation.stage,
            unit: validation.unit
          } : null,
          violations: validation.violations || [],
          violationCount: validation.violations ? validation.violations.length : 0
        });
        break;
      }

      case 'trends': {
        // trends [days]
        const days = args[1] ? parseInt(args[1], 10) : 7;
        const trends = recorder.getValidationTrends(days);

        logger.info('Validation trends', {
          days,
          dataPoints: trends.length,
          trends: trends.map(t => ({
            date: t.date,
            total: t.total,
            avgScore: t.avg_score,
            passRate: t.pass_rate,
            passed: t.passed,
            failed: t.failed
          }))
        });
        break;
      }

      case 'failing': {
        // failing [type]
        const type = args[1] || null;
        const failing = recorder.getFailingFiles(type);

        if (failing.length === 0) {
          logger.info('No failing validations found', { validationType: type });
        } else {
          logger.warn('Files with failed validations', {
            validationType: type,
            failingCount: failing.length,
            files: failing.map(f => ({
              filePath: f.file_path,
              validationType: f.validation_type,
              failureCount: f.failure_count,
              avgScore: f.avg_score,
              lastFailure: f.last_failure
            }))
          });
        }
        break;
      }

      case 'cleanup': {
        // cleanup [days]
        const days = args[1] ? parseInt(args[1], 10) : 30;
        const deleted = recorder.cleanupOldValidations(days);
        logger.info('Cleaned up old validations', {
          deletedCount: deleted,
          olderThanDays: days
        });
        break;
      }

      default:
        logger.info(`
Usage: validation-recorder.js <command> [options]

Commands:
  record <artifact-id> <type> <score> <status> [file-path]
                                 Record a validation result
                                 - artifact-id: Artifact ID or 'null'
                                 - type: guideline|api|data|architecture|duplication|devops|iac|security|gicl
                                 - score: 0-100
                                 - status: passed|failed|warning|skipped
                                 - file-path: Optional file path

  list [filter]                  List validations
                                 - filter: type name or artifact ID

  summary [type]                 Show validation summary statistics
                                 - type: Optional validation type filter

  show <id>                      Show detailed validation information

  trends [days]                  Show validation trends (default: 7 days)

  failing [type]                 Show files with failed validations
                                 - type: Optional validation type filter

  cleanup [days]                 Delete validations older than N days (default: 30)

Validation Types:
  guideline     - Guidelines validation (coding-standards, architecture, etc.)
  api           - API design rules
  data          - Data modeling rules
  architecture  - Architecture patterns
  duplication   - Code duplication detection
  devops        - DevOps best practices
  iac           - Infrastructure as Code
  security      - Security scanning
  gicl          - GICL loop quality gates

Statuses:
  passed        - Validation passed
  failed        - Validation failed
  warning       - Validation passed with warnings
  skipped       - Validation was skipped

Examples:
  validation-recorder.js record null guideline 95 passed src/index.js
  validation-recorder.js record 123 security 60 failed src/auth.js
  validation-recorder.js list guideline
  validation-recorder.js summary
  validation-recorder.js show 42
  validation-recorder.js trends 14
  validation-recorder.js failing security
  validation-recorder.js cleanup 60
        `);
    }
  } catch (error) {
    logger.error('Command execution failed', {
      command,
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    recorder.close();
  }
}
