/**
 * Test: Migration 023 applied to runtime DB
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 2 Task 6
 * Agent:  aicodepath-database-architect
 *
 * TDD RED — must fail BEFORE `aicodepath.js init-db` is run after the migration
 * file lands. After init-db runs, the runtime DB at aicodepath-docs/aicodepath.db
 * must expose plan_artifact_id and design_artifact_id on the units table, plus
 * the 4 new indexes on artifacts/units.
 */
const fs = require('fs');
const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }

const ROOT = path.resolve(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'aicodepath-docs', 'aicodepath.db');

let Database;
try { Database = require('better-sqlite3'); }
catch (_) {
  console.error('better-sqlite3 not available; cannot verify runtime DB.');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`Runtime DB missing at ${DB_PATH} — run \`node .aicodepath/bin/aicodepath.js init-db\` first.`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

function unitsColumns() {
  return db.prepare('PRAGMA table_info(units)').all().map(r => r.name);
}
function indexExists(name) {
  return db.prepare(
    `SELECT 1 FROM sqlite_master WHERE type='index' AND name=?`
  ).get(name) !== undefined;
}

test('units table has plan_artifact_id column', () => {
  assertTrue(unitsColumns().includes('plan_artifact_id'),
    `plan_artifact_id missing — columns: ${unitsColumns().join(', ')}`);
});

test('units table has design_artifact_id column', () => {
  assertTrue(unitsColumns().includes('design_artifact_id'),
    `design_artifact_id missing — columns: ${unitsColumns().join(', ')}`);
});

test('idx_artifacts_cr_number index exists', () => {
  assertTrue(indexExists('idx_artifacts_cr_number'), 'idx_artifacts_cr_number missing');
});

test('idx_artifacts_cr_type index exists', () => {
  assertTrue(indexExists('idx_artifacts_cr_type'), 'idx_artifacts_cr_type missing');
});

test('idx_units_plan_artifact index exists', () => {
  assertTrue(indexExists('idx_units_plan_artifact'), 'idx_units_plan_artifact missing');
});

test('idx_units_design_artifact index exists', () => {
  assertTrue(indexExists('idx_units_design_artifact'), 'idx_units_design_artifact missing');
});

test('plan_artifact_id is INTEGER nullable with no default', () => {
  const col = db.prepare('PRAGMA table_info(units)').all().find(r => r.name === 'plan_artifact_id');
  assertTrue(col, 'plan_artifact_id column not found');
  assertEqual(col.type, 'INTEGER', 'plan_artifact_id type');
  assertEqual(col.notnull, 0, 'plan_artifact_id should be nullable');
  assertEqual(col.dflt_value, null, 'plan_artifact_id should have no default');
});

test('design_artifact_id is INTEGER nullable with no default', () => {
  const col = db.prepare('PRAGMA table_info(units)').all().find(r => r.name === 'design_artifact_id');
  assertTrue(col, 'design_artifact_id column not found');
  assertEqual(col.type, 'INTEGER', 'design_artifact_id type');
  assertEqual(col.notnull, 0, 'design_artifact_id should be nullable');
  assertEqual(col.dflt_value, null, 'design_artifact_id should have no default');
});

db.close();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
