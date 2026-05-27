/**
 * Test: Phase 0 baseline — scripts/phase0-baseline.sh captures DB row counts
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan: aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 1 Task 1
 * Agent: aicodepath-sre-engineer
 *
 * TDD RED — this test must fail BEFORE phase0-baseline.sh is written.
 * It validates the contract: running the script writes a parseable JSON file
 * at aicodepath-docs/temp/phase0-baseline.json with three numeric keys
 * (artifacts, links, units). Specific values are not asserted (the runtime DB
 * may have current non-zero rows).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
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
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, '.aicodepath', 'scripts', 'phase0-baseline.sh');
const OUTPUT = path.join(ROOT, 'aicodepath-docs', 'temp', 'phase0-baseline.json');

// Ensure stale output is removed so the test measures THIS run, not a prior one.
if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);

test('phase0-baseline.sh exists and is executable', () => {
  assertTrue(fs.existsSync(SCRIPT), `Script missing at ${SCRIPT}`);
  const mode = fs.statSync(SCRIPT).mode;
  assertTrue((mode & 0o111) !== 0, `Script not executable (mode=${(mode & 0o777).toString(8)})`);
});

test('running phase0-baseline.sh exits 0 and writes output file', () => {
  execFileSync('bash', [SCRIPT], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  assertTrue(fs.existsSync(OUTPUT), `Expected output at ${OUTPUT}`);
});

test('output file parses as JSON', () => {
  const raw = fs.readFileSync(OUTPUT, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { throw new Error(`Invalid JSON: ${e.message}\nContent: ${raw}`); }
  assertTrue(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Expected JSON object');
});

test('output contains numeric artifacts, links, units keys', () => {
  const data = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
  for (const key of ['artifacts', 'links', 'units']) {
    assertTrue(Object.prototype.hasOwnProperty.call(data, key), `Missing key: ${key}`);
    assertEqual(typeof data[key], 'number', `Key "${key}" must be a number`);
    assertTrue(Number.isFinite(data[key]) && data[key] >= 0, `Key "${key}" must be non-negative finite number, got ${data[key]}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
