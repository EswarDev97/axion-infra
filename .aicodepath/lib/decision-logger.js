#!/usr/bin/env node
/**
 * Decision Logger
 * Utilities for managing architectural decision records (ADRs) in the AICodePath database
 *
 * Supports statuses: proposed, accepted, rejected, superseded, deprecated
 */

const Database = require('better-sqlite3');
const path = require('path');
const { findProjectRoot , getDbPath } = require('./path-resolver');

class DecisionLogger {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Log a new architectural decision
   * @param {string} title - Decision title
   * @param {string} context - Context or rationale for the decision
   * @param {string} decision - The actual decision made
   * @param {Array<string>|string} alternatives - Alternative options considered (array or JSON string)
   * @param {string} consequences - Consequences of the decision
   * @param {string} status - Decision status (proposed, accepted, rejected, superseded, deprecated)
   * @param {Object} options - Additional options (category, scope, impact, artifactId, decidedBy)
   * @returns {number} - ID of the created decision
   */
  logDecision(title, context, decision, alternatives = [], consequences = '', status = 'proposed', options = {}) {
    // Validate status
    const validStatuses = ['proposed', 'accepted', 'rejected', 'superseded', 'deprecated'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Ensure alternatives is stored as JSON
    const alternativesJson = Array.isArray(alternatives)
      ? JSON.stringify(alternatives)
      : (typeof alternatives === 'string' && alternatives.trim() !== ''
          ? alternatives
          : JSON.stringify([]));

    const stmt = this.db.prepare(`
      INSERT INTO decisions (
        title,
        rationale,
        decision,
        alternatives,
        consequences,
        status,
        category,
        scope,
        impact,
        artifact_id,
        decided_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      context,
      decision,
      alternativesJson,
      consequences,
      status,
      options.category || null,
      options.scope || null,
      options.impact || null,
      options.artifactId || null,
      options.decidedBy || 'system'
    );

    return result.lastInsertRowid;
  }

  /**
   * Update the status of an existing decision
   * @param {number} id - Decision ID
   * @param {string} status - New status (proposed, accepted, rejected, superseded, deprecated)
   * @returns {Object} - Statement result
   */
  updateDecisionStatus(id, status) {
    const validStatuses = ['proposed', 'accepted', 'rejected', 'superseded', 'deprecated'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const stmt = this.db.prepare(`
      UPDATE decisions
      SET status = ?
      WHERE id = ?
    `);

    return stmt.run(status, id);
  }

  /**
   * Get decisions based on filter criteria
   * @param {Object} filter - Filter options (status, category, scope, impact, artifactId)
   * @param {number} limit - Maximum number of results (default: 50)
   * @returns {Array<Object>} - Array of decision records
   */
  getDecisions(filter = {}, limit = 50) {
    let query = 'SELECT * FROM decisions WHERE 1=1';
    const params = [];

    if (filter.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter.category) {
      query += ' AND category = ?';
      params.push(filter.category);
    }

    if (filter.scope) {
      query += ' AND scope = ?';
      params.push(filter.scope);
    }

    if (filter.impact) {
      query += ' AND impact = ?';
      params.push(filter.impact);
    }

    if (filter.artifactId) {
      query += ' AND artifact_id = ?';
      params.push(filter.artifactId);
    }

    query += ' ORDER BY decided_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get a single decision by ID
   * @param {number} id - Decision ID
   * @returns {Object|null} - Decision record or null if not found
   */
  getDecisionById(id) {
    const stmt = this.db.prepare('SELECT * FROM decisions WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Link a decision to an artifact
   * @param {number} decisionId - Decision ID
   * @param {number} artifactId - Artifact ID
   * @returns {Object} - Statement result
   */
  linkDecisionToArtifact(decisionId, artifactId) {
    const stmt = this.db.prepare(`
      UPDATE decisions
      SET artifact_id = ?
      WHERE id = ?
    `);

    return stmt.run(artifactId, decisionId);
  }

  /**
   * Mark a decision as superseded by a new decision
   * @param {number} oldDecisionId - ID of decision being superseded
   * @param {number} newDecisionId - ID of superseding decision
   * @returns {Object} - Statement result
   */
  supersede(oldDecisionId, newDecisionId) {
    const stmt = this.db.prepare(`
      UPDATE decisions
      SET status = 'superseded',
          superseded_by = ?
      WHERE id = ?
    `);

    return stmt.run(newDecisionId, oldDecisionId);
  }

  /**
   * Search decisions by text (uses FTS)
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results (default: 20)
   * @returns {Array<Object>} - Array of matching decisions
   */
  searchDecisions(searchTerm, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT d.*, rank
      FROM decisions d
      JOIN decisions_fts fts ON d.id = fts.rowid
      WHERE decisions_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    return stmt.all(searchTerm, limit);
  }

  /**
   * Get decision statistics
   * @returns {Object} - Statistics about decisions
   */
  getStatistics() {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'proposed' THEN 1 ELSE 0 END) as proposed,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'superseded' THEN 1 ELSE 0 END) as superseded,
        SUM(CASE WHEN status = 'deprecated' THEN 1 ELSE 0 END) as deprecated
      FROM decisions
    `);

    return stmt.get();
  }

  /**
   * Format decision for display
   * @param {Object} decision - Decision record
   * @returns {string} - Formatted decision text
   */
  formatDecision(decision) {
    const lines = [];
    lines.push(`ID: ${decision.id}`);
    lines.push(`Title: ${decision.title}`);
    lines.push(`Status: ${decision.status.toUpperCase()}`);

    if (decision.category) lines.push(`Category: ${decision.category}`);
    if (decision.scope) lines.push(`Scope: ${decision.scope}`);
    if (decision.impact) lines.push(`Impact: ${decision.impact}`);

    lines.push(`\nDecision:\n${decision.decision}`);

    if (decision.rationale) {
      lines.push(`\nRationale:\n${decision.rationale}`);
    }

    if (decision.alternatives) {
      try {
        const alts = JSON.parse(decision.alternatives);
        if (Array.isArray(alts) && alts.length > 0) {
          lines.push(`\nAlternatives Considered:`);
          alts.forEach((alt, i) => {
            lines.push(`  ${i + 1}. ${alt}`);
          });
        }
      } catch (e) {
        // If not valid JSON, treat as string
        if (decision.alternatives.trim() !== '') {
          lines.push(`\nAlternatives:\n${decision.alternatives}`);
        }
      }
    }

    if (decision.consequences) {
      lines.push(`\nConsequences:\n${decision.consequences}`);
    }

    if (decision.superseded_by) {
      lines.push(`\n⚠ Superseded by Decision #${decision.superseded_by}`);
    }

    lines.push(`\nDecided by: ${decision.decided_by}`);
    lines.push(`Decided at: ${decision.decided_at}`);

    if (decision.artifact_id) {
      lines.push(`Artifact ID: ${decision.artifact_id}`);
    }

    return lines.join('\n');
  }

  close() {
    this.db.close();
  }
}

module.exports = DecisionLogger;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const logger = new DecisionLogger();

