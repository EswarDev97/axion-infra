#!/usr/bin/env node
/**
 * Knowledge Base Writer
 * Utilities for writing workflow state to the AICodePath database
 */

const Database = require('better-sqlite3');
const path = require('path');
const { findProjectRoot , getDbPath } = require('./path-resolver');

class KBWriter {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Check if stages already exist for a phase
   * @param {string} phase - Phase name
   * @param {string} crNumber - Change Request number (defaults to 'N/A')
   * @returns {boolean} - True if stages exist
   */
  phaseStagesExist(phase, crNumber = 'N/A') {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM workflow_state
      WHERE phase = ? AND cr_number = ?
    `).get(phase, crNumber);

    return row && row.count > 0;
  }

  /**
   * Initialize workflow stages for a given phase
   * Skips if stages already exist to prevent duplicates
   * @param {string} phase - Phase name (pre-flight, inception, construction, operations)
   * @param {string} crNumber - Change Request number (defaults to 'N/A')
   * @returns {number} - Number of stages initialized (0 if already exist)
   */
  initializePhaseStages(phase, crNumber = 'N/A') {
    // Check if stages already exist - prevent duplicates
    if (this.phaseStagesExist(phase, crNumber)) {
      return 0;
    }

    const stages = this.getPhaseStages(phase);

    const insertStmt = this.db.prepare(`
      INSERT INTO workflow_state (cr_number, phase, stage, status)
      VALUES (?, ?, ?, 'pending')
    `);

    const insertMany = this.db.transaction((stageList) => {
      for (const stage of stageList) {
        insertStmt.run(crNumber, phase, stage);
      }
    });

    insertMany(stages);
    return stages.length;
  }

  /**
   * Update stage status
   * @param {string} phase - Phase name
   * @param {string} stage - Stage name
   * @param {string} status - Status (pending, in_progress, completed, skipped, blocked)
   */
  updateStageStatus(phase, stage, status) {
    const stmt = this.db.prepare(`
      UPDATE workflow_state
      SET status = ?,
          started_at = CASE WHEN status = 'pending' AND ? = 'in_progress' THEN datetime('now') ELSE started_at END,
          completed_at = CASE WHEN ? IN ('completed', 'skipped') THEN datetime('now') ELSE completed_at END
      WHERE phase = ? AND stage = ?
    `);

    return stmt.run(status, status, status, phase, stage);
  }

  /**
   * Get default stages for a phase
   * @param {string} phase - Phase name
   * @returns {Array<string>} - List of stage names
   */
  getPhaseStages(phase) {
    const phaseStages = {
      'pre-flight': [
        'Knowledge Base Check',
        'Plugin Validation',
        'MCP Server Check',
        'Environment Validation'
      ],
      'inception': [
        'Workspace Detection',
        'Reverse Engineering',
        'Requirements Analysis',
        'User Stories',
        'Application Design',
        'Units Generation',
        'Workflow Planning'
      ],
      'construction': [
        'Functional Design',
        'NFR Design',
        'Database Design',
        'Storage Design',
        'Caching Design',
        'Auth Design',
        'API Gateway Design',
        'Docker Design',
        'Kubernetes Design',
        'CI/CD Design',
        'Code Generation',
        'Build and Test'
      ],
      'operations': [
        'Deployment',
        'Sprint Tracking',
        'Monitoring Setup'
      ]
    };

    return phaseStages[phase.toLowerCase()] || [];
  }

  /**
   * Clear all workflow state (for reset)
   */
  clearWorkflowState() {
    return this.db.prepare('DELETE FROM workflow_state').run();
  }

  /**
   * Get current workflow state
   */
  getWorkflowState() {
    return this.db.prepare(`
      SELECT phase, stage, status, started_at, completed_at
      FROM workflow_state
      ORDER BY id ASC
    `).all();
  }

  /**
   * Update session state
   * @param {string} key - State key
   * @param {string} value - State value
   */
  updateSessionState(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO session_state (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    return stmt.run(key, JSON.stringify(value));
  }

  /**
   * Get session state value
   * @param {string} key - State key
   */
  getSessionState(key) {
    const row = this.db.prepare(`
      SELECT value FROM session_state WHERE key = ?
    `).get(key);

    return row ? JSON.parse(row.value) : null;
  }

  close() {
    this.db.close();
  }
}

module.exports = KBWriter;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const writer = new KBWriter();

  try {
    switch (command) {
      case 'init':
        const phase = args[1] || 'inception';
        // Parse --cr=VALUE or --cr-number=VALUE flag
        const crFlag = args.find(a => a.startsWith('--cr'));
        const crNumber = crFlag
          ? crFlag.split('=')[1]
          : (process.env.AICODEPATH_CR || 'N/A');
        const count = writer.initializePhaseStages(phase, crNumber);
        console.log(`✓ Initialized ${count} stages for ${phase} phase (CR: ${crNumber})`);
        break;

      case 'update':
        const [, updatePhase, stage, status] = args;
        writer.updateStageStatus(updatePhase, stage, status);
        console.log(`✓ Updated ${stage} to ${status}`);
        break;

      case 'clear':
        writer.clearWorkflowState();
        console.log('✓ Cleared workflow state');
        break;

      case 'show':
        const state = writer.getWorkflowState();
        console.log(JSON.stringify(state, null, 2));
        break;

      default:
        console.log(`
Usage: kb-writer.js <command> [options]

Commands:
  init <phase> [--cr=VALUE]      Initialize workflow stages for a phase
  update <phase> <stage> <status> Update stage status
  clear                          Clear all workflow state
  show                           Show current workflow state

Options:
  --cr=VALUE                     Set CR/ticket number (default: N/A)
                                 Also reads from AICODEPATH_CR env var

Examples:
  kb-writer.js init inception
  kb-writer.js init inception --cr=CR001
  kb-writer.js update inception "Workspace Detection" in_progress
  kb-writer.js show
        `);
    }
  } finally {
    writer.close();
  }
}
