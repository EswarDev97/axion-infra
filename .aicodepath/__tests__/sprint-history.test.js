/**
 * Test: lib/sprint-history.js — listSprints + getSprintTasks
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 4 Task 13
 * Agent:  aicodepath-backend-architect
 *
 * TDD RED — must fail BEFORE sprint-history.js is created.
 *
 * Contract:
 *   1. listSprints(db) returns distinct sprints from artifacts table,
 *      keyed by cr_number, ordered by started DESC.
 *   2. getSprintTasks(db, crNumber) returns units joined to artifacts
 *      via plan_artifact_id filtered by cr_number.
 *   3. Both functions use structured logger (not console.log).
 *   4. Module is loadable via require('./lib/sprint-history').
 *   5. Works against in-memory better-sqlite3 DB (no disk I/O).
 */
const Database = require('better-sqlite3');

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

function buildTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_type TEXT NOT NULL,
      phase TEXT NOT NULL,
      stage TEXT,
      unit TEXT,
      title TEXT NOT NULL,
      content TEXT,
      file_path TEXT,
      metadata TEXT DEFAULT '{}',
      cr_number TEXT NOT NULL DEFAULT 'CR-LEGACY',
      version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by TEXT DEFAULT 'system'
    );

    CREATE TABLE units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      estimated_effort INTEGER,
      actual_effort INTEGER,
      assigned_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      plan_artifact_id INTEGER REFERENCES artifacts(id),
      design_artifact_id INTEGER REFERENCES artifacts(id)
    );

    CREATE TABLE session_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function seedSprint(db, crNumber, planTitle, designTitle) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO artifacts (artifact_type, phase, stage, title, file_path, cr_number, created_at, updated_at)
    VALUES (?, 'inception', ?, ?, ?, ?, ?, ?)
  `).run('design', 'design', designTitle, `aicodepath-docs/design/${crNumber}-design.md`, crNumber, now, now);

  const plan = db.prepare(`
    INSERT INTO artifacts (artifact_type, phase, stage, title, file_path, cr_number, created_at, updated_at)
    VALUES (?, 'inception', ?, ?, ?, ?, ?, ?)
  `).run('plan', 'plan', planTitle, `aicodepath-docs/plan/${crNumber}-plan.md`, crNumber, now, now);

  return plan.lastInsertRowid;
}

function seedUnits(db, planArtifactId, units) {
  for (const u of units) {
    db.prepare(`
      INSERT INTO units (session_id, name, description, assigned_agent, priority, plan_artifact_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-session', u.name, u.description || null, u.agent || null, u.batch || 1, planArtifactId, u.status || 'pending');
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('sprint-history module is loadable', () => {
  const mod = require('../lib/sprint-history');
  assertTrue(typeof mod.listSprints === 'function', 'listSprints must be a function');
  assertTrue(typeof mod.getSprintTasks === 'function', 'getSprintTasks must be a function');
});

test('listSprints returns empty array when no artifacts exist', () => {
  const { listSprints } = require('../lib/sprint-history');
  const db = buildTestDb();
  const result = listSprints(db);
  assertTrue(Array.isArray(result), 'result must be an array');
  assertEqual(result.length, 0, 'empty DB must return 0 sprints');
});

test('listSprints returns distinct sprints ordered by started DESC', () => {
  const { listSprints } = require('../lib/sprint-history');
  const db = buildTestDb();

  // Sprint 1 — older
  const older = '2026-01-01T00:00:00Z';
  db.prepare(`INSERT INTO artifacts (artifact_type, phase, stage, title, cr_number, created_at, updated_at) VALUES ('plan','inception','plan','Old Plan','CR-001',?,?)`).run(older, older);
  db.prepare(`INSERT INTO artifacts (artifact_type, phase, stage, title, cr_number, created_at, updated_at) VALUES ('design','inception','design','Old Design','CR-001',?,?)`).run(older, older);

  // Sprint 2 — newer
  const newer = '2026-04-19T00:00:00Z';
  db.prepare(`INSERT INTO artifacts (artifact_type, phase, stage, title, cr_number, created_at, updated_at) VALUES ('plan','inception','plan','New Plan','CR-002',?,?)`).run(newer, newer);

  const result = listSprints(db);
  assertEqual(result.length, 2, 'must find 2 distinct sprints');
  assertEqual(result[0].cr_number, 'CR-002', 'newest sprint first');
  assertEqual(result[1].cr_number, 'CR-001', 'older sprint second');
  assertTrue(result[0].started, 'must include started timestamp');
});

test('listSprints only counts plan and design artifacts', () => {
  const { listSprints } = require('../lib/sprint-history');
  const db = buildTestDb();
  const now = new Date().toISOString();

  // Insert a code artifact — should NOT create a sprint entry
  db.prepare(`INSERT INTO artifacts (artifact_type, phase, stage, title, cr_number, created_at, updated_at) VALUES ('code','construction','code-gen','Some Code','CR-CODE',?,?)`).run(now, now);
  // Insert a plan — should create one entry
  db.prepare(`INSERT INTO artifacts (artifact_type, phase, stage, title, cr_number, created_at, updated_at) VALUES ('plan','inception','plan','Real Plan','CR-REAL',?,?)`).run(now, now);

  const result = listSprints(db);
  assertEqual(result.length, 1, 'code artifact must not appear as a sprint');
  assertEqual(result[0].cr_number, 'CR-REAL');
});

test('getSprintTasks returns units linked to a plan artifact with the given cr_number', () => {
  const { getSprintTasks } = require('../lib/sprint-history');
  const db = buildTestDb();

  const planId = seedSprint(db, 'CR-2026-04-18', 'Test Plan', 'Test Design');
  seedUnits(db, planId, [
    { name: 'T-A', agent: 'aicodepath-backend-architect', batch: 1, status: 'pending' },
    { name: 'T-B', agent: 'aicodepath-frontend-architect', batch: 2, status: 'completed' }
  ]);

  const tasks = getSprintTasks(db, 'CR-2026-04-18');
  assertEqual(tasks.length, 2, 'must return 2 tasks linked to this sprint');
  assertEqual(tasks[0].name, 'T-A');
  assertEqual(tasks[1].name, 'T-B');
  assertEqual(tasks[0].assigned_agent, 'aicodepath-backend-architect');
});

test('getSprintTasks returns empty array for unknown cr_number', () => {
  const { getSprintTasks } = require('../lib/sprint-history');
  const db = buildTestDb();

  const planId = seedSprint(db, 'CR-KNOWN', 'Plan', 'Design');
  seedUnits(db, planId, [{ name: 'T-X' }]);

  const tasks = getSprintTasks(db, 'CR-UNKNOWN');
  assertEqual(tasks.length, 0, 'unknown cr_number must return 0 tasks');
});

test('getSprintTasks does not return units from other sprints', () => {
  const { getSprintTasks } = require('../lib/sprint-history');
  const db = buildTestDb();

  const plan1 = seedSprint(db, 'CR-ONE', 'Plan 1', 'Design 1');
  const plan2 = seedSprint(db, 'CR-TWO', 'Plan 2', 'Design 2');
  seedUnits(db, plan1, [{ name: 'T-1A' }, { name: 'T-1B' }]);
  seedUnits(db, plan2, [{ name: 'T-2A' }]);

  const tasks1 = getSprintTasks(db, 'CR-ONE');
  const tasks2 = getSprintTasks(db, 'CR-TWO');
  assertEqual(tasks1.length, 2, 'CR-ONE must have exactly 2 tasks');
  assertEqual(tasks2.length, 1, 'CR-TWO must have exactly 1 task');
  assertTrue(tasks1.every(t => t.name.startsWith('T-1')), 'CR-ONE tasks must only be T-1*');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
