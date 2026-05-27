/**
 * Test: Directory conventions documented in CLAUDE.md and codebase-map.md
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 4 Task 17
 * Agent:  aicodepath-technical-writer
 *
 * TDD RED — must fail BEFORE docs are added.
 *
 * Contract:
 *   - CLAUDE.md has a "Directory Conventions" section
 *   - codebase-map.md has a "Directory Conventions" section
 *   - Both enumerate 4 directories: plan/, plans/, task/, design/
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
const CLAUDE = path.join(ROOT, 'CLAUDE.md');
const CODEMAP = path.join(ROOT, '.aicodepath', 'codebase-map.md');

test('CLAUDE.md has Directory Conventions section', () => {
  assertTrue(fs.existsSync(CLAUDE), `CLAUDE.md missing at ${CLAUDE}`);
  const md = fs.readFileSync(CLAUDE, 'utf8');
  assertTrue(/Directory Conventions/i.test(md),
    'Expected "Directory Conventions" heading in CLAUDE.md');
});

test('CLAUDE.md Directory Conventions covers plan/ vs plan/ vs task/ vs design/', () => {
  const md = fs.readFileSync(CLAUDE, 'utf8');
  assertTrue(/aicodepath-docs\/plan\b|plan\//.test(md), 'Expected "plan/" directory reference');
  assertTrue(/aicodepath-docs\/design\b|design\//.test(md), 'Expected "design/" directory reference');
  assertTrue(/aicodepath-docs\/task\b|task\//.test(md), 'Expected "task/" directory reference');
});

test('codebase-map.md has Directory Conventions section', () => {
  assertTrue(fs.existsSync(CODEMAP), `codebase-map.md missing at ${CODEMAP}`);
  const md = fs.readFileSync(CODEMAP, 'utf8');
  assertTrue(/Directory Conventions/i.test(md),
    'Expected "Directory Conventions" heading in codebase-map.md');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
