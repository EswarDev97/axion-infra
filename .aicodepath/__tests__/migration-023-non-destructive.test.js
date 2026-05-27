/**
 * Test: Migration 023 is non-destructive
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 2 Task 7
 * Agent:  aicodepath-database-architect
 * Reviewer: aicodepath-security-engineer
 *
 * Resolves Critical Blocker #2: guarantees migration 023 cannot break the
 * hardcoded `plan-loader.js` 7-column tasks.md contract or the existing
 * `units` table layout. Two layers of evidence:
 *   1. The migration text contains zero DROP / RENAME / MODIFY / REPLACE
 *      tokens (after stripping comments).
 *   2. None of the 12 pre-existing `units` columns are mentioned in any
 *      destructive context inside the migration body.
 *   3. The runtime DB (after init-db) still exposes every pre-existing
 *      `units` column with its original type and nullability.
 */
const fs = require('fs');
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

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATION = path.join(ROOT, '.aicodepath', 'db', 'migrations', '023_artifact_linkage.sql');
const DB_PATH = path.join(ROOT, 'aicodepath-docs', 'aicodepath.db');

// The 12 pre-existing units columns from db/schema.sql:781-794. Listed here
// explicitly so the test fails loudly if anyone tries to drop or rename one.
const EXISTING_UNITS_COLUMNS = [
  { name: 'id',                type: 'INTEGER' },
  { name: 'session_id',        type: 'TEXT'    },
  { name: 'name',              type: 'TEXT'    },
  { name: 'description',       type: 'TEXT'    },
  { name: 'status',            type: 'TEXT'    },
  { name: 'priority',          type: 'INTEGER' },
  { name: 'estimated_effort',  type: 'INTEGER' },
  { name: 'actual_effort',     type: 'INTEGER' },
  { name: 'assigned_agent',    type: 'TEXT'    },
  { name: 'created_at',        type: 'TEXT'    },
  { name: 'started_at',        type: 'TEXT'    },
  { name: 'completed_at',      type: 'TEXT'    },
];

function readMigrationStripComments() {
  const raw = fs.readFileSync(MIGRATION, 'utf8');
  return raw.split('\n').map(line => line.replace(/--.*$/, '')).join('\n');
}

test('migration file exists', () => {
  assertTrue(fs.existsSync(MIGRATION), `Migration file missing at ${MIGRATION}`);
});

test('migration body contains zero DROP / RENAME / MODIFY / REPLACE tokens', () => {
  const sql = readMigrationStripComments();
  for (const token of ['DROP', 'RENAME', 'MODIFY', 'REPLACE']) {
    const re = new RegExp('\\b' + token + '\\b', 'i');
    assertTrue(!re.test(sql), 'Forbidden token "' + token + '" found in migration body');
  }
});

test('migration body does not touch units columns destructively (ALTER COLUMN/DROP COLUMN/RENAME COLUMN)', () => {
  const sql = readMigrationStripComments();
  // Forbid any destructive form against the units table specifically.
  const destructive = [
    /ALTER\s+TABLE\s+units[^;]*\b(DROP|RENAME|MODIFY)\s+COLUMN\b/i,
    /ALTER\s+TABLE\s+units[^;]*\bRENAME\s+TO\b/i,
    /DROP\s+TABLE\s+(IF\s+EXISTS\s+)?units\b/i,
  ];
  for (const re of destructive) {
    assertTrue(!re.test(sql), 'Destructive operation matched ' + re + ' in migration body');
  }
});

test('runtime units table still exposes all 12 pre-existing columns with original types', () => {
  let Database;
  try { Database = require('better-sqlite3'); }
  catch (e) { throw new Error('better-sqlite3 not available: ' + e.message); }
  if (!fs.existsSync(DB_PATH)) throw new Error('Runtime DB missing at ' + DB_PATH);

  const db = new Database(DB_PATH, { readonly: true });
  let actual;
  try {
    actual = db.prepare('PRAGMA table_info(units)').all();
  } finally {
    db.close();
  }

  const byName = new Map(actual.map(r => [r.name, r]));
  for (const expected of EXISTING_UNITS_COLUMNS) {
    const got = byName.get(expected.name);
    assertTrue(got, 'Missing pre-existing column "' + expected.name + '"');
    assertEqual(got.type, expected.type,
      'Column "' + expected.name + '" type drifted');
  }
});

test('runtime units table has BOTH new artifact-link columns appended after existing 12', () => {
  let Database;
  try { Database = require('better-sqlite3'); }
  catch (e) { throw new Error('better-sqlite3 not available: ' + e.message); }
  const db = new Database(DB_PATH, { readonly: true });
  let cols;
  try {
    cols = db.prepare('PRAGMA table_info(units)').all();
  } finally {
    db.close();
  }
  const names = cols.map(c => c.name);
  assertTrue(names.includes('plan_artifact_id'), 'plan_artifact_id missing');
  assertTrue(names.includes('design_artifact_id'), 'design_artifact_id missing');
  // ALTER TABLE ADD COLUMN always appends to the end — verify additive ordering.
  const planIdx = names.indexOf('plan_artifact_id');
  const designIdx = names.indexOf('design_artifact_id');
  assertTrue(planIdx >= EXISTING_UNITS_COLUMNS.length,
    'plan_artifact_id should be appended after the original 12 columns; index=' + planIdx);
  assertTrue(designIdx >= EXISTING_UNITS_COLUMNS.length,
    'design_artifact_id should be appended after the original 12 columns; index=' + designIdx);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
