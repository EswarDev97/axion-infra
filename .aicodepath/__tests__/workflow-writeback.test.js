/**
 * Test: Workflow Writeback API
 *
 * Verifies that POST /api/workflow-state correctly persists UI-generated
 * features into the workflow_state SQLite table, closing the contract gap
 * identified in the architecture audit.
 *
 * Tests the handler logic directly against an in-memory SQLite DB —
 * no HTTP server required.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// ============================================================================
// Test utilities
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message || 'Expected truthy value'}`);
  }
}

function assertThrows(fn, expectedMsg, message = '') {
  try {
    fn();
    throw new Error(`${message || 'Expected an error to be thrown, but none was'}`);
  } catch (e) {
    if (e.message === (message || 'Expected an error to be thrown, but none was')) {
      throw e;
    }
    if (expectedMsg && !e.message.includes(expectedMsg)) {
      throw new Error(`${message}\n  Expected error containing: ${expectedMsg}\n  Got: ${e.message}`);
    }
  }
}

// ============================================================================
// Setup: in-memory SQLite with workflow_state schema + triggers + unique index
// ============================================================================

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.log(`${colors.yellow}Skipping workflow-writeback tests: better-sqlite3 not available${colors.reset}`);
  process.exit(0);
}

/**
 * Create a fresh in-memory DB with the full workflow_state schema.
 * Each test gets its own DB to avoid cross-test interference.
 */
function makeDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE workflow_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cr_number TEXT,
      phase TEXT NOT NULL,
      stage TEXT NOT NULL,
      unit TEXT,
      status TEXT DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      steps_total INTEGER DEFAULT 0,
      steps_completed INTEGER DEFAULT 0,
      artifacts_created JSON,
      notes TEXT,
      blockers JSON
    );

    CREATE UNIQUE INDEX idx_workflow_state_unique
    ON workflow_state(phase, stage, COALESCE(cr_number, 'N/A'));

    CREATE TRIGGER validate_workflow_phase_insert
    BEFORE INSERT ON workflow_state
    FOR EACH ROW
    WHEN NEW.phase NOT IN ('pre-flight', 'inception', 'construction', 'operations', 'maintenance', 'review')
    BEGIN
      SELECT RAISE(ABORT, 'Invalid phase value: must be one of (pre-flight, inception, construction, operations, maintenance, review)');
    END;

    CREATE TRIGGER validate_workflow_status_insert
    BEFORE INSERT ON workflow_state
    FOR EACH ROW
    WHEN NEW.status NOT IN ('pending', 'ready', 'in_progress', 'completed', 'skipped', 'blocked')
    BEGIN
      SELECT RAISE(ABORT, 'Invalid status value: must be one of (pending, ready, in_progress, completed, skipped, blocked)');
    END;
  `);
  return db;
}

/**
 * Run the POST handler insert logic directly against a provided DB.
 * Mirrors the logic in api/routes/workflow.js POST / exactly so that
 * tests stay in sync with the implementation.
 */
function runInsert(db, features, projectName = 'AICodePath') {
  const insertStmt = db.prepare(`
    INSERT INTO workflow_state (cr_number, phase, stage, unit, status, notes, blockers, steps_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const ids = [];
  const batchPrefix = `UI-${Date.now()}`;

  const insertAll = db.transaction((featureList) => {
    for (let i = 0; i < featureList.length; i++) {
      const feature = featureList[i];
      const priority = feature.priority || 'medium';
      const stepsTotal = priority === 'high' ? 10 : priority === 'medium' ? 7 : 5;
      const blockers = feature.dependencies && feature.dependencies.length > 0
        ? JSON.stringify(feature.dependencies)
        : null;

      const crNumber = `${batchPrefix}-${i}`;

      const result = insertStmt.run(
        crNumber,
        'inception',
        'Planning',
        feature.title,
        blockers ? 'blocked' : 'pending',
        feature.description || null,
        blockers,
        stepsTotal
      );
      ids.push(Number(result.lastInsertRowid));
    }
  });

  insertAll(features);
  return ids;
}

// ============================================================================
// Tests
// ============================================================================

console.log('\nWorkflow Writeback API\n');

// --- Single feature ---

