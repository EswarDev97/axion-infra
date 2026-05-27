/**
 * Test: triggerGraphIndexIfEmpty
 *
 * Tests for the auto-index function that fires off background Python indexing
 * when the graph DB is empty or missing (Task 15: Code Graph & RE Enhancement).
 */

'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0;
let failed = 0;

function test(name, fn) {
  const result = fn();
  if (result && typeof result.then === 'function') {
    return result
      .then(() => {
        passed++;
        console.log(COLORS.green + '\u2713' + COLORS.reset + ' ' + name);
      })
      .catch((err) => {
        failed++;
        console.log(COLORS.red + '\u2717' + COLORS.reset + ' ' + name + '\n  ' + COLORS.yellow + err.message + COLORS.reset);
      });
  }
  passed++;
  console.log(COLORS.green + '\u2713' + COLORS.reset + ' ' + name);
  return Promise.resolve();
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + '\n  Expected: ' + JSON.stringify(expected) + '\n  Got:      ' + JSON.stringify(actual));
  }
}

function assertTrue(value, msg) {
  if (!value) throw new Error(msg || ('Expected truthy, got ' + value));
}

let dbCounter = 0;

function uniqueDbPath() {
  dbCounter += 1;
  return path.join(os.tmpdir(), 'test_graph_' + Date.now() + '_' + dbCounter + '.db');
}

function createPopulatedDb(rowCount) {
  const tmpPath = uniqueDbPath();
  const db = new Database(tmpPath);
  db.exec('CREATE TABLE code_entities (id INTEGER PRIMARY KEY, name TEXT)');
  const insert = db.prepare('INSERT INTO code_entities (name) VALUES (?)');
  for (let idx = 0; idx < rowCount; idx++) {
    insert.run('entity_' + idx);
  }
  db.close();
  return tmpPath;
}

function createEmptyDb() {
  const tmpPath = uniqueDbPath();
  const db = new Database(tmpPath);
  db.exec('CREATE TABLE code_entities (id INTEGER PRIMARY KEY, name TEXT)');
  db.close();
  return tmpPath;
}

function missingDbPath() {
  dbCounter += 1;
  return path.join(os.tmpdir(), 'nonexistent_graph_' + Date.now() + '_' + dbCounter + '.db');
}

function setEnvVar(key, value) {
  process.env[key] = value;
}

function restoreEnvVar(key, savedValue) {
  if (savedValue !== undefined) {
    process.env[key] = savedValue;
  } else {
    delete process.env[key];
  }
}

function loadFresh() {
  delete require.cache[require.resolve('../hooks/pre-flight-check')];
  return require('../hooks/pre-flight-check');
}

function removeFile(filePath) {
  try { fs.unlinkSync(filePath); } catch (_err) { /* ignore ENOENT — file may not exist */ }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {

  // 1. Function is exported
  await test('test_is_exported: triggerGraphIndexIfEmpty is exported from pre-flight-check', async () => {
    const savedDb = process.env.AICODEPATH_DB_PATH;
    setEnvVar('AICODEPATH_DB_PATH', missingDbPath());
    const mod = loadFresh();
    assertTrue(
      typeof mod.triggerGraphIndexIfEmpty === 'function',
      'triggerGraphIndexIfEmpty must be exported as a function'
    );
    restoreEnvVar('AICODEPATH_DB_PATH', savedDb);
  });

  // 2. DB with rows → triggered: false
  await test('test_returns_triggered_false_when_db_populated: populated DB → triggered false', async () => {
    const dbPath = createPopulatedDb(3);
    const savedDb = process.env.AICODEPATH_DB_PATH;
    try {
      setEnvVar('AICODEPATH_DB_PATH', dbPath);
      const { triggerGraphIndexIfEmpty } = loadFresh();
      const result = await triggerGraphIndexIfEmpty('/tmp/test-project');
      assertEqual(result.triggered, false, 'Should not trigger when DB has rows');
      assertTrue(typeof result.message === 'string', 'Should include message string');
    } finally {
      restoreEnvVar('AICODEPATH_DB_PATH', savedDb);
      removeFile(dbPath);
    }
  });

  // 3. Empty DB (table exists, no rows) → triggered: true
  await test('test_returns_triggered_true_when_db_empty: empty DB → triggered true', async () => {
    const dbPath = createEmptyDb();
    const savedDb = process.env.AICODEPATH_DB_PATH;
    try {
      setEnvVar('AICODEPATH_DB_PATH', dbPath);
      const { triggerGraphIndexIfEmpty } = loadFresh();
      const result = await triggerGraphIndexIfEmpty('/tmp/test-project');
      assertEqual(result.triggered, true, 'Should trigger when DB has no rows');
      assertTrue(typeof result.message === 'string', 'Should include message string');
    } finally {
      restoreEnvVar('AICODEPATH_DB_PATH', savedDb);
      removeFile(dbPath);
    }
  });

  // 4. DB file missing → triggered: true
  await test('test_returns_triggered_true_when_db_missing: nonexistent DB → triggered true', async () => {
    const dbPath = missingDbPath();
    const savedDb = process.env.AICODEPATH_DB_PATH;
    try {
      setEnvVar('AICODEPATH_DB_PATH', dbPath);
      const { triggerGraphIndexIfEmpty } = loadFresh();
      const result = await triggerGraphIndexIfEmpty('/tmp/test-project');
      assertEqual(result.triggered, true, 'Should trigger when DB file does not exist');
      assertTrue(typeof result.message === 'string', 'Should include message string');
    } finally {
      restoreEnvVar('AICODEPATH_DB_PATH', savedDb);
    }
  });

  // 5. Fire-and-forget: completes within 2s even when indexer is slow (10s sleep)
  await test('test_hook_completes_within_2s: returns in under 2000ms with slow indexer fixture', async () => {
    const dbPath = createEmptyDb();
    const slowScript = path.join(__dirname, 'fixtures', 'slow_indexer.py');
    const savedDb = process.env.AICODEPATH_DB_PATH;
    const savedOverride = process.env.AICODEPATH_GRAPH_SCRIPT_OVERRIDE;
    try {
      setEnvVar('AICODEPATH_DB_PATH', dbPath);
      setEnvVar('AICODEPATH_GRAPH_SCRIPT_OVERRIDE', slowScript);
      const { triggerGraphIndexIfEmpty } = loadFresh();
      const startTime = Date.now();
      const result = await triggerGraphIndexIfEmpty('/tmp/test-project');
      const elapsed = Date.now() - startTime;
      assertTrue(elapsed < 2000, 'Should complete within 2000ms, but took ' + elapsed + 'ms');
      assertEqual(result.triggered, true, 'Should indicate indexing was triggered');
    } finally {
      restoreEnvVar('AICODEPATH_DB_PATH', savedDb);
      restoreEnvVar('AICODEPATH_GRAPH_SCRIPT_OVERRIDE', savedOverride);
      removeFile(dbPath);
    }
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  const total = passed + failed;
  const failColor = failed > 0 ? COLORS.red : '';
  console.log('\n' + total + ' tests: ' + COLORS.green + passed + ' passed' + COLORS.reset + ', ' + failColor + failed + ' failed' + COLORS.reset + '\n');
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
