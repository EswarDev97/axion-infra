/**
 * Test: /aicodepath-write-plan wires ArtifactWriter + LinkManager post-save
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 3 Task 11
 * Design: aicodepath-docs/design/2026-04-18-opus-4-7-alignment-design.md DEC-3/DEC-5
 * Agent:  aicodepath-backend-architect
 *
 * TDD RED — must fail BEFORE write-plan/SKILL.md is edited.
 *
 * Asserts the SKILL.md prose contract for the post-save ArtifactWriter + LinkManager step:
 *   - file exists at .aicodepath/skills/aicodepath-write-plan/SKILL.md
 *   - documents invoking ArtifactWriter.createArtifact
 *   - documents artifact_type = 'plan'
 *   - documents phase = 'inception' and stage = 'plan'
 *   - reads cr_number from session-state (seeded by brainstorm in T8)
 *   - reads design_artifact_id from session-state (stored by write-design in T10)
 *   - wraps calls under ACP_SUPPRESS_AUTO_ARTIFACT=1 (primary re-entry guard)
 *   - tags metadata.source = 'artifact-writer' (secondary re-entry guard per T2)
 *   - documents LinkManager.createLink with link_type = 'derived_from'
 *   - stores the new plan artifact id in session-state as plan_artifact_id
 *     so plan-loader.js (T12) can stamp it on units.
 *   - the ArtifactWriter block appears AFTER Step 11 (Save plan) and BEFORE
 *     Step 12 (Commit plan) — same invariant T10 established for write-design.
 *
 * End-to-end DB assertion (plan row + derived_from link exist) is the concern
 * of T34 acceptance integration; T11 itself establishes the skill-level contract.
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
const SKILL = path.join(ROOT, '.aicodepath', 'skills', 'aicodepath-write-plan', 'SKILL.md');

test('write-plan SKILL.md exists', () => {
  assertTrue(fs.existsSync(SKILL), `SKILL.md missing at ${SKILL}`);
});

test('SKILL.md documents ArtifactWriter invocation', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/ArtifactWriter/.test(md),
    'Expected ArtifactWriter reference (class name) in SKILL.md');
  assertTrue(/createArtifact\b|\.create\(/.test(md),
    'Expected createArtifact or .create( method invocation documented');
});

test('SKILL.md documents artifact_type = "plan"', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  // Either positional ('plan' as first arg to createArtifact) or object form
  assertTrue(/artifact_type\s*[:=]\s*['"]plan['"]|createArtifact\(\s*['"]plan['"]|['"]plan['"]\s*,\s*\/\/\s*artifact_type/.test(md),
    'Expected artifact_type="plan" to be documented as the ArtifactWriter type');
});

test('SKILL.md documents phase = "inception" and stage = "plan"', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/['"]inception['"]/.test(md),
    'Expected phase="inception" — plan artifact is recorded during inception phase, before the transition to CONSTRUCTION');
  assertTrue(/\/\/\s*stage\s*=?\s*['"]?plan['"]?|stage\s*[:=]\s*['"]plan['"]|['"]plan['"]\s*,\s*\/\/\s*stage/.test(md),
    'Expected stage="plan" to be documented in the ArtifactWriter block');
});

test('SKILL.md reads cr_number from session-state', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/session-state/i.test(md),
    'Expected session-state reference for reading cr_number seeded by brainstorm');
  assertTrue(/\bcr_number\b|\bcrNumber\b/.test(md),
    'Expected cr_number or crNumber variable reference');
});

test('SKILL.md reads design_artifact_id from session-state (set by write-design T10)', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/\bdesign_artifact_id\b|\bdesignArtifactId\b/.test(md),
    'Expected design_artifact_id lookup so derived_from link can be created when write-design ran in the same session');
});

test('SKILL.md wraps ArtifactWriter call under ACP_SUPPRESS_AUTO_ARTIFACT=1', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/ACP_SUPPRESS_AUTO_ARTIFACT/.test(md),
    'Expected ACP_SUPPRESS_AUTO_ARTIFACT env guard reference');
});

test('SKILL.md tags metadata.source = "artifact-writer" as secondary guard', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/['"]artifact-writer['"]/.test(md),
    'Expected metadata.source="artifact-writer" secondary re-entry guard');
});

test('SKILL.md documents LinkManager.createLink with link_type = "derived_from"', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/LinkManager|link-manager/.test(md),
    'Expected LinkManager reference (class or module path)');
  assertTrue(/createLink\b|\.link\(/.test(md),
    'Expected createLink (or .link) method invocation');
  assertTrue(/['"]derived_from['"]/.test(md),
    'Expected derived_from as the link_type value (plan → design edge)');
});

test('SKILL.md stores plan_artifact_id in session-state for plan-loader.js (T12)', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/\bplan_artifact_id\b|\bplanArtifactId\b/.test(md),
    'Expected plan_artifact_id to be stored in session-state so plan-loader.js can stamp units on insert');
  assertTrue(/setState\(\s*['"]plan_artifact_id['"]|session.*plan_artifact_id/i.test(md),
    'Expected an explicit setState (or equivalent) call writing plan_artifact_id back into session-state');
});

test('ArtifactWriter post-save step appears after Step 11 (Save plan) and before Step 12 (Commit plan)', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  const writerIdx = md.search(/ArtifactWriter/);
  // Match the Save plan step (Step 11 in the Checklist — supports "11." or "11 —" or "11a")
  const savePlanIdx = md.search(/\b11\.\s*\*\*Save plan\*\*|Step\s*11\b.*Save\s*plan|Save\s*plan\s*[—-]/i);
  // Match the Commit plan step (Step 12)
  const commitPlanIdx = md.search(/\b12\.\s*\*\*Commit plan\*\*|Step\s*12\b.*Commit\s*plan|Commit\s*plan\s*[—-]/i);
  assertTrue(writerIdx !== -1, 'ArtifactWriter reference not found');
  assertTrue(savePlanIdx !== -1, 'Step 11 "Save plan" heading not found');
  assertTrue(commitPlanIdx !== -1, 'Step 12 "Commit plan" heading not found');
  assertTrue(writerIdx > savePlanIdx,
    'ArtifactWriter block must appear AFTER Step 11 (Save plan) — the artifact row is created against a file that already exists on disk');
  assertTrue(writerIdx < commitPlanIdx,
    'ArtifactWriter block must appear BEFORE Step 12 (Commit plan) — the DB row and the git commit belong to the same logical unit-of-work');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
