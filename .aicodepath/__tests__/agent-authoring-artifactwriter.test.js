/**
 * Test: agent-authoring.md documents ArtifactWriter + recursion guard
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 4 Task 18
 * Agent:  aicodepath-technical-writer
 *
 * TDD RED — must fail BEFORE docs are added.
 *
 * Contract:
 *   - docs/developer/agent-authoring.md exists
 *   - Contains an ArtifactWriter section
 *   - Documents ACP_SUPPRESS_AUTO_ARTIFACT=1 env guard
 *   - Documents metadata.source = 'artifact-writer' tag
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
const DOCS = path.join(ROOT, '.aicodepath', 'docs', 'developer', 'agent-authoring.md');

test('agent-authoring.md exists', () => {
  assertTrue(fs.existsSync(DOCS), `agent-authoring.md missing at ${DOCS}`);
});

test('agent-authoring.md documents ArtifactWriter usage', () => {
  const md = fs.readFileSync(DOCS, 'utf8');
  assertTrue(/ArtifactWriter/i.test(md),
    'Expected ArtifactWriter reference in agent-authoring.md');
});

test('agent-authoring.md documents ACP_SUPPRESS_AUTO_ARTIFACT env guard', () => {
  const md = fs.readFileSync(DOCS, 'utf8');
  assertTrue(/ACP_SUPPRESS_AUTO_ARTIFACT/.test(md),
    'Expected ACP_SUPPRESS_AUTO_ARTIFACT env var documented as recursion guard');
});

test('agent-authoring.md documents metadata.source = artifact-writer tag', () => {
  const md = fs.readFileSync(DOCS, 'utf8');
  assertTrue(/artifact-writer/.test(md),
    'Expected metadata.source="artifact-writer" secondary guard documented');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
