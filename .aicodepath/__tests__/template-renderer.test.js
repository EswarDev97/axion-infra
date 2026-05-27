/**
 * Test: template-renderer.js (G2)
 *
 * TDD tests written BEFORE implementation — all 4 must fail initially.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
async function testAsync(name, fn) {
  try { await fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${v}`); }
async function assertThrowsAsync(fn, msgSubstring) {
  try { await fn(); throw new Error('Expected function to throw, but it did not'); }
  catch (e) {
    if (e.message === 'Expected function to throw, but it did not') throw e;
    if (msgSubstring && !e.message.includes(msgSubstring)) {
      throw new Error(`Expected error to include "${msgSubstring}", got: "${e.message}"`);
    }
  }
}

// Lazy require — fails cleanly if module doesn't exist yet
let renderTemplate, renderTemplates;
try {
  ({ renderTemplate, renderTemplates } = require('../lib/template-renderer'));
} catch (e) {
  console.error(`${colors.red}Module not found: ../lib/template-renderer${colors.reset}`);
  process.exit(1);
}

// ── Fixture stats object ───────────────────────────────────────────────────────

const FIXTURE_STATS = {
  version: '2.99.0',
  totals: { agents: 999, skills: 888, hooks: 77 },
};

(async () => {

  // ── Test 1: known placeholders substitute correctly ─────────────────────────

  await testAsync('known placeholders substitute correctly from fixture stats', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-tpl-test-'));
    const tplPath = path.join(tmpDir, 'CLAUDE.md.tpl');
    const outPath = path.join(tmpDir, 'CLAUDE.md');

    fs.writeFileSync(tplPath, '# AICodePath\n\nAgents: {{AGENT_COUNT}}\nSkills: {{SKILL_COUNT}}\nHooks: {{HOOK_COUNT}}\nVersion: {{VERSION}}\n');

    await renderTemplate(tplPath, outPath, FIXTURE_STATS);

    const output = fs.readFileSync(outPath, 'utf8');
    assertTrue(output.includes('999'), `output should contain 999 (agent count), got:\n${output}`);
    assertTrue(output.includes('888'), `output should contain 888 (skill count), got:\n${output}`);
    assertTrue(output.includes('77'), `output should contain 77 (hook count), got:\n${output}`);
    assertTrue(output.includes('2.99.0'), `output should contain version 2.99.0, got:\n${output}`);

    fs.rmSync(tmpDir, { recursive: true });
  });

  // ── Test 2: unknown placeholder throws ────────────────────────────────────

  await testAsync('unknown placeholder {{FOO}} throws with clear error', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-tpl-test-'));
    const tplPath = path.join(tmpDir, 'bad.md.tpl');
    const outPath = path.join(tmpDir, 'bad.md');

    fs.writeFileSync(tplPath, 'Some content with {{FOO}} unknown placeholder.\n');

    await assertThrowsAsync(
      () => renderTemplate(tplPath, outPath, FIXTURE_STATS),
      'FOO'
    );

    fs.rmSync(tmpDir, { recursive: true });
  });

  // ── Test 3: generated file has DO NOT EDIT banner ─────────────────────────

  await testAsync('generated file has "DO NOT EDIT" banner prepended', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-tpl-test-'));
    const tplPath = path.join(tmpDir, 'CLAUDE.md.tpl');
    const outPath = path.join(tmpDir, 'CLAUDE.md');

    fs.writeFileSync(tplPath, '# AICodePath — {{AGENT_COUNT}} agents\n');

    await renderTemplate(tplPath, outPath, FIXTURE_STATS);

    const output = fs.readFileSync(outPath, 'utf8');
    assertTrue(output.includes('DO NOT EDIT'), `output should start with DO NOT EDIT banner, got:\n${output.slice(0, 200)}`);

    fs.rmSync(tmpDir, { recursive: true });
  });

  // ── Test 4: missing template file throws readable error ───────────────────

  await testAsync('missing template file throws readable error', async () => {
    await assertThrowsAsync(
      () => renderTemplate('/does/not/exist.md.tpl', '/tmp/out.md', FIXTURE_STATS),
      'not/exist.md.tpl'
    );
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
  process.exit(failed > 0 ? 1 : 0);

})();
