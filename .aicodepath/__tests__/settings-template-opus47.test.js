/**
 * Test: Settings template uses effortLevel=xhigh (Opus 4.7 default)
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 5 Task 19
 * Agent:  aicodepath-ml-engineer
 *
 * TDD RED — must fail BEFORE template is edited.
 *
 * Contract:
 *   1. Template has effortLevel: "xhigh" (not "high")
 *   2. Template has NO temperature/top_p/top_k sampling params
 */
const fs = require('fs');
const path = require('path');

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

const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, '.aicodepath', 'templates', 'claude-settings.json.template');

test('settings template file exists', () => {
  assertTrue(fs.existsSync(TEMPLATE), `Template missing at ${TEMPLATE}`);
});

test('template has effortLevel: "xhigh"', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  assertTrue(/"effortLevel"\s*:\s*"xhigh"/.test(src),
    'Expected "effortLevel": "xhigh" in template — CHANGELOG v2.1.111 default for Opus 4.7');
});

test('template has NO temperature/top_p/top_k sampling params', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  assertTrue(!/"temperature"/.test(src), 'temperature must be absent — Opus 4.7 uses effortLevel, not sampling params');
  assertTrue(!/"top_p"/.test(src), 'top_p must be absent');
  assertTrue(!/"top_k"/.test(src), 'top_k must be absent');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