  try {
    switch (command) {
      case 'log': {
        // Usage: decision-logger.js log <title>
        // Interactive prompts would go here in a real implementation
        const title = args.slice(1).join(' ');
        if (!title) {
          console.error('Error: Title is required');
          console.log('Usage: decision-logger.js log <title>');
          process.exit(1);
        }

        // For CLI simplicity, we'll require JSON input via stdin or basic args
        console.log('Creating decision with title:', title);
        console.log('(Use programmatic API for full decision details)');

        const id = logger.logDecision(
          title,
          'Context not provided via CLI',
          'Decision not provided via CLI',
          [],
          '',
          'proposed'
        );
        console.log(`✓ Created decision #${id}`);
        break;
      }

      case 'update': {
        // Usage: decision-logger.js update <id> <status>
        const [, id, status] = args;
        if (!id || !status) {
          console.error('Error: ID and status are required');
          console.log('Usage: decision-logger.js update <id> <status>');
          console.log('Valid statuses: proposed, accepted, rejected, superseded, deprecated');
          process.exit(1);
        }

        logger.updateDecisionStatus(parseInt(id), status);
        console.log(`✓ Updated decision #${id} to ${status}`);
        break;
      }

      case 'list': {
        // Usage: decision-logger.js list [filter]
        // Filters: status=accepted, category=architecture, etc.
        const filter = {};
        const filterArg = args[1];

        if (filterArg) {
          const [key, value] = filterArg.split('=');
          if (key && value) {
            filter[key] = value;
          }
        }

        const decisions = logger.getDecisions(filter, 20);

        if (decisions.length === 0) {
          console.log('No decisions found');
        } else {
          console.log(`Found ${decisions.length} decision(s):\n`);
          decisions.forEach(d => {
            console.log(`#${d.id} [${d.status}] ${d.title}`);
            if (d.category) console.log(`  Category: ${d.category}`);
            if (d.impact) console.log(`  Impact: ${d.impact}`);
            console.log(`  Decided: ${d.decided_at}`);
            console.log('');
          });
        }
        break;
      }

      case 'show': {
        // Usage: decision-logger.js show <id>
        const id = args[1];
        if (!id) {
          console.error('Error: Decision ID is required');
          console.log('Usage: decision-logger.js show <id>');
          process.exit(1);
        }

        const decision = logger.getDecisionById(parseInt(id));
        if (!decision) {
          console.error(`Decision #${id} not found`);
          process.exit(1);
        }

        console.log(logger.formatDecision(decision));
        break;
      }

      case 'search': {
        // Usage: decision-logger.js search <term>
        const searchTerm = args.slice(1).join(' ');
        if (!searchTerm) {
          console.error('Error: Search term is required');
          console.log('Usage: decision-logger.js search <term>');
          process.exit(1);
        }

        const results = logger.searchDecisions(searchTerm);

        if (results.length === 0) {
          console.log('No matching decisions found');
        } else {
          console.log(`Found ${results.length} matching decision(s):\n`);
          results.forEach(d => {
            console.log(`#${d.id} [${d.status}] ${d.title}`);
            console.log('');
          });
        }
        break;
      }

      case 'stats': {
        // Usage: decision-logger.js stats
        const stats = logger.getStatistics();
        console.log('Decision Statistics:');
        console.log(`  Total: ${stats.total}`);
        console.log(`  Proposed: ${stats.proposed}`);
        console.log(`  Accepted: ${stats.accepted}`);
        console.log(`  Rejected: ${stats.rejected}`);
        console.log(`  Superseded: ${stats.superseded}`);
        console.log(`  Deprecated: ${stats.deprecated}`);
        break;
      }

      case 'link': {
        // Usage: decision-logger.js link <decision-id> <artifact-id>
        const [, decisionId, artifactId] = args;
        if (!decisionId || !artifactId) {
          console.error('Error: Both decision ID and artifact ID are required');
          console.log('Usage: decision-logger.js link <decision-id> <artifact-id>');
          process.exit(1);
        }

        logger.linkDecisionToArtifact(parseInt(decisionId), parseInt(artifactId));
        console.log(`✓ Linked decision #${decisionId} to artifact #${artifactId}`);
        break;
      }

      case 'supersede': {
        // Usage: decision-logger.js supersede <old-id> <new-id>
        const [, oldId, newId] = args;
        if (!oldId || !newId) {
          console.error('Error: Both old and new decision IDs are required');
          console.log('Usage: decision-logger.js supersede <old-id> <new-id>');
          process.exit(1);
        }

        logger.supersede(parseInt(oldId), parseInt(newId));
        console.log(`✓ Decision #${oldId} superseded by #${newId}`);
        break;
      }

      default:
        console.log(`
Decision Logger - Manage Architectural Decision Records (ADRs)

Usage: decision-logger.js <command> [options]

Commands:
  log <title>                      Create a new decision (use API for full details)
  update <id> <status>             Update decision status
                                   Statuses: proposed, accepted, rejected, superseded, deprecated
  list [filter]                    List decisions (optional filter: status=accepted)
  show <id>                        Show decision details
  search <term>                    Full-text search decisions
  stats                            Show decision statistics
  link <decision-id> <artifact-id> Link decision to artifact
  supersede <old-id> <new-id>      Mark old decision as superseded by new one

Examples:
  decision-logger.js log "Use PostgreSQL for primary database"
  decision-logger.js update 5 accepted
  decision-logger.js list status=accepted
  decision-logger.js show 5
  decision-logger.js search "database"
  decision-logger.js stats
  decision-logger.js link 5 42
  decision-logger.js supersede 3 5

Programmatic Usage:
  const DecisionLogger = require('./decision-logger');
  const logger = new DecisionLogger();

  const id = logger.logDecision(
    'Use PostgreSQL',
    'Need relational database with ACID compliance',
    'We will use PostgreSQL 15 as our primary database',
    ['MySQL', 'MongoDB', 'SQLite'],
    'Better JSON support, proven scalability',
    'accepted',
    {
      category: 'technology',
      scope: 'project',
      impact: 'high',
      decidedBy: 'claude'
    }
  );
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    logger.close();
  }
}