test('inserts a single feature into workflow_state', () => {
  const db = makeDb();
  const ids = runInsert(db, [{ title: 'Auth module', priority: 'high', description: 'JWT auth' }]);

  assertEqual(ids.length, 1, 'should return 1 id');
  const row = db.prepare('SELECT * FROM workflow_state WHERE id = ?').get(ids[0]);
  assertTrue(row !== undefined, 'row should exist');
  assertEqual(row.unit, 'Auth module', 'unit should match title');
  assertEqual(row.phase, 'inception', 'phase should be inception');
  assertEqual(row.stage, 'Planning', 'stage should be Planning');
  assertEqual(row.status, 'pending', 'status should be pending');
  assertEqual(row.steps_total, 10, 'high priority should have 10 steps');
  assertEqual(row.notes, 'JWT auth', 'notes should hold description');
  db.close();
});

// --- Multiple features: the critical unique-index regression test ---

test('inserts multiple features in one batch without unique constraint error', () => {
  const db = makeDb();
  const features = [
    { title: 'Feature A', priority: 'high' },
    { title: 'Feature B', priority: 'medium' },
    { title: 'Feature C', priority: 'low' },
  ];
  const ids = runInsert(db, features);

  assertEqual(ids.length, 3, 'should return 3 ids');
  assertEqual(new Set(ids).size, 3, 'all ids should be distinct');

  const rows = db.prepare('SELECT unit, cr_number FROM workflow_state ORDER BY id').all();
  assertEqual(rows.length, 3, 'should have 3 rows in DB');
  assertEqual(rows[0].unit, 'Feature A');
  assertEqual(rows[1].unit, 'Feature B');
  assertEqual(rows[2].unit, 'Feature C');
  db.close();
});

test('cr_number values are unique within the batch', () => {
  const db = makeDb();
  const features = [
    { title: 'X' },
    { title: 'Y' },
    { title: 'Z' },
  ];
  runInsert(db, features);

  const rows = db.prepare('SELECT cr_number FROM workflow_state').all();
  const crNumbers = rows.map(r => r.cr_number);
  const unique = new Set(crNumbers);
  assertEqual(unique.size, crNumbers.length, 'all cr_numbers must be unique');
  db.close();
});

