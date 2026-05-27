/**
 * Test: Reflexion Learner
 */

const Database = require('better-sqlite3');
const ReflexionLearner = require('../lib/reflexion-learner');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${v}`); }
function assertFalse(v, msg = '') { if (v) throw new Error(msg || `Expected falsy, got ${v}`); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDb() {
  return new Database(':memory:');
}

function makeRL(db) {
  return new ReflexionLearner(db, '/test/project');
}

// ── _ensureTable ──────────────────────────────────────────────────────────────

test('creates reflexion_patterns table on construction', () => {
  const db = makeDb();
  makeRL(db);
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reflexion_patterns'").get();
  assertTrue(!!row, 'Table should exist');
  db.close();
});

// ── recordFailure ─────────────────────────────────────────────────────────────

test('recordFailure returns a positive integer row id', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ errorType: 'test_failure', description: 'test broke', failureReason: 'assertion failed' });
  assertTrue(id > 0, `id should be positive, got ${id}`);
  db.close();
});

test('recordFailure stores error_type, description, failure_reason', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({
    errorType: 'api_mismatch',
    description: 'called wrong endpoint',
    failureReason: '404 not found',
    sessionId: 'sess-1',
  });
  const row = db.prepare('SELECT * FROM reflexion_patterns WHERE id = ?').get(id);
  assertEqual(row.error_type, 'api_mismatch');
  assertEqual(row.description, 'called wrong endpoint');
  assertEqual(row.failure_reason, '404 not found');
  assertEqual(row.session_id, 'sess-1');
  assertEqual(row.solution, null, 'Solution should be null before resolution');
  db.close();
});

test('recordFailure uses "unknown" when errorType is missing', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ description: 'oops', failureReason: 'boom' });
  const row = db.prepare('SELECT error_type FROM reflexion_patterns WHERE id = ?').get(id);
  assertEqual(row.error_type, 'unknown');
  db.close();
});

test('recordFailure stores project_root correctly', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ errorType: 'syntax_error', description: 'bad syntax', failureReason: 'parse error' });
  const row = db.prepare('SELECT project_root FROM reflexion_patterns WHERE id = ?').get(id);
  assertEqual(row.project_root, '/test/project');
  db.close();
});

// ── recordResolution ──────────────────────────────────────────────────────────

test('recordResolution sets solution and confidence', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ errorType: 'test_failure', description: 'foo', failureReason: 'bar' });
  rl.recordResolution(id, 'Use async/await instead of callbacks');
  const row = db.prepare('SELECT solution, confidence, resolved_at FROM reflexion_patterns WHERE id = ?').get(id);
  assertEqual(row.solution, 'Use async/await instead of callbacks');
  assertEqual(row.confidence, 0.8);
  assertTrue(!!row.resolved_at, 'resolved_at should be set');
  db.close();
});

// ── findSimilar ───────────────────────────────────────────────────────────────

test('findSimilar returns empty array when no patterns match', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const results = rl.findSimilar({ errorType: 'nonexistent', description: 'no matches' });
  assertEqual(results.length, 0, 'Should return empty array');
  db.close();
});

test('findSimilar returns resolved patterns only (not unresolved)', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id1 = rl.recordFailure({ errorType: 'test_failure', description: 'same bug', failureReason: 'reason' });
  // id1 has no resolution — should not appear
  rl.recordFailure({ errorType: 'test_failure', description: 'other bug', failureReason: 'reason' });
  // Add a resolved one with same errorType
  const id2 = rl.recordFailure({ errorType: 'test_failure', description: 'resolved bug', failureReason: 'reason' });
  rl.recordResolution(id2, 'the fix');

  const results = rl.findSimilar({ errorType: 'test_failure', description: 'resolved bug' });
  assertEqual(results.length, 1, 'Should only return resolved patterns');
  assertEqual(results[0].id, id2);
  db.close();
});

test('findSimilar matches by exact context hash (same description)', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ errorType: 'syntax_error', description: 'missing semicolon', failureReason: 'parse failed' });
  rl.recordResolution(id, 'Add semicolon at line 42');

  const results = rl.findSimilar({ errorType: 'syntax_error', description: 'missing semicolon' });
  assertTrue(results.length > 0, 'Should find by hash match');
  assertEqual(results[0].id, id);
  db.close();
});

test('findSimilar broader search finds patterns by error_type across any description', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ errorType: 'api_mismatch', description: 'totally different desc', failureReason: 'wrong field' });
  rl.recordResolution(id, 'Check the schema');

  // Search with different description but same errorType
  const results = rl.findSimilar({ errorType: 'api_mismatch', description: 'unrelated query text here' });
  assertTrue(results.some(r => r.id === id), 'Should find via broader error_type search');
  db.close();
});

test('findSimilar respects limit parameter', () => {
  const db = makeDb();
  const rl = makeRL(db);
  for (let i = 0; i < 5; i++) {
    const id = rl.recordFailure({ errorType: 'test_failure', description: `bug ${i}`, failureReason: 'reason' });
    rl.recordResolution(id, `fix ${i}`);
  }
  const results = rl.findSimilar({ errorType: 'test_failure', description: 'bug 0', limit: 2 });
  assertTrue(results.length <= 2, `Should respect limit=2, got ${results.length}`);
  db.close();
});

// ── markHelpful ───────────────────────────────────────────────────────────────

test('markHelpful increments times_used and times_helped', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ errorType: 'test_failure', description: 'foo', failureReason: 'bar' });
  rl.recordResolution(id, 'solution');
  rl.markHelpful(id);
  const row = db.prepare('SELECT times_used, times_helped FROM reflexion_patterns WHERE id = ?').get(id);
  assertEqual(row.times_used, 1);
  assertEqual(row.times_helped, 1);
  db.close();
});

test('markHelpful increases confidence by 0.1 (capped at 1.0)', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id = rl.recordFailure({ errorType: 'test_failure', description: 'foo', failureReason: 'bar' });
  rl.recordResolution(id, 'solution'); // sets confidence = 0.8
  rl.markHelpful(id); // 0.8 + 0.1 = 0.9
  const row = db.prepare('SELECT confidence FROM reflexion_patterns WHERE id = ?').get(id);
  assertTrue(Math.abs(row.confidence - 0.9) < 0.001, `Expected ~0.9, got ${row.confidence}`);
  db.close();
});

// ── formatHints ───────────────────────────────────────────────────────────────

test('formatHints returns empty string for empty array', () => {
  const db = makeDb();
  const rl = makeRL(db);
  assertEqual(rl.formatHints([]), '');
  db.close();
});

test('formatHints includes error_type, failure_reason, and solution', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const hints = rl.formatHints([{
    error_type: 'api_mismatch',
    description: 'called wrong endpoint',
    failure_reason: '404 not found',
    solution: 'Use /api/v2/ prefix',
    confidence: 0.8,
  }]);
  assertTrue(hints.includes('api_mismatch'), 'Should include error_type');
  assertTrue(hints.includes('404 not found'), 'Should include failure_reason');
  assertTrue(hints.includes('Use /api/v2/ prefix'), 'Should include solution');
  assertTrue(hints.includes('80%'), 'Should include confidence percentage');
  db.close();
});

test('formatHints includes Past Similar Failures header', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const hints = rl.formatHints([{
    error_type: 'test_failure',
    description: 'x',
    failure_reason: 'y',
    solution: 'z',
    confidence: 0.5,
  }]);
  assertTrue(hints.includes('Past Similar Failures'), 'Should have header');
  db.close();
});

// ── getStats ──────────────────────────────────────────────────────────────────

test('getStats returns zero total for empty project', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const stats = rl.getStats();
  // COUNT(*) returns 0 on empty; SUM/AVG return null (SQLite aggregate behavior)
  assertEqual(stats.total, 0);
  assertTrue(stats.resolved === 0 || stats.resolved === null, `resolved should be 0 or null, got ${stats.resolved}`);
  db.close();
});

test('getStats returns correct total and resolved counts', () => {
  const db = makeDb();
  const rl = makeRL(db);
  const id1 = rl.recordFailure({ errorType: 'test_failure', description: 'a', failureReason: 'b' });
  rl.recordResolution(id1, 'fix a');
  rl.recordFailure({ errorType: 'syntax_error', description: 'c', failureReason: 'd' });
  // 2 total, 1 resolved

  const stats = rl.getStats();
  assertEqual(stats.total, 2);
  assertEqual(stats.resolved, 1);
  assertEqual(stats.error_types, 2); // test_failure + syntax_error
  db.close();
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
