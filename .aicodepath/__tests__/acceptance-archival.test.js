/**
 * Test: /aicodepath-acceptance wires per-CR archival step
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 4 Task 15
 * Agent:  aicodepath-backend-architect
 *
 * TDD RED — must fail BEFORE acceptance SKILL.md is edited.
 *
 * Asserts the SKILL.md prose contract for the archival step:
 *   - documents copying tasks.md → task/<cr_number>-tasks.md
 *   - documents UPDATE artifacts SET status='archived' for plan+design
 *   - archival step appears in the acceptance checklist
 *   - references cr_number from session-state
 *   - references sprint-history or rebuildTasksMdFromDb
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
const SKILL = path.join(ROOT, '.aicodepath', 'skills', 'aicodepath-acceptance', 'SKILL.md');

test('acceptance SKILL.md exists', () => {
  assertTrue(fs.existsSync(SKILL), `SKILL.md missing at ${SKILL}`);
});

test('SKILL.md documents tasks.md → task/<cr>-tasks.md archival copy', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/task.*tasks\.md|tasks\.md.*task\//i.test(md),
    'Expected archival copy from tasks.md to task/<cr>-tasks.md documented');
  assertTrue(/cr_number|crNumber/i.test(md),
    'Expected cr_number reference for naming the archive file');
});

test('SKILL.md documents UPDATE artifacts SET status=archived for plan+design', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/archived/i.test(md),
    'Expected "archived" status reference for plan/design artifacts');
  assertTrue(/UPDATE\s+artifacts|status.*archived/i.test(md),
    'Expected UPDATE artifacts SET status=archived SQL or equivalent documentation');
});

test('SKILL.md archival step references sprint-history or rebuildTasksMdFromDb', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/sprint-history|rebuildTasksMdFromDb/i.test(md),
    'Expected reference to sprint-history module for rebuilding the archive copy from DB');
});

test('SKILL.md archival step reads cr_number from session-state', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/session-state|session_state/i.test(md),
    'Expected session-state reference for reading cr_number (seeded by brainstorm T8)');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
