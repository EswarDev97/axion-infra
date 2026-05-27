/**
 * Test: pre-flight-check.js — checkGraphDependencies
 *
 * Verifies that the graph dependency check:
 *   1. Returns { available: true } on successful Python import
 *   2. Returns { available: false, error: "..." } on failed Python import
 *   3. Is exported from pre-flight-check.js
 */

const path = require('path');

const FIXTURE_OK   = path.join(__dirname, 'fixtures', 'python_check_ok.py');
const FIXTURE_FAIL = path.join(__dirname, 'fixtures', 'python_check_fail.py');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  const result = fn();
  if (result && typeof result.then === 'function') {
    return result
      .then(() => { passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); })
      .catch((e) => { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); });
  }
  passed++;
  console.log(`${colors.green}✓${colors.reset} ${name}`);
  return Promise.resolve();
}

function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${v}`); }
function assertFalse(v, msg = '') { if (v) throw new Error(msg || `Expected falsy, got ${v}`); }

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {

  // Test 1: checkGraphDependencies is exported from pre-flight-check.js
  await test('checkGraphDependencies is exported from pre-flight-check.js', async () => {
    const mod = require('../hooks/pre-flight-check');
    assertTrue(typeof mod.checkGraphDependencies === 'function',
      'checkGraphDependencies should be a function exported from pre-flight-check.js');
  });

  const { checkGraphDependencies } = require('../hooks/pre-flight-check');

  // Test 2: Python check OK fixture → available: true
  await test('checkGraphDependencies: success fixture → { available: true }', async () => {
    process.env.AICODEPATH_PYTHON = 'python3';
    process.env.AICODEPATH_GRAPH_CHECK_SCRIPT = FIXTURE_OK;
    const result = await checkGraphDependencies('/tmp');
    delete process.env.AICODEPATH_GRAPH_CHECK_SCRIPT;
    assertTrue(result.available === true,
      `Expected available: true, got: ${JSON.stringify(result)}`);
  });

  // Test 3: Python check FAIL fixture → available: false, error contains message
  await test('checkGraphDependencies: failure fixture → { available: false, error: "..." }', async () => {
    process.env.AICODEPATH_PYTHON = 'python3';
    process.env.AICODEPATH_GRAPH_CHECK_SCRIPT = FIXTURE_FAIL;
    const result = await checkGraphDependencies('/tmp');
    delete process.env.AICODEPATH_GRAPH_CHECK_SCRIPT;
    assertFalse(result.available,
      `Expected available: false, got: ${JSON.stringify(result)}`);
    assertTrue(typeof result.error === 'string' && result.error.length > 0,
      `Expected non-empty error string, got: ${JSON.stringify(result)}`);
  });

  // Test 4: Non-existent Python executable → available: false
  await test('checkGraphDependencies: non-existent python → { available: false }', async () => {
    process.env.AICODEPATH_PYTHON = '/nonexistent/python999';
    delete process.env.AICODEPATH_GRAPH_CHECK_SCRIPT;
    const result = await checkGraphDependencies('/tmp');
    delete process.env.AICODEPATH_PYTHON;
    assertFalse(result.available,
      `Expected available: false for bad python path, got: ${JSON.stringify(result)}`);
    assertTrue(typeof result.error === 'string' && result.error.length > 0,
      `Expected non-empty error string, got: ${JSON.stringify(result)}`);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
