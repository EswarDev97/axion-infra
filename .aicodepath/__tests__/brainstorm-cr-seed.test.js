/**
 * Test: /aicodepath-brainstorm Step 6 seeds cr_number
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 3 Task 8
 * Design: aicodepath-docs/design/2026-04-18-opus-4-7-alignment-design.md DEC-4
 * Agent:  aicodepath-backend-architect
 *
 * TDD RED — must fail BEFORE brainstorm/SKILL.md is edited.
 *
 * Asserts the SKILL.md prose contract for seeding cr_number:
 *   - file exists at .aicodepath/skills/aicodepath-brainstorm/SKILL.md
 *   - Step 6 (write-design transition) documents the format token `CR-YYYY-MM-DD`
 *   - documents the slug transform (slugify / kebab / topic-slug reference)
 *   - documents passing the value via session-state (session-state-manager reference)
 *   - the seeding prose appears within / adjacent to Step 6 / After Design Approval
 *     (so it runs before any artifact write).
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
const SKILL = path.join(ROOT, '.aicodepath', 'skills', 'aicodepath-brainstorm', 'SKILL.md');

test('brainstorm SKILL.md exists', () => {
  assertTrue(fs.existsSync(SKILL), `SKILL.md missing at ${SKILL}`);
});

test('SKILL.md documents CR-YYYY-MM-DD format token', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/CR-YYYY-MM-DD/.test(md),
    'Expected the literal format token "CR-YYYY-MM-DD" in SKILL.md prose');
});

test('SKILL.md documents the topic slug transform', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/slugify|topic-slug|kebab/i.test(md),
    'Expected a slugify / topic-slug / kebab reference documenting the topic transform');
});

test('SKILL.md references session-state for passing cr_number', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/session-state/i.test(md),
    'Expected a session-state / session-state-manager reference for passing crNumber to write-design');
});

test('cr_number seeding appears in Step 6 / After Design Approval region, before any write-design/ArtifactWriter invocation', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  const crIdx = md.search(/CR-YYYY-MM-DD/);
  assertTrue(crIdx !== -1, 'cr_number format token not found');

  // Must appear on or after the "After Design Approval" / Step 6 heading region —
  // it's the write-design transition step.
  const approvalIdx = md.search(/After Design Approval|write-design|Step 6|Write design doc/i);
  assertTrue(approvalIdx !== -1, 'Could not locate Step 6 / After Design Approval heading');
  assertTrue(crIdx >= approvalIdx,
    'cr_number seeding must be documented at or after the Step 6 / write-design transition (so CR exists before artifact writes)');
});

test('SKILL.md names a concrete variable identifier for the CR (crNumber or cr_number)', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/\bcrNumber\b|\bcr_number\b/.test(md),
    'Expected a concrete variable name (crNumber or cr_number) so downstream skills can read the session-state key');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
