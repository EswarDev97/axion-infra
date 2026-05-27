/**
 * Test: GET /api/sprints/:cr/tasks endpoint
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 4 Task 16b
 * Agent:  aicodepath-api-designer
 *
 * TDD RED — must fail BEFORE route is added.
 *
 * Contract:
 *   1. GET /api/sprints/:cr/tasks route exists in workflow.js
 *   2. Calls sprint-history.getSprintTasks with the CR param
 *   3. Returns JSON array response
 *   4. Uses req.params.cr for the CR number
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

const ROOT = path.resolve(__dirname, '..', '..');
const ROUTE = path.join(ROOT, '.aicodepath', 'api', 'routes', 'workflow.js');

test('workflow.js defines GET /sprints/:cr/tasks route handler', () => {
  const src = fs.readFileSync(ROUTE, 'utf8');
  assertTrue(/router\.get\(\s*['"]\/sprints\/:cr\/tasks/.test(src),
    'Expected router.get(\'/sprints/:cr/tasks\', ...) handler');
});

test('sprint tasks handler calls sprint-history.getSprintTasks', () => {
  const src = fs.readFileSync(ROUTE, 'utf8');
  assertTrue(/getSprintTasks/.test(src),
    'Expected getSprintTasks function call in the sprint tasks handler');
});

test('sprint tasks handler passes req.params.cr to getSprintTasks', () => {
  const src = fs.readFileSync(ROUTE, 'utf8');
  assertTrue(/req\.params\.cr/.test(src),
    'Expected req.params.cr passed as the CR number to getSprintTasks');
});

test('sprint tasks handler returns JSON array response', () => {
  const src = fs.readFileSync(ROUTE, 'utf8');
  const idx = src.search(/router\.get\(\s*['"]\/sprints\/:cr\/tasks/);
  assertTrue(idx !== -1, '/sprints/:cr/tasks route not found');
  const block = src.substring(idx, idx + 500);
  assertTrue(/res\.json|\.json\(/.test(block),
    'Expected res.json() call in the sprint tasks handler');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
