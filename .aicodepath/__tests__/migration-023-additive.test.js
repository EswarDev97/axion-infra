/**
 * Test: Migration 023 — additive structure (2 ALTER + 4 CREATE INDEX, 0 DROP/RENAME)
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 2 Task 5
 * Agent:  aicodepath-database-architect
 *
 * TDD RED — must fail BEFORE 023_artifact_linkage.sql exists.
 *
 * Asserts the migration file contract:
 *   - exists at .aicodepath/db/migrations/023_artifact_linkage.sql
 *   - contains exactly 2 `ALTER TABLE units ADD COLUMN` statements
 *   - contains exactly 4 `CREATE INDEX IF NOT EXISTS` statements
 *   - contains zero DROP / RENAME / MODIFY / REPLACE tokens
 *   - new columns are FOREIGN KEY references to artifacts(id)
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
const MIGRATION = path.join(ROOT, '.aicodepath', 'db', 'migrations', '023_artifact_linkage.sql');

test('migration 023 file exists', () => {
  assertTrue(fs.existsSync(MIGRATION), `Migration file missing at ${MIGRATION}`);
});

test('migration contains exactly 2 ALTER TABLE units ADD COLUMN statements', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const matches = sql.match(/ALTER\s+TABLE\s+units\s+ADD\s+COLUMN/gi) || [];
  assertEqual(matches.length, 2, 'Expected exactly 2 ALTER TABLE units ADD COLUMN');
});

test('migration adds plan_artifact_id INTEGER REFERENCES artifacts(id)', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  assertTrue(/plan_artifact_id\s+INTEGER\s+REFERENCES\s+artifacts\s*\(\s*id\s*\)/i.test(sql),
    'plan_artifact_id column missing or not referencing artifacts(id)');
});

test('migration adds design_artifact_id INTEGER REFERENCES artifacts(id)', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  assertTrue(/design_artifact_id\s+INTEGER\s+REFERENCES\s+artifacts\s*\(\s*id\s*\)/i.test(sql),
    'design_artifact_id column missing or not referencing artifacts(id)');
});

test('migration contains exactly 4 CREATE INDEX IF NOT EXISTS statements', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const matches = sql.match(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/gi) || [];
  assertEqual(matches.length, 4, 'Expected exactly 4 CREATE INDEX IF NOT EXISTS');
});

test('migration creates idx_artifacts_cr_number, idx_artifacts_cr_type, idx_units_plan_artifact, idx_units_design_artifact', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  for (const idx of [
    'idx_artifacts_cr_number',
    'idx_artifacts_cr_type',
    'idx_units_plan_artifact',
    'idx_units_design_artifact',
  ]) {
    assertTrue(new RegExp(`CREATE\\s+INDEX\\s+IF\\s+NOT\\s+EXISTS\\s+${idx}\\b`, 'i').test(sql),
      `Missing index: ${idx}`);
  }
});

test('migration contains zero DROP / RENAME / MODIFY / REPLACE tokens', () => {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  // Strip SQL comments before scanning so commentary doesn't trigger.
  const stripped = sql
    .split('\n')
    .map(line => line.replace(/--.*$/, ''))
    .join('\n');
  for (const token of ['DROP', 'RENAME', 'MODIFY', 'REPLACE']) {
    const re = new RegExp(`\\b${token}\\b`, 'i');
    assertTrue(!re.test(stripped), `Forbidden token "${token}" found in migration body`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