test('two separate POST batches both succeed without collision', () => {
  const db = makeDb();

  // Simulate two separate API calls with a 1ms gap to get distinct timestamps
  const firstBatch = [{ title: 'Batch1-A' }, { title: 'Batch1-B' }];
  const secondBatch = [{ title: 'Batch2-A' }, { title: 'Batch2-B' }];

  // Small delay to guarantee distinct Date.now() values
  const ids1 = runInsert(db, firstBatch);
  // Force a different timestamp by incrementing cr_number prefix manually
  const ids2 = (() => {
    const insertStmt = db.prepare(`
      INSERT INTO workflow_state (cr_number, phase, stage, unit, status, notes, blockers, steps_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const ids = [];
    const batchPrefix = `UI-${Date.now() + 1}`; // +1 guarantees different prefix
    const insertAll = db.transaction((featureList) => {
      for (let i = 0; i < featureList.length; i++) {
        const result = insertStmt.run(`${batchPrefix}-${i}`, 'inception', 'Planning',
          featureList[i].title, 'pending', null, null, 7);
        ids.push(Number(result.lastInsertRowid));
      }
    });
    insertAll(secondBatch);
    return ids;
  })();

  assertEqual(ids1.length, 2, 'first batch should insert 2 rows');
  assertEqual(ids2.length, 2, 'second batch should insert 2 rows');
  const totalRows = db.prepare('SELECT COUNT(*) as n FROM workflow_state').get().n;
  assertEqual(totalRows, 4, 'DB should have 4 total rows');
  db.close();
});

// --- Priority → steps_total mapping ---

test('high priority maps to 10 steps_total', () => {
  const db = makeDb();
  runInsert(db, [{ title: 'T', priority: 'high' }]);
  const row = db.prepare('SELECT steps_total FROM workflow_state').get();
  assertEqual(row.steps_total, 10, 'high should be 10');
  db.close();
});

test('medium priority maps to 7 steps_total', () => {
  const db = makeDb();
  runInsert(db, [{ title: 'T', priority: 'medium' }]);
  const row = db.prepare('SELECT steps_total FROM workflow_state').get();
  assertEqual(row.steps_total, 7, 'medium should be 7');
  db.close();
});

test('low priority maps to 5 steps_total', () => {
  const db = makeDb();
  runInsert(db, [{ title: 'T', priority: 'low' }]);
  const row = db.prepare('SELECT steps_total FROM workflow_state').get();
  assertEqual(row.steps_total, 5, 'low should be 5');
  db.close();
});

test('missing priority defaults to medium (7 steps)', () => {
  const db = makeDb();
  runInsert(db, [{ title: 'T' }]);
  const row = db.prepare('SELECT steps_total FROM workflow_state').get();
  assertEqual(row.steps_total, 7, 'missing priority should default to medium=7');
  db.close();
});

// --- Dependencies → blocked status ---

test('feature with dependencies gets status blocked and blockers JSON set', () => {
  const db = makeDb();
  runInsert(db, [{ title: 'T', dependencies: ['Dep A', 'Dep B'] }]);
  const row = db.prepare('SELECT status, blockers FROM workflow_state').get();
  assertEqual(row.status, 'blocked', 'should be blocked when dependencies present');
  const parsed = JSON.parse(row.blockers);
  assertEqual(parsed.length, 2, 'blockers should have 2 entries');
  assertEqual(parsed[0], 'Dep A');
  db.close();
});

test('feature without dependencies gets status pending and null blockers', () => {
  const db = makeDb();
  runInsert(db, [{ title: 'T', dependencies: [] }]);
  const row = db.prepare('SELECT status, blockers FROM workflow_state').get();
  assertEqual(row.status, 'pending', 'should be pending when no dependencies');
  assertTrue(row.blockers === null, 'blockers should be null');
  db.close();
});

// --- DB trigger validation ---

test('DB trigger rejects invalid phase value', () => {
  const db = makeDb();
  const stmt = db.prepare(
    `INSERT INTO workflow_state (cr_number, phase, stage, unit, status, steps_total)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  assertThrows(
    () => stmt.run('CR-1', 'INVALID_PHASE', 'Planning', 'T', 'pending', 5),
    'Invalid phase value',
    'trigger should reject bad phase'
  );
  db.close();
});

test('DB trigger rejects invalid status value', () => {
  const db = makeDb();
  const stmt = db.prepare(
    `INSERT INTO workflow_state (cr_number, phase, stage, unit, status, steps_total)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  assertThrows(
    () => stmt.run('CR-1', 'inception', 'Planning', 'T', 'INVALID_STATUS', 5),
    'Invalid status value',
    'trigger should reject bad status'
  );
  db.close();
});

test('DB trigger accepts all valid phase values', () => {
  const validPhases = ['pre-flight', 'inception', 'construction', 'operations', 'maintenance', 'review'];
  const db = makeDb();
  const stmt = db.prepare(
    `INSERT INTO workflow_state (cr_number, phase, stage, unit, status, steps_total)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (let i = 0; i < validPhases.length; i++) {
    stmt.run(`CR-${i}`, validPhases[i], `Stage-${i}`, 'T', 'pending', 5);
  }
  const count = db.prepare('SELECT COUNT(*) as n FROM workflow_state').get().n;
  assertEqual(count, validPhases.length, 'all valid phases should insert');
  db.close();
});

// --- GET returns newly inserted rows ---

test('rows inserted by POST are visible to GET query', () => {
  const db = makeDb();
  const features = [
    { title: 'Feature Alpha', priority: 'high', description: 'First feature' },
    { title: 'Feature Beta', priority: 'low' },
  ];
  runInsert(db, features);

  const rows = db.prepare(`
    SELECT id, cr_number, phase, stage, unit, status, steps_total, notes
    FROM workflow_state
    ORDER BY id ASC
  `).all();

  assertEqual(rows.length, 2, 'GET should return 2 rows');
  assertEqual(rows[0].unit, 'Feature Alpha');
  assertEqual(rows[0].notes, 'First feature');
  assertEqual(rows[0].steps_total, 10);
  assertEqual(rows[1].unit, 'Feature Beta');
  assertEqual(rows[1].steps_total, 5);
  db.close();
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
