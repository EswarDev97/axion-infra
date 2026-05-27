/**
 * Test: init-db.js applies SQL files containing PRAGMA statements
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Origin: T6a — pre-existing bug surfaced while applying migration 023.
 *         applySqlFile() wraps the entire file in BEGIN IMMEDIATE / COMMIT,
 *         but SQLite forbids PRAGMA synchronous (and similar safety-level
 *         pragmas) inside a transaction:
 *
 *           SqliteError: Safety level may not be changed inside a transaction
 *
 * TDD RED — this test must fail BEFORE init-db.js is fixed. It exercises the
 *           applySqlFile() helper against a temporary SQL file that mixes
 *           PRAGMA statements with regular DDL — the same shape as schema.sql.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (e) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`);
  }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }
function cleanup(p) {
  try { fs.unlinkSync(p); } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`cleanup ${p}: ${e.message}`);
  }
}

let Database;
try { Database = require('better-sqlite3'); }
catch (e) {
  console.error(`better-sqlite3 not available: ${e.message}`);
  process.exit(1);
}

// init-db.js exports `initDb` (the orchestrator), but the bug lives in
// applySqlFile() which is internal. Re-import via direct require so we can
// reach into module exports — if T6a refactors applySqlFile to a named export
// the test will still drive the public path.
const initDbModule = require('../commands/init-db');
const applySqlFile = initDbModule.applySqlFile || initDbModule._applySqlFile;

test('init-db.js exports applySqlFile (or _applySqlFile) for direct testing', () => {
  assertTrue(typeof applySqlFile === 'function',
    'init-db.js should export applySqlFile so we can test PRAGMA handling in isolation');
});

test('applySqlFile runs a file mixing PRAGMA statements with DDL without throwing', () => {
  if (typeof applySqlFile !== 'function') {
    throw new Error('skipped — applySqlFile not exported');
  }
  const tmpDb = path.join(os.tmpdir(), `acp-init-db-pragma-test-${Date.now()}.db`);
  const tmpSql = path.join(os.tmpdir(), `acp-init-db-pragma-test-${Date.now()}.sql`);
  fs.writeFileSync(tmpSql, [
    'PRAGMA journal_mode = WAL;',
    'PRAGMA synchronous = NORMAL;',
    'PRAGMA foreign_keys = ON;',
    'CREATE TABLE IF NOT EXISTS demo (id INTEGER PRIMARY KEY, label TEXT);',
    "INSERT INTO demo (label) VALUES ('hello');",
  ].join('\n'));

  const db = new Database(tmpDb);
  try {
    applySqlFile(db, tmpSql);
    const row = db.prepare('SELECT label FROM demo WHERE id = 1').get();
    assertEqual(row && row.label, 'hello', 'INSERT inside the same SQL file should land');
  } finally {
    db.close();
    cleanup(tmpDb);
    cleanup(tmpSql);
  }
});

test('applySqlFile rolls back DDL when a non-PRAGMA statement fails (transaction integrity)', () => {
  if (typeof applySqlFile !== 'function') {
    throw new Error('skipped — applySqlFile not exported');
  }
  const tmpDb = path.join(os.tmpdir(), `acp-init-db-rollback-test-${Date.now()}.db`);
  const tmpSql = path.join(os.tmpdir(), `acp-init-db-rollback-test-${Date.now()}.sql`);
  fs.writeFileSync(tmpSql, [
    'CREATE TABLE will_rollback (id INTEGER PRIMARY KEY);',
    'CREATE TABLE will_rollback (id INTEGER PRIMARY KEY);', // duplicate — forces error
  ].join('\n'));

  const db = new Database(tmpDb);
  let threw = false;
  try {
    try {
      applySqlFile(db, tmpSql);
    } catch (e) {
      threw = true;
      if (!/already exists|duplicate/i.test(e.message)) {
        throw new Error(`Unexpected error: ${e.message}`);
      }
    }
    assertTrue(threw, 'applySqlFile should propagate the duplicate-table error');
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='will_rollback'"
    ).get();
    assertEqual(row, undefined, 'Failed transaction must roll back — table should not exist');
  } finally {
    db.close();
    cleanup(tmpDb);
    cleanup(tmpSql);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
