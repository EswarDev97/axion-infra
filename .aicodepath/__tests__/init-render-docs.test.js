/**
 * Test: acp init --render-docs integration (G4)
 *
 * TDD tests written BEFORE implementation — all 4 must fail initially.
 * Tests the stats-builder + template-renderer integration called by init.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

async function testAsync(name, fn) {
  try { await fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }

const ROOT = path.resolve(__dirname, '..', '..');

// Lazy require — will fail until G4 is implemented
let buildStats, renderTemplates;
try {
  ({ buildStats } = require('../lib/stats-builder'));
  ({ renderTemplates } = require('../lib/template-renderer'));
} catch (e) {
  console.error(`${colors.red}Module not found: ${e.message}${colors.reset}`);
  process.exit(1);
}

(async () => {

  // ── Test 1: rendered CLAUDE.md contains live agent count ──────────────────

  await testAsync('acp init --render-docs: rendered CLAUDE.md contains live agent count', async () => {
    // Build stats from real filesystem
    const stats = await buildStats({ projectRoot: ROOT });
    assertTrue(stats.totals.agents > 0, `Expected agents > 0, got ${stats.totals.agents}`);

    // Render into a temp directory to avoid polluting the worktree
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-g4-'));
    const tplSrc = path.join(ROOT, '.aicodepath', 'CLAUDE.md.tpl');
    const outFile = path.join(tmpDir, 'CLAUDE.md');

    // Verify template exists before trying to render
    assertTrue(fs.existsSync(tplSrc), `Template not found: ${tplSrc}`);

    await renderTemplates(stats, { tplRoot: ROOT, outDir: tmpDir, templates: [
      { tpl: tplSrc, out: outFile }
    ]});

    const content = fs.readFileSync(outFile, 'utf8');
    assertTrue(content.includes(String(stats.totals.agents)),
      `Expected agent count ${stats.totals.agents} in rendered CLAUDE.md`);
    assertTrue(!content.includes('{{AGENT_COUNT}}'),
      'Rendered file must not contain raw {{AGENT_COUNT}} placeholder');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Test 2: rendered output is byte-identical on second run (idempotent) ───

  await testAsync('acp init --render-docs: second render is byte-identical (idempotent)', async () => {
    const stats = await buildStats({ projectRoot: ROOT });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-g4-'));
    const tplSrc = path.join(ROOT, '.aicodepath', 'CLAUDE.md.tpl');
    const outFile = path.join(tmpDir, 'CLAUDE.md');

    const renderOpts = { tplRoot: ROOT, outDir: tmpDir, templates: [
      { tpl: tplSrc, out: outFile }
    ]};

    await renderTemplates(stats, renderOpts);
    const first = fs.readFileSync(outFile, 'utf8');

    await renderTemplates(stats, renderOpts);
    const second = fs.readFileSync(outFile, 'utf8');

    assertEqual(first, second, 'Second render must be byte-identical to first');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Test 3: init.js exports renderDocs function ────────────────────────────

  await testAsync('init.js exports renderDocs() function callable directly', async () => {
    let initMod;
    try {
      initMod = require('../commands/init');
    } catch (e) {
      throw new Error(`Cannot require ../commands/init: ${e.message}`);
    }

    assertTrue(typeof initMod.renderDocs === 'function',
      `Expected initMod.renderDocs to be a function, got ${typeof initMod.renderDocs}`);
  });

  // ── Test 4: --no-render-docs flag skips template rendering ─────────────────

  await testAsync('--no-render-docs flag causes renderDocs to return skipped=true', async () => {
    let renderDocs;
    try {
      ({ renderDocs } = require('../commands/init'));
    } catch (e) {
      throw new Error(`Cannot require renderDocs from ../commands/init: ${e.message}`);
    }

    const result = await renderDocs({ noRenderDocs: true, projectRoot: ROOT });
    assertTrue(result.skipped === true,
      `Expected result.skipped=true when --no-render-docs passed, got: ${JSON.stringify(result)}`);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
  process.exit(failed > 0 ? 1 : 0);

})();
