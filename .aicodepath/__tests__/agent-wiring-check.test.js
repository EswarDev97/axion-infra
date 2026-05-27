/**
 * Test: agent-wiring-check.js (F5)
 *
 * TDD tests written BEFORE implementation — all 5 must fail initially.
 */

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
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${v}`); }
function assertThrows(fn, msgSubstring) {
  try { fn(); throw new Error('Expected function to throw, but it did not'); }
  catch (e) {
    if (e.message === 'Expected function to throw, but it did not') throw e;
    if (msgSubstring && !e.message.includes(msgSubstring)) {
      throw new Error(`Expected error to include "${msgSubstring}", got: "${e.message}"`);
    }
  }
}

const FIXTURES = path.join(__dirname, 'fixtures', 'agent-wiring-check');

// Lazy require — fails cleanly if module doesn't exist yet
let quickWiringCheck;
try {
  ({ quickWiringCheck } = require('../hooks/lib/agent-wiring-check'));
} catch (e) {
  console.error(`${colors.red}Module not found: ../hooks/lib/agent-wiring-check${colors.reset}`);
  console.error(`Run: touch .aicodepath/hooks/lib/agent-wiring-check.js to create it first.\n`);
  process.exit(1);
}

// ── Test 1: fully wired agent returns score 18/18 ─────────────────────────────

test('fully wired agent (security-engineer) returns score 18, max 18', () => {
  const result = quickWiringCheck('aicodepath-security-engineer');
  assertEqual(result.max, 18, 'max should be 18');
  assertEqual(result.score, 18, `score should be 18 but got ${result.score}; missing: ${JSON.stringify(result.missing)}`);
  assertTrue(Array.isArray(result.missing), 'missing should be an array');
  assertEqual(result.missing.length, 0, 'missing array should be empty for fully wired agent');
  assertTrue(typeof result.details === 'object', 'details should be an object');
});

// ── Test 2: missing DOMAIN_MAPPING entry → details.suggesterMap = false ────────

test('missing DOMAIN_MAPPING entry → details.suggesterMap = false, score < 18', () => {
  const result = quickWiringCheck('aicodepath-security-engineer', {
    suggestFilePath: path.join(FIXTURES, 'empty-suggester.js'),
  });
  assertEqual(result.details.suggesterMap, false, 'details.suggesterMap should be false');
  assertTrue(result.score < 18, `score should be < 18 when suggesterMap missing, got ${result.score}`);
  assertTrue(result.missing.includes('suggesterMap'), 'missing should include suggesterMap');
});

// ── Test 3: missing taxonomy row → details.taxonomyRow = false ─────────────────

test('missing taxonomy row → details.taxonomyRow = false, score < 18', () => {
  const result = quickWiringCheck('aicodepath-security-engineer', {
    taxonomyFilePath: path.join(FIXTURES, 'empty-taxonomy.md'),
  });
  assertEqual(result.details.taxonomyRow, false, 'details.taxonomyRow should be false');
  assertTrue(result.score < 18, `score should be < 18 when taxonomyRow missing, got ${result.score}`);
  assertTrue(result.missing.includes('taxonomyRow'), 'missing should include taxonomyRow');
});

// ── Test 4: missing plugin_pack field → details.pluginPackField = false ─────────

test('missing plugin_pack field → details.pluginPackField = false, score < 18', () => {
  const result = quickWiringCheck('aicodepath-security-engineer', {
    agentFilePath: path.join(FIXTURES, 'agent-no-plugin-pack.md'),
  });
  assertEqual(result.details.pluginPackField, false, 'details.pluginPackField should be false');
  assertTrue(result.score < 18, `score should be < 18 when plugin_pack missing, got ${result.score}`);
  assertTrue(result.missing.includes('pluginPackField'), 'missing should include pluginPackField');
});

// ── Test 5: unknown agent name throws with clear error ─────────────────────────

test('unknown agent name throws with clear error message', () => {
  assertThrows(
    () => quickWiringCheck('aicodepath-does-not-exist-at-all'),
    'Unknown agent'
  );
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
process.exit(failed > 0 ? 1 : 0);
