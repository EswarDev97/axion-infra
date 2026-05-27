/**
 * Test: GICL Session Manager
 *
 * Tests session lifecycle CRUD operations using in-memory SQLite.
 */

const path = require('path');

// Test utilities
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
    throw new Error(`${message}\n  Expected: ${expected}\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

// ============================================================================
// Setup: In-memory SQLite database
// ============================================================================

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.log(`${colors.yellow}Skipping session-manager tests: better-sqlite3 not available${colors.reset}`);
  process.exit(0);
}

// We test the GICLSessionManager by patching getDbPath to use a temp file
const fs = require('fs');
const os = require('os');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gicl-test-'));
const testDbPath = path.join(tmpDir, 'test.db');

// Create the DB with schema
const setupDb = new Database(testDbPath);
setupDb.pragma('journal_mode = WAL');
setupDb.exec(`
  CREATE TABLE IF NOT EXISTS gicl_sessions (
    id TEXT PRIMARY KEY,
    unit_name TEXT,
    target_file TEXT,
    description TEXT,
    complexity TEXT DEFAULT 'moderate',
    max_iterations INTEGER DEFAULT 7,
    current_iteration INTEGER DEFAULT 0,
    status TEXT DEFAULT 'initialized',
    stop_reason TEXT,
    final_score REAL,
    config JSON,
    total_cost_usd REAL DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS gicl_iterations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    iteration_number INTEGER NOT NULL,
    test_score REAL,
    guideline_score REAL,
    architecture_score REAL,
    duplication_score REAL,
    authenticity_score REAL,
    final_score REAL NOT NULL,
    violations_count INTEGER DEFAULT 0,
    incomplete_requirements_count INTEGER DEFAULT 0,
    violations JSON,
    suggestions JSON,
    fix_plan TEXT,
    file_path TEXT,
    duration_ms INTEGER,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    model_id TEXT,
    cost_usd REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gicl_sessions(id) ON DELETE CASCADE,
    UNIQUE(session_id, iteration_number)
  );
`);
setupDb.close();

// Patch environment for path-resolver
process.env.AICODEPATH_DB_PATH = testDbPath;

const GICLSessionManager = require('../lib/gicl-session-manager');

// ============================================================================
// Tests
// ============================================================================

console.log('\n--- GICLSessionManager ---');

let manager;

function freshManager() {
  if (manager) manager.close();
  manager = new GICLSessionManager(tmpDir);
  return manager;
}

test('createSession returns a session with expected fields', () => {
  const mgr = freshManager();
  const session = mgr.createSession({
    targetFile: 'src/app.js',
    unitName: 'app-feature',
    description: 'Implement app feature',
    complexity: 'moderate',
  });

  assertTrue(session.id.startsWith('gicl_'), 'ID should start with gicl_');
  assertEqual(session.status, 'initialized');
  assertEqual(session.complexity, 'moderate');
  assertEqual(session.max_iterations, 7);
  assertEqual(session.current_iteration, 0);
  assertEqual(session.target_file, 'src/app.js');
  assertEqual(session.unit_name, 'app-feature');
});

test('createSession auto-closes previous active session', () => {
  const mgr = freshManager();
  const first = mgr.createSession({ targetFile: 'a.js' });
  const second = mgr.createSession({ targetFile: 'b.js' });

  const firstRefresh = mgr.getSession(first.id);
  assertEqual(firstRefresh.status, 'stopped', 'First session should be stopped');
  assertEqual(firstRefresh.stop_reason, 'superseded');

  const secondRefresh = mgr.getSession(second.id);
  assertEqual(secondRefresh.status, 'initialized', 'Second session should be active');
});

test('getActiveSession returns the active session', () => {
  const mgr = freshManager();
  mgr.createSession({ targetFile: 'active.js', complexity: 'simple' });

  const active = mgr.getActiveSession();
  assertTrue(active !== null, 'Should find active session');
  assertEqual(active.target_file, 'active.js');
  assertTrue(Array.isArray(active.previousScores), 'Should have previousScores array');
  assertEqual(active.previousScores.length, 0, 'No iterations yet');
});

test('getActiveSession returns null when no active session', () => {
  const mgr = freshManager();
  // Complete any existing sessions
  const active = mgr.getActiveSession();
  if (active) {
    mgr.completeSession(active.id, 'manual_stop');
  }
  const result = mgr.getActiveSession();
  assertEqual(result, null);
});

test('recordIteration increments counter and stores data', () => {
  const mgr = freshManager();
  const session = mgr.createSession({ targetFile: 'iter.js' });

  const updated = mgr.recordIteration(session.id, {
    iterationNumber: 1,
    finalScore: 75.5,
    guidelineScore: 80,
    authenticityScore: 90,
    violationsCount: 3,
    filePath: 'iter.js',
    durationMs: 1200,
  });

  assertEqual(updated.current_iteration, 1);
  assertEqual(updated.status, 'iterating');
  assertEqual(updated.iterations.length, 1);
  assertEqual(updated.iterations[0].final_score, 75.5);
  assertEqual(updated.iterations[0].guideline_score, 80);
  assertEqual(updated.iterations[0].violations_count, 3);
});

test('recordIteration tracks multiple iterations', () => {
  const mgr = freshManager();
  const session = mgr.createSession({ targetFile: 'multi.js' });

  mgr.recordIteration(session.id, { iterationNumber: 1, finalScore: 60 });
  mgr.recordIteration(session.id, { iterationNumber: 2, finalScore: 75 });
  const updated = mgr.recordIteration(session.id, { iterationNumber: 3, finalScore: 85 });

  assertEqual(updated.current_iteration, 3);
  assertEqual(updated.iterations.length, 3);
  assertEqual(updated.previousScores.length, 3);
  assertEqual(updated.previousScores[0], 60);
  assertEqual(updated.previousScores[2], 85);
});

test('completeSession with quality_gate_passed sets status to complete', () => {
  const mgr = freshManager();
  const session = mgr.createSession({ targetFile: 'done.js' });
  mgr.recordIteration(session.id, { iterationNumber: 1, finalScore: 95 });

  const completed = mgr.completeSession(session.id, 'quality_gate_passed', 95);
  assertEqual(completed.status, 'complete');
  assertEqual(completed.stop_reason, 'quality_gate_passed');
  assertEqual(completed.final_score, 95);
  assertTrue(completed.completed_at !== null, 'Should have completed_at');
});

test('completeSession with other reasons sets status to stopped', () => {
  const mgr = freshManager();
  const session = mgr.createSession({ targetFile: 'stopped.js' });

  const stopped = mgr.completeSession(session.id, 'max_iterations_reached', 78);
  assertEqual(stopped.status, 'stopped');
  assertEqual(stopped.stop_reason, 'max_iterations_reached');
});

test('getSession returns full session with iterations', () => {
  const mgr = freshManager();
  const session = mgr.createSession({ targetFile: 'full.js' });
  mgr.recordIteration(session.id, { iterationNumber: 1, finalScore: 70 });
  mgr.recordIteration(session.id, { iterationNumber: 2, finalScore: 85 });

  const full = mgr.getSession(session.id);
  assertEqual(full.iterations.length, 2);
  assertEqual(full.previousScores.length, 2);
  assertTrue(full.id.startsWith('gicl_'));
});

test('getSession returns null for non-existent ID', () => {
  const mgr = freshManager();
  assertEqual(mgr.getSession('gicl_nonexistent'), null);
});

test('getSessionHistory returns recent sessions', () => {
  const mgr = freshManager();
  mgr.createSession({ targetFile: 'hist1.js' });
  // The above supersedes the previous, so we have multiple sessions
  const history = mgr.getSessionHistory(50);
  assertTrue(history.length > 0, 'Should have session history');
  assertTrue(history[0].iteration_count !== undefined, 'Should have iteration_count');
});

test('complexity determines max iterations', () => {
  const mgr = freshManager();

  const trivial = mgr.createSession({ complexity: 'trivial' });
  assertEqual(trivial.max_iterations, 3);

  const complex = mgr.createSession({ complexity: 'complex' });
  assertEqual(complex.max_iterations, 10);

  const veryComplex = mgr.createSession({ complexity: 'very_complex' });
  assertEqual(veryComplex.max_iterations, 15);
});

test('maxIterations override works', () => {
  const mgr = freshManager();
  const session = mgr.createSession({ complexity: 'trivial', maxIterations: 20 });
  assertEqual(session.max_iterations, 20);
});

// ============================================================================
// Cleanup
// ============================================================================

if (manager) manager.close();

// Remove temp dir
try {
  fs.unlinkSync(testDbPath);
  fs.unlinkSync(testDbPath + '-wal');
} catch { /* may not exist */ }
try {
  fs.unlinkSync(testDbPath + '-shm');
} catch { /* may not exist */ }
try {
  fs.rmdirSync(tmpDir);
} catch { /* may not be empty */ }

// Restore env
delete process.env.AICODEPATH_DB_PATH;

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
