#!/usr/bin/env node
/**
 * AICodePath Statusline KB Query Helper
 *
 * Lightweight script to query knowledge base for statusline display.
 * Designed for fast startup and minimal overhead.
 *
 * Usage: node statusline-kb-query.js [project_dir]
 * Output: JSON { phase, unit, validation_mode, kb_synced }
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Default result
const DEFAULT_RESULT = {
  phase: '',
  unit: '',
  stage: '',
  validation_mode: 'strict',
  kb_synced: false,
};

/**
 * Find database path
 */
function findDatabasePath(projectDir) {
  const candidates = [
    path.join(projectDir, 'aicodepath-docs', 'aicodepath.db'),
    path.join(projectDir, '.aicodepath', 'aicodepath.db'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Query statusline data from database
 */
function queryStatuslineData(dbPath) {
  const result = { ...DEFAULT_RESULT };

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });

    // Get current workflow state (most recent in_progress)
    try {
      const workflowStmt = db.prepare(`
        SELECT phase, stage, unit
        FROM workflow_state
        WHERE status = 'in_progress'
        ORDER BY started_at DESC
        LIMIT 1
      `);

      const workflow = workflowStmt.get();
      if (workflow) {
        result.phase = workflow.phase || '';
        result.stage = workflow.stage || '';
        result.unit = workflow.unit || '';
      }
    } catch {
      // Table might not exist
    }

    // Get validation mode from session state
    try {
      const stateStmt = db.prepare(`
        SELECT value FROM session_state WHERE key = 'validation_mode'
      `);

      const state = stateStmt.get();
      if (state && state.value) {
        result.validation_mode = JSON.parse(state.value);
      }
    } catch {
      // Table might not exist or parse error
    }

    result.kb_synced = true;
    db.close();
  } catch (err) {
    // Database error - return defaults
    result.kb_synced = false;
  }

  return result;
}

/**
 * Main entry point
 */
function main() {
  // Get project directory from args or cwd
  const projectDir = process.argv[2] || process.cwd();

  // Find database
  const dbPath = findDatabasePath(projectDir);

  if (!dbPath) {
    // No database found - output defaults
    console.log(JSON.stringify(DEFAULT_RESULT));
    return;
  }

  // Query and output
  const data = queryStatuslineData(dbPath);
  console.log(JSON.stringify(data));
}

main();
