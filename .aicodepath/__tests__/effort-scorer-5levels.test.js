/**
 * Test: EFFORT_LEVELS extended to 5 entries (low/medium/high/xhigh/max)
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 5 Task 20
 * Agent:  aicodepath-ml-engineer
 *
 * TDD RED — must fail BEFORE effort-scorer.js is edited.
 *
 * Contract:
 *   1. EFFORT_LEVELS has exactly 5 keys: low, medium, high, xhigh, max
 *   2. Each entry has symbol, label, min, max fields
 *   3. xhigh sits between high and max
 *   4. EFFORT_LEVELS is exported
 */
const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}

const { EFFORT_LEVELS } = require('../lib/effort-scorer');

const keys = Object.keys(EFFORT_LEVELS);

test('EFFORT_LEVELS has exactly 5 entries', () => {
  assertEqual(keys.length, 5, `Expected 5 effort levels, got ${keys.length}`);
});

test('EFFORT_LEVELS keys are low, medium, high, xhigh, max', () => {
  assertEqual(keys[0], 'low');
  assertEqual(keys[1], 'medium');
  assertEqual(keys[2], 'high');
  assertEqual(keys[3], 'xhigh');
  assertEqual(keys[4], 'max');
});

test('Each level has symbol, label, min, max fields', () => {
  for (const key of keys) {
    const level = EFFORT_LEVELS[key];
    assertTrue(typeof level.symbol === 'string', `${key} must have symbol`);
    assertTrue(typeof level.label === 'string', `${key} must have label`);
    assertTrue(typeof level.min === 'number', `${key} must have min`);
    assertTrue(level.max === Infinity || typeof level.max === 'number', `${key} must have max`);
  }
});

test('xhigh has label "X-High"', () => {
  assertTrue(EFFORT_LEVELS.xhigh, 'xhigh level must exist');
  assertEqual(EFFORT_LEVELS.xhigh.label, 'X-High');
});

test('max has label "Max"', () => {
  assertTrue(EFFORT_LEVELS.max, 'max level must exist');
  assertEqual(EFFORT_LEVELS.max.label, 'Max');
});

test('xhigh min > high min', () => {
  assertTrue(EFFORT_LEVELS.xhigh.min > EFFORT_LEVELS.high.min,
    'xhigh threshold must be above high threshold');
});

test('max min > xhigh min', () => {
  assertTrue(EFFORT_LEVELS.max.min > EFFORT_LEVELS.xhigh.min,
    'max threshold must be above xhigh threshold');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
