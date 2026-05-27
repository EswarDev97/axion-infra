/**
 * Test: sprint-history.rebuildTasksMdFromDb round-trip
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 4 Task 14
 * Agent:  aicodepath-backend-architect
 * Reviewer: aicodepath-test-engineer
 *
 * TDD RED — must fail BEFORE rebuildTasksMdFromDb is implemented.
 *
 * Round-trip contract:
 *   1. Seed units into DB linked to a plan artifact via plan_artifact_id
 *   2. Call rebuildTasksMdFromDb(db, crNumber) → get 7-column markdown string
 *   3. Parse the markdown with plan-loader.parseTasks
 *   4. Assert parsed unit names match original seeded unit names
 *
 * This proves the DB→MD→DB path is lossless for the fields plan-loader
 * cares about (name, agent, content/DoD, batch, status).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
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
  `);
  return db;
}

function seedSprintWithUnits(db, crNumber, units) {
  const plan = db.prepare(`
    INSERT INTO artifacts (artifact_type, phase, stage, title, file_path, cr_number)
    VALUES ('plan', 'inception', 'plan', ?, ?, ?)
  `).run(`${crNumber} Plan`, `aicodepath-docs/plan/${crNumber}-plan.md`, crNumber);

  for (const u of units) {
    // Description = content + DoD (matches plan-loader format)
    const desc = [u.content, u.dod ? `DoD: ${u.dod}` : null].filter(Boolean).join('\n\n') || null;
    db.prepare(`
      INSERT INTO units (session_id, name, description, assigned_agent, priority, plan_artifact_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-session', u.name, desc, u.agent || null, u.batch || 1, plan.lastInsertRowid, u.status || 'pending');
  }
  return plan.lastInsertRowid;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('rebuildTasksMdFromDb is exported from sprint-history', () => {
  const mod = require('../lib/sprint-history');
  assertTrue(typeof mod.rebuildTasksMdFromDb === 'function',
    'rebuildTasksMdFromDb must be a function exported from sprint-history');
});

test('rebuildTasksMdFromDb produces valid 7-column markdown', () => {
  const { rebuildTasksMdFromDb } = require('../lib/sprint-history');
  const { TASKS_MD_COLUMNS } = require('../lib/plan-loader');
  const db = buildTestDb();

  seedSprintWithUnits(db, 'CR-ROUNDTRIP', [
    { name: 'T-A', agent: 'aicodepath-backend-architect', content: 'Do auth', dod: 'tests pass', batch: 1, status: 'pending' },
    { name: 'T-B', agent: '—', content: 'Write docs', dod: 'reviewed', batch: 2, status: 'pending' }
  ]);

  const md = rebuildTasksMdFromDb(db, 'CR-ROUNDTRIP');
  assertTrue(typeof md === 'string' && md.length > 0, 'must return a non-empty string');

  // Verify header row contains all 7 column names
  for (const col of TASKS_MD_COLUMNS) {
    assertTrue(md.includes(col), `markdown must contain column "${col}"`);
  }
});

test('round-trip: rebuildTasksMdFromDb → parseTasks yields same unit names', () => {
  const { rebuildTasksMdFromDb } = require('../lib/sprint-history');
  const { parseTasks } = require('../lib/plan-loader');
  const db = buildTestDb();

  const original = [
    { name: 'T-A', agent: 'aicodepath-backend-architect', content: 'Implement JWT', dod: 'npm test exits 0', batch: 1, status: 'pending' },
    { name: 'T-B', agent: 'aicodepath-security-engineer', content: 'Audit auth', dod: 'no OWASP findings', batch: 2, status: 'pending' },
    { name: 'T-C', agent: '—', content: 'Update README', dod: 'reviewed', batch: 2, status: 'pending' }
  ];

  seedSprintWithUnits(db, 'CR-ROUNDTRIP2', original);

  const md = rebuildTasksMdFromDb(db, 'CR-ROUNDTRIP2');
  const rebuilt = parseTasks(md);

  assertEqual(rebuilt.length, original.length,
    `round-trip must preserve unit count (original: ${original.length}, rebuilt: ${rebuilt.length})`);

  const rebuiltNames = rebuilt.map(t => t.name);
  const originalNames = original.map(t => t.name);
  for (const name of originalNames) {
    assertTrue(rebuiltNames.includes(name), `round-trip must preserve unit "${name}"`);
  }
});

test('round-trip: agent assignments preserved', () => {
  const { rebuildTasksMdFromDb } = require('../lib/sprint-history');
  const { parseTasks } = require('../lib/plan-loader');
  const db = buildTestDb();

  seedSprintWithUnits(db, 'CR-AGENT', [
    { name: 'T-1', agent: 'aicodepath-backend-architect', batch: 1 },
    { name: 'T-2', agent: null, batch: 1 }
  ]);

  const md = rebuildTasksMdFromDb(db, 'CR-AGENT');
  const rebuilt = parseTasks(md);

  assertEqual(rebuilt.length, 2);
  assertEqual(rebuilt[0].agent, 'aicodepath-backend-architect', 'agent must survive round-trip');
  assertEqual(rebuilt[1].agent, null, 'null agent (—) must survive round-trip');
});

test('round-trip: batch numbers preserved', () => {
  const { rebuildTasksMdFromDb } = require('../lib/sprint-history');
  const { parseTasks } = require('../lib/plan-loader');
  const db = buildTestDb();

  seedSprintWithUnits(db, 'CR-BATCH', [
    { name: 'T-1', batch: 1 },
    { name: 'T-2', batch: 3 },
    { name: 'T-3', batch: 5 }
  ]);

  const md = rebuildTasksMdFromDb(db, 'CR-BATCH');
  const rebuilt = parseTasks(md);

  assertEqual(rebuilt[0].batch, 1);
  assertEqual(rebuilt[1].batch, 3);
  assertEqual(rebuilt[2].batch, 5);
});

test('round-trip: completed units are excluded (status=done not in output)', () => {
  const { rebuildTasksMdFromDb } = require('../lib/sprint-history');
  const { parseTasks } = require('../lib/plan-loader');
  const db = buildTestDb();

  seedSprintWithUnits(db, 'CR-DONE', [
    { name: 'T-1', batch: 1, status: 'pending' },
    { name: 'T-2', batch: 1, status: 'completed' },
    { name: 'T-3', batch: 2, status: 'pending' }
  ]);

  const md = rebuildTasksMdFromDb(db, 'CR-DONE');
  const rebuilt = parseTasks(md);

  // parseTasks skips rows matching done/complete/✅ — rebuildTasksMdFromDb
  // should also exclude completed units from the output so round-trip is consistent
  const names = rebuilt.map(t => t.name);
  assertTrue(!names.includes('T-2'), 'completed units must be excluded from rebuilt MD');
  assertEqual(names.length, 2, 'only pending units must appear');
});

test('rebuildTasksMdFromDb returns empty table for unknown cr_number', () => {
  const { rebuildTasksMdFromDb } = require('../lib/sprint-history');
  const { parseTasks } = require('../lib/plan-loader');
  const db = buildTestDb();

  seedSprintWithUnits(db, 'CR-EXISTS', [{ name: 'T-1', batch: 1 }]);

  const md = rebuildTasksMdFromDb(db, 'CR-NONEXISTENT');
  const rebuilt = parseTasks(md);
  assertEqual(rebuilt.length, 0, 'unknown cr_number must produce 0 parseable tasks');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
