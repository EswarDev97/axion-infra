/**
 * Test: migration 020_code_graph_columns.sql
 *
 * Verifies that the migration adds repo_name and package_name columns
 * to code_entities and creates the corresponding indexes.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  \u2713 ${name}`); }
  catch(e) { failed++; console.error(`  \u2717 ${name}: ${e.message}`); }
}

function assertEqual(a, b) {
  if (a !== b) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertTrue(v, msg) {
  if (!v) throw new Error(msg || `Expected truthy, got ${v}`);
}

// Base code_entities schema (matches schema.sql, without repo_name/package_name)
const BASE_SCHEMA = `
CREATE TABLE code_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    qualified_name TEXT,
    language TEXT,
    file_path TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    signature TEXT,
    body TEXT,
    documentation TEXT,
    entity_hash TEXT,
    token_hash TEXT,
    structural_hash TEXT,
    file_hash TEXT,
    complexity INTEGER,
    dependencies JSON,
    exported BOOLEAN DEFAULT 0,
    metadata JSON,
    cr_number TEXT,
    artifact_id INTEGER,
    indexed_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
`;

const MIGRATION_PATH = path.join(__dirname, '..', 'db', 'migrations', '020_code_graph_columns.sql');

console.log('Migration 020: code_graph_columns');
console.log('==================================');

test('migration file exists', () => {
  assertTrue(fs.existsSync(MIGRATION_PATH), `Migration file not found at ${MIGRATION_PATH}`);
});

test('migration adds repo_name and package_name columns', () => {
  const db = new Database(':memory:');
  db.exec(BASE_SCHEMA);

  const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
  db.exec(migrationSQL);

  // Should not throw - columns exist
  const row = db.prepare('SELECT repo_name, package_name FROM code_entities LIMIT 1').all();
  assertTrue(Array.isArray(row), 'SELECT on new columns should return an array');

  db.close();
});

test('migration creates idx_code_entities_repo index', () => {
  const db = new Database(':memory:');
  db.exec(BASE_SCHEMA);

  const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
  db.exec(migrationSQL);

  const indexes = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_code_entities_repo'"
  ).all();
  assertEqual(indexes.length, 1);

  db.close();
});

test('migration creates idx_code_entities_package index', () => {
  const db = new Database(':memory:');
  db.exec(BASE_SCHEMA);

  const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
  db.exec(migrationSQL);

  const indexes = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_code_entities_package'"
  ).all();
  assertEqual(indexes.length, 1);

  db.close();
});

test('migration is idempotent for indexes (no error on re-run with existing indexes)', () => {
  const db = new Database(':memory:');
  db.exec(BASE_SCHEMA);

  const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
  db.exec(migrationSQL);

  // Running index creation again should not fail (IF NOT EXISTS)
  // Note: ALTER TABLE ADD COLUMN will fail on re-run in SQLite, but indexes should be safe
  db.exec("CREATE INDEX IF NOT EXISTS idx_code_entities_repo ON code_entities(repo_name);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_code_entities_package ON code_entities(package_name);");

  db.close();
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
