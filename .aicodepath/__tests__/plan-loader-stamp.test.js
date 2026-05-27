/**
 * Test: plan-loader.js stamps plan_artifact_id + design_artifact_id on newly
 *       inserted units AND creates an `implements` link from plan → design.
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 3 Task 12
 * Design: aicodepath-docs/design/2026-04-18-opus-4-7-alignment-design.md DEC-3/DEC-5
 * Agent:  aicodepath-backend-architect
 * Reviewer: aicodepath-database-architect
 *
 * TDD RED — must fail BEFORE plan-loader.js is edited.
 *
 * Contract asserted:
 *   1. After `loadPlan(db, sessionId)`, every newly inserted unit row has
 *      `plan_artifact_id = <planId from session_state>`.
 *   2. Every newly inserted unit also has `design_artifact_id = <designId from
 *      session_state>` when that key is present.
 *   3. `plan_artifact_id` is NOT stamped when session_state.plan_artifact_id is
 *      missing (graceful no-op, not an error).
 *   4. An `implements` link exists from plan_artifact_id → design_artifact_id
 *      after load (DoD: `SELECT COUNT(*) FROM links WHERE link_type='implements' >= 1`
 *      — sprint-level traceability; per-unit link stubs are out of scope for T12
 *      since units are not artifacts per the schema FK).
 *   5. The 7-column tasks.md parser is UNCHANGED — parseTasks still returns the
 *      same object shape and TASKS_MD_COLUMNS is still exported.
 *
 * Harness: an in-memory better-sqlite3 DB seeded with the minimal schema
 * subset (artifacts, units + migration 023 columns, unit_dependencies,
 * session_state, links). No disk I/O against aicodepath.db.
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

// Build a minimal in-memory DB that mirrors the real schema surface loadPlan
// and the T12 stamping code path need. Kept deliberately narrow so this test
// never drifts when unrelated tables evolve.
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

    CREATE TABLE unit_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      depends_on_unit_id INTEGER NOT NULL,
      dependency_type TEXT DEFAULT 'blocks',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_unit_id) REFERENCES units(id) ON DELETE CASCADE,
      UNIQUE(unit_id, depends_on_unit_id)
    );

    CREATE TABLE session_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      link_type TEXT NOT NULL,
      description TEXT,
      confidence REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT DEFAULT 'system',
      FOREIGN KEY (source_id) REFERENCES artifacts(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES artifacts(id) ON DELETE CASCADE,
      UNIQUE(source_id, target_id, link_type)
    );
  `);
  return db;
}

function seedArtifact(db, artifactType, title, filePath) {
  const r = db.prepare(`
    INSERT INTO artifacts (artifact_type, phase, stage, title, file_path, cr_number, metadata)
    VALUES (?, 'inception', ?, ?, ?, 'CR-2026-04-18', '{"source":"artifact-writer"}')
  `).run(artifactType, artifactType, title, filePath);
  return r.lastInsertRowid;
}

function seedSessionState(db, key, value) {
  db.prepare(`INSERT OR REPLACE INTO session_state (key, value) VALUES (?, ?)`)
    .run(key, JSON.stringify(value));
}

function writeTempTasksMd(rows) {
  const header = '| Task | Agent | Content | DoD | Depends | Batch | Status |\n| --- | --- | --- | --- | --- | --- | --- |';
  const body = rows.map(r => `| ${r.name} | ${r.agent || '—'} | ${r.content || '—'} | ${r.dod || '—'} | ${r.depends || '—'} | ${r.batch || 1} | ${r.status || 'TODO'} |`).join('\n');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-plan-loader-'));
  const p = path.join(dir, 'tasks.md');
  fs.writeFileSync(p, `# Tasks: Test\n\n${header}\n${body}\n`);
  return p;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('loadPlan still parses 7-column tasks.md (regression guard — parseTasks unchanged)', () => {
  const { parseTasks, TASKS_MD_COLUMNS } = require('../lib/plan-loader');
  assertEqual(TASKS_MD_COLUMNS.join(','), 'Task,Agent,Content,DoD,Depends,Batch,Status',
    '7-column contract must remain intact — T12 must not touch the parser');
  const md = fs.readFileSync(writeTempTasksMd([
    { name: 'T-A', agent: 'agent-x', content: 'Do A', dod: 'test passes', batch: 1 }
  ]), 'utf-8');
  const tasks = parseTasks(md);
  assertEqual(tasks.length, 1, 'parseTasks must still return one task for the seed row');
  assertEqual(tasks[0].name, 'T-A');
  assertEqual(tasks[0].agent, 'agent-x');
});

test('loadPlan stamps plan_artifact_id on every newly inserted unit', () => {
  const { loadPlan } = require('../lib/plan-loader');
  const db = buildTestDb();
  const planId = seedArtifact(db, 'plan', 'Test Plan', 'aicodepath-docs/plan/test.md');
  const designId = seedArtifact(db, 'design', 'Test Design', 'aicodepath-docs/design/test.md');
  seedSessionState(db, 'plan_artifact_id', planId);
  seedSessionState(db, 'design_artifact_id', designId);

  const tasksPath = writeTempTasksMd([
    { name: 'T-A', agent: 'agent-x', content: 'Do A', dod: 'pass', batch: 1 },
    { name: 'T-B', agent: 'agent-y', content: 'Do B', dod: 'pass', batch: 1 }
  ]);

  loadPlan(db, 'session-t12', { tasksPath });

  const rows = db.prepare('SELECT name, plan_artifact_id FROM units WHERE session_id = ? ORDER BY id').all('session-t12');
  assertEqual(rows.length, 2, 'Two units must be inserted');
  for (const r of rows) {
    assertEqual(r.plan_artifact_id, planId,
      `unit "${r.name}" must have plan_artifact_id = ${planId} (got ${r.plan_artifact_id})`);
  }
});

test('loadPlan stamps design_artifact_id on every newly inserted unit', () => {
  const { loadPlan } = require('../lib/plan-loader');
  const db = buildTestDb();
  const planId = seedArtifact(db, 'plan', 'Test Plan', 'p.md');
  const designId = seedArtifact(db, 'design', 'Test Design', 'd.md');
  seedSessionState(db, 'plan_artifact_id', planId);
  seedSessionState(db, 'design_artifact_id', designId);

  const tasksPath = writeTempTasksMd([{ name: 'T-solo', agent: '—', content: 'c', dod: 'd', batch: 1 }]);
  loadPlan(db, 'session-d', { tasksPath });

  const r = db.prepare('SELECT design_artifact_id FROM units WHERE session_id = ?').get('session-d');
  assertEqual(r.design_artifact_id, designId, 'unit must have design_artifact_id stamped from session_state');
});

test('loadPlan leaves plan_artifact_id NULL when session_state.plan_artifact_id is absent (graceful no-op)', () => {
  const { loadPlan } = require('../lib/plan-loader');
  const db = buildTestDb();
  // Deliberately do not seed plan_artifact_id / design_artifact_id
  const tasksPath = writeTempTasksMd([{ name: 'T-solo', agent: '—', content: 'c', dod: 'd', batch: 1 }]);
  loadPlan(db, 'session-nostate', { tasksPath });

  const r = db.prepare('SELECT plan_artifact_id, design_artifact_id FROM units WHERE session_id = ?').get('session-nostate');
  assertEqual(r.plan_artifact_id, null, 'plan_artifact_id must be NULL when session_state is missing (no crash)');
  assertEqual(r.design_artifact_id, null, 'design_artifact_id must be NULL when session_state is missing');
});

test('loadPlan creates an implements link from plan → design (sprint-level traceability)', () => {
  const { loadPlan } = require('../lib/plan-loader');
  const db = buildTestDb();
  const planId = seedArtifact(db, 'plan', 'Test Plan', 'p.md');
  const designId = seedArtifact(db, 'design', 'Test Design', 'd.md');
  seedSessionState(db, 'plan_artifact_id', planId);
  seedSessionState(db, 'design_artifact_id', designId);

  const tasksPath = writeTempTasksMd([
    { name: 'T-A', agent: '—', content: 'c', dod: 'd', batch: 1 },
    { name: 'T-B', agent: '—', content: 'c', dod: 'd', batch: 1 }
  ]);
  loadPlan(db, 'session-link', { tasksPath });

  const linkCount = db.prepare("SELECT COUNT(*) AS n FROM links WHERE link_type = 'implements'").get().n;
  assertTrue(linkCount >= 1,
    `Expected at least 1 implements link after load; got ${linkCount}. ` +
    `DoD: SELECT COUNT(*) FROM links WHERE link_type='implements' ≥ 1 (plan→design edge).`);

  const edge = db.prepare(`
    SELECT source_id, target_id FROM links
    WHERE link_type = 'implements' AND source_id = ? AND target_id = ?
  `).get(planId, designId);
  assertTrue(edge, 'Expected implements edge plan_artifact_id → design_artifact_id');
});

test('loadPlan does NOT create an implements link when design_artifact_id is missing', () => {
  const { loadPlan } = require('../lib/plan-loader');
  const db = buildTestDb();
  const planId = seedArtifact(db, 'plan', 'Test Plan', 'p.md');
  seedSessionState(db, 'plan_artifact_id', planId);
  // Deliberately skip design_artifact_id

  const tasksPath = writeTempTasksMd([{ name: 'T-A', agent: '—', content: 'c', dod: 'd', batch: 1 }]);
  loadPlan(db, 'session-noedge', { tasksPath });

  const linkCount = db.prepare("SELECT COUNT(*) AS n FROM links WHERE link_type = 'implements'").get().n;
  assertEqual(linkCount, 0,
    'No implements link must be created when design_artifact_id is not in session_state');
});

test('loadPlan is idempotent — re-running does not duplicate implements link (UNIQUE constraint respected)', () => {
  const { loadPlan } = require('../lib/plan-loader');
  const db = buildTestDb();
  const planId = seedArtifact(db, 'plan', 'Test Plan', 'p.md');
  const designId = seedArtifact(db, 'design', 'Test Design', 'd.md');
  seedSessionState(db, 'plan_artifact_id', planId);
  seedSessionState(db, 'design_artifact_id', designId);

  const tasksPath = writeTempTasksMd([{ name: 'T-A', agent: '—', content: 'c', dod: 'd', batch: 1 }]);
  loadPlan(db, 'session-idem', { tasksPath });
  loadPlan(db, 'session-idem', { tasksPath }); // second run, same inputs

  const linkCount = db.prepare("SELECT COUNT(*) AS n FROM links WHERE link_type = 'implements'").get().n;
  assertEqual(linkCount, 1,
    'Re-running loadPlan must not insert a duplicate implements link (UNIQUE(source,target,type) holds)');
});

test('loadPlan returns graceful zeros when no task file found (resolver returns null)', () => {
  const { loadPlan } = require('../lib/plan-loader');
  const db = buildTestDb();
  // Point to a non-existent task directory via a temp root with empty task/
  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-empty-'));
  fs.mkdirSync(path.join(emptyRoot, 'aicodepath-docs', 'task'), { recursive: true });

  // Monkey-patch path-resolver for this test
  const pathResolverMod = require('../lib/path-resolver');
  const origFindRoot = pathResolverMod.findProjectRoot;
  pathResolverMod.findProjectRoot = () => emptyRoot;

  try {
    const result = loadPlan(db, 'session-empty');
    assertEqual(result.inserted, 0, 'inserted must be 0 when no task file');
    assertEqual(result.skipped, 0, 'skipped must be 0 when no task file');
    assertEqual(result.dependencies, 0, 'dependencies must be 0 when no task file');
  } finally {
    pathResolverMod.findProjectRoot = origFindRoot;
    fs.rmSync(emptyRoot, { recursive: true, force: true });
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
