/**
 * Test: /aicodepath-specify seeds cr_number (PM-driven flow mirror of T8)
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 3 Task 9
 * Design: aicodepath-docs/design/2026-04-18-opus-4-7-alignment-design.md DEC-4
 * Agent:  aicodepath-backend-architect
 *
 * TDD RED — must fail BEFORE specify/SKILL.md is edited.
 *
 * Asserts the SKILL.md prose contract mirrors brainstorm's T8 contract:
 *   - file exists at .aicodepath/skills/aicodepath-specify/SKILL.md
 *   - documents the literal format token `CR-YYYY-MM-DD`
 *   - documents the slug transform (slugify / kebab / topic-slug reference)
 *   - references session-state / session-state-manager for passing the value
 *   - names a concrete variable identifier (crNumber or cr_number)
 *   - seeding appears before the Handoff step (so downstream /aicodepath-write-plan
 *     and /aicodepath-gap-analysis both see the CR).
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
const SKILL = path.join(ROOT, '.aicodepath', 'skills', 'aicodepath-specify', 'SKILL.md');

test('specify SKILL.md exists', () => {
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
    'Expected a session-state / session-state-manager reference for passing crNumber');
});

test('SKILL.md names a concrete variable identifier for the CR (crNumber or cr_number)', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/\bcrNumber\b|\bcr_number\b/.test(md),
    'Expected a concrete variable name (crNumber or cr_number)');
});

test('cr_number seeding appears before the Handoff / write-plan transition', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  const crIdx = md.search(/CR-YYYY-MM-DD/);
  const handoffIdx = md.search(/##\s*Handoff|###\s*Step\s*4\s*:\s*Handoff|Handoff/i);
  assertTrue(crIdx !== -1, 'cr_number format token not found');
  assertTrue(handoffIdx !== -1, 'Could not locate Handoff step');
  assertTrue(crIdx < handoffIdx,
    'cr_number seeding must be documented before the Handoff step so /aicodepath-write-plan reads it from session-state');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
