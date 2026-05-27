#!/usr/bin/env node

/**
 * init-db Command — Initialize the AICodePath SQLite knowledge base
 *
 * Cross-platform replacement for init-knowledge-base.sh.
 * Uses better-sqlite3 (already a runtime dependency) so no sqlite3
 * CLI tool is required — works on Linux, macOS, and Windows.
 *
 * Equivalent to: bash .aicodepath/scripts/init-knowledge-base.sh
 *
 * @module commands/init-db
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('../lib/path-resolver');
const logger = require('../lib/logger');

const CRITICAL_TABLES = [
  'artifacts',
  'visual_diagrams',
  'diagram_entity_links',
  'diagram_history',
  'gicl_sessions',
  'gicl_iterations',
  'workflow_state',
];

/**
 * Apply a single SQL file to the database.
 *
 * PRAGMA statements are extracted and executed OUTSIDE the transaction —
 * SQLite forbids several PRAGMAs (synchronous, journal_mode, foreign_keys,
 * etc.) inside a transaction with the error "Safety level may not be
 * changed inside a transaction". Remaining DDL/DML runs inside a single
 * BEGIN IMMEDIATE / COMMIT so a partial failure rolls back cleanly. This
 * is the SQLite equivalent of a least-privilege migration runner posture
 * (SQLite has no GRANT/role model).
 */
function safeRollback(db) {
  if (!db.inTransaction) return;
  try {
    db.exec('ROLLBACK;');
  } catch (rollbackErr) {
    logger.warn('init-db: rollback after error failed: ' + rollbackErr.message, { context: 'init-db' });
  }
}

function applySqlFile(db, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');

  // Pull PRAGMA statements out of the file body — SQLite forbids several
  // (synchronous, journal_mode, foreign_keys, ...) inside a transaction.
  // Match lines anchored to line starts so a "PRAGMA" word inside a
  // comment or trigger body is not accidentally extracted.
  const pragmaRe = /^\s*PRAGMA[^;]*;\s*$/gim;
  const pragmas = sql.match(pragmaRe) || [];
  const body = sql.replace(pragmaRe, '').trim();

  for (const p of pragmas) {
    db.exec(p);
  }

  if (!body) return;

  // Hand the remaining body to SQLite as one block — its parser handles
  // CREATE TRIGGER ... BEGIN ... END; correctly (a naive split on ";"
  // does not). If the file already manages its own `BEGIN TRANSACTION; ...
  // COMMIT;` block (as schema.sql Migration 011 does), do NOT add an outer
  // wrapper — SQLite forbids nested transactions and would error with
  // "cannot start a transaction within a transaction". Otherwise wrap to
  // preserve T3's least-privilege posture: partial failures roll back
  // instead of leaving the DB half-migrated.
  const fileManagesTxn = /^\s*BEGIN\s+TRANSACTION\s*;/im.test(body);
  const sqlToRun = fileManagesTxn
    ? body
    : 'BEGIN IMMEDIATE;\n' + body + '\nCOMMIT;';

  try {
    db.exec(sqlToRun);
  } catch (err) {
    safeRollback(db);
    throw err;
  }
}

async function initDb() {
  const projectRoot = pathResolver.findProjectRoot();
  const aicodePathRoot = pathResolver.getAicodePathRoot(projectRoot);

  const docsDir = path.join(projectRoot, 'aicodepath-docs');
  const dbPath = path.join(docsDir, 'aicodepath.db');
  const schemaPath = path.join(aicodePathRoot, 'db', 'schema.sql');
  const migrationsDir = path.join(aicodePathRoot, 'db', 'migrations');

  console.log('╔════════════════════════════════════════╗');
  console.log('║  AICodePath Knowledge Base Init        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // Verify schema file exists
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema not found: ${schemaPath}`);
    process.exit(1);
  }

  // Create aicodepath-docs/ if needed
  if (!fs.existsSync(docsDir)) {
    console.log(`Creating ${docsDir} ...`);
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Backup existing DB
  if (fs.existsSync(dbPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
    const backupPath = `${dbPath}.backup.${ts}`;
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backed up existing database → ${backupPath}`);
  }

  // Open (or create) DB via better-sqlite3
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('❌ better-sqlite3 not found. Run: cd .aicodepath && npm install');
    process.exit(1);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Apply base schema
  console.log('Applying base schema ...');
  try {
    applySqlFile(db, schemaPath);
    console.log('✓ Base schema applied');
  } catch (err) {
    console.error(`❌ Error applying schema: ${err.message}`);
    logger.error('init-db: schema error', { error: err.message, context: 'init-db' });
    db.close();
    process.exit(1);
  }

  // Apply migrations in order
  if (fs.existsSync(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrations.length > 0) {
      console.log(`Applying ${migrations.length} migration(s) ...`);
      for (const file of migrations) {
        const migrationPath = path.join(migrationsDir, file);
        try {
          applySqlFile(db, migrationPath);
          console.log(`  ✓ ${file}`);
        } catch (err) {
          // Migrations often use CREATE TABLE IF NOT EXISTS — log non-fatal errors
          logger.warn(`init-db: migration warning in ${file}: ${err.message}`, { context: 'init-db' });
          console.log(`  ⚠ ${file} — ${err.message} (continuing)`);
        }
      }
    }
  }

  // Verify critical tables
  console.log('Verifying critical tables ...');
  const missing = [];
  for (const table of CRITICAL_TABLES) {
    try {
      db.prepare(`SELECT 1 FROM ${table} LIMIT 0`).run();
    } catch {
      missing.push(table);
    }
  }

  db.close();

  if (missing.length > 0) {
    console.error(`❌ Missing critical tables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('✓ All critical tables verified');
  console.log('');
  console.log(`✅ Database initialized: ${dbPath}`);
  console.log('');

  return { success: true, dbPath };
}

module.exports = initDb;
module.exports.applySqlFile = applySqlFile;
