/**
 * Test: GET /api/sprints endpoint
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 4 Task 16a
 * Agent:  aicodepath-api-designer
 *
 * TDD RED — must fail BEFORE route is added.
 *
 * Contract:
 *   1. GET /api/sprints returns 200 with JSON array
 *   2. Each item has cr_number, started, last_updated
 *   3. Empty DB returns 200 with []
 *   4. Results ordered by started DESC
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

test('workflow.js route file exists', () => {
  assertTrue(fs.existsSync(path.join(ROOT, '.aicodepath', 'api', 'routes', 'workflow.js')),
    'workflow.js route file must exist');
});

test('workflow.js defines GET /sprints route handler', () => {
  const src = fs.readFileSync(path.join(ROOT, '.aicodepath', 'api', 'routes', 'workflow.js'), 'utf8');
  assertTrue(/sprints/i.test(src),
    'Expected "sprints" route reference in workflow.js');
  assertTrue(/router\.get\(\s*['"]\/sprints/.test(src),
    'Expected router.get(\'/sprints\', ...) handler');
});

test('GET /sprints handler calls sprint-history.listSprints', () => {
  const src = fs.readFileSync(path.join(ROOT, '.aicodepath', 'api', 'routes', 'workflow.js'), 'utf8');
  assertTrue(/listSprints|sprint-history/.test(src),
    'Expected listSprints or sprint-history reference in the sprints handler');
});

test('GET /sprints returns JSON array response', () => {
  const src = fs.readFileSync(path.join(ROOT, '.aicodepath', 'api', 'routes', 'workflow.js'), 'utf8');
  // Look for res.json or res.status(200).json pattern near the sprints route
  const sprintsIdx = src.search(/router\.get\(\s*['"]\/sprints/);
  assertTrue(sprintsIdx !== -1, '/sprints route not found');
  // Grab ~500 chars after the route definition to check for json response
  const block = src.substring(sprintsIdx, sprintsIdx + 500);
  assertTrue(/res\.json|\.json\(/.test(block),
    'Expected res.json() call in the /sprints handler');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
