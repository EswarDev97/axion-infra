/**
 * Test: /aicodepath-write-design wires ArtifactWriter post-write
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 3 Task 10
 * Design: aicodepath-docs/design/2026-04-18-opus-4-7-alignment-design.md DEC-3/DEC-5
 * Agent:  aicodepath-backend-architect
 *
 * TDD RED — must fail BEFORE write-design/SKILL.md is edited.
 *
 * Asserts the SKILL.md prose contract for the post-write ArtifactWriter step:
 *   - file exists at .aicodepath/skills/aicodepath-write-design/SKILL.md
 *   - documents invoking ArtifactWriter.createArtifact (or ArtifactWriter.create)
 *   - documents artifact_type = 'design'
 *   - documents phase = 'inception' and stage = 'design'
 *   - references reading cr_number from session-state (seeded by brainstorm in T8)
 *   - wraps the call under ACP_SUPPRESS_AUTO_ARTIFACT=1 to prevent hook re-entry
 *   - tags metadata.source = 'artifact-writer' as secondary re-entry guard (per T2)
 *   - step appears AFTER the file-write (Step 3 Conflict Check Then Write)
 *     and BEFORE the commit step.
 *
 * An end-to-end fixture that asserts the actual DB row
 *   `SELECT artifact_type FROM artifacts WHERE cr_number=?` == 'design'
 * is the concern of T34 acceptance (integration of T8+T10 flowing together) —
 * T10 itself establishes the skill-level contract.
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
const SKILL = path.join(ROOT, '.aicodepath', 'skills', 'aicodepath-write-design', 'SKILL.md');

test('write-design SKILL.md exists', () => {
  assertTrue(fs.existsSync(SKILL), `SKILL.md missing at ${SKILL}`);
});

test('SKILL.md documents ArtifactWriter invocation', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/ArtifactWriter/.test(md),
    'Expected ArtifactWriter reference (class name) in SKILL.md');
  assertTrue(/createArtifact\b|\.create\(/.test(md),
    'Expected createArtifact or .create( method invocation documented');
});

test('SKILL.md documents artifact_type = "design"', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/artifact_type\s*[:=]\s*['"]design['"]|type\s*[:=]\s*['"]design['"]|['"]design['"]/.test(md),
    'Expected artifact_type="design" (or similar) to be documented');
});

test('SKILL.md documents phase = "inception" and stage = "design"', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/phase\s*[:=]\s*['"]inception['"]/.test(md),
    'Expected phase="inception"');
  assertTrue(/stage\s*[:=]\s*['"]design['"]/.test(md),
    'Expected stage="design"');
});

test('SKILL.md reads cr_number from session-state', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/session-state/i.test(md),
    'Expected session-state reference for reading cr_number seeded by brainstorm');
  assertTrue(/\bcr_number\b|\bcrNumber\b/.test(md),
    'Expected cr_number or crNumber variable reference');
});

test('SKILL.md wraps ArtifactWriter call under ACP_SUPPRESS_AUTO_ARTIFACT=1', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/ACP_SUPPRESS_AUTO_ARTIFACT/.test(md),
    'Expected ACP_SUPPRESS_AUTO_ARTIFACT env guard reference');
});

test('SKILL.md tags metadata.source = "artifact-writer" as secondary guard', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  assertTrue(/['"]artifact-writer['"]|source['"]?\s*[:=]\s*['"]artifact-writer['"]/.test(md),
    'Expected metadata.source="artifact-writer" secondary re-entry guard');
});

test('ArtifactWriter post-write step appears after Step 3 write and before Step 4 commit', () => {
  const md = fs.readFileSync(SKILL, 'utf8');
  const writerIdx = md.search(/ArtifactWriter/);
  const step3Idx = md.search(/Step\s*3\s*[—-]\s*Conflict Check Then Write|Step\s*3\s*[—-].*Write/);
  const step4Idx = md.search(/###?\s*Step\s*4\s*[—-]\s*Commit|Step\s*4.*Commit/);
  assertTrue(writerIdx !== -1, 'ArtifactWriter reference not found');
  assertTrue(step3Idx !== -1, 'Step 3 heading not found');
  assertTrue(step4Idx !== -1, 'Step 4 Commit heading not found');
  assertTrue(writerIdx > step3Idx,
    'ArtifactWriter invocation must be documented AFTER Step 3 (file write)');
  assertTrue(writerIdx < step4Idx,
    'ArtifactWriter invocation must be documented BEFORE Step 4 (git commit) so the artifact row is created in the same logical unit-of-work');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
