/**
 * Test: stats-builder.js (G1)
 *
 * TDD tests written BEFORE implementation — all 4 must fail initially.
 */

const path = require('path');
const fs = require('fs');

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

// Lazy require — fails cleanly if module doesn't exist yet
let buildStats;
try {
  ({ buildStats } = require('../lib/stats-builder'));
} catch (e) {
  console.error(`${colors.red}Module not found: ../lib/stats-builder${colors.reset}`);
  process.exit(1);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

(async () => {

  await testAsync('buildStats() returns object with required top-level keys', async () => {
    const stats = await buildStats();
    assertTrue(typeof stats === 'object', 'stats should be an object');
    assertTrue(typeof stats.version === 'string', `version should be string, got ${typeof stats.version}`);
    assertTrue(typeof stats.generated_at === 'string', 'generated_at should be string');
    assertTrue(typeof stats.totals === 'object', 'totals should be an object');
    assertTrue(typeof stats.totals.agents === 'number', 'totals.agents should be a number');
    assertTrue(typeof stats.totals.skills === 'number', 'totals.skills should be a number');
    assertTrue(typeof stats.totals.hooks === 'number', 'totals.hooks should be a number');
    assertTrue(typeof stats.agents_by_pack === 'object', 'agents_by_pack should be an object');
  });

  await testAsync('totals.agents matches actual .aicodepath/agents/*.md count', async () => {
    const stats = await buildStats();
    const root = path.resolve(__dirname, '..', '..');
    const agentFiles = fs.readdirSync(path.join(root, '.aicodepath', 'agents'))
      .filter(f => f.endsWith('.md'));
    assertEqual(stats.totals.agents, agentFiles.length,
      `totals.agents should match actual agent file count`);
  });

  await testAsync('buildStats() writes .aicodepath/generated/agent-stats.json', async () => {
    const stats = await buildStats();
    const root = path.resolve(__dirname, '..', '..');
    const statsPath = path.join(root, '.aicodepath', 'generated', 'agent-stats.json');
    assertTrue(fs.existsSync(statsPath), `agent-stats.json should exist at ${statsPath}`);
    const written = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    assertEqual(written.totals.agents, stats.totals.agents, 'written file should match returned stats');
  });

  await testAsync('agents_by_pack values sum to total agent count', async () => {
    const stats = await buildStats();
    const packSum = Object.values(stats.agents_by_pack).reduce((acc, v) => acc + v, 0);
    assertEqual(packSum, stats.totals.agents,
      `agents_by_pack sum (${packSum}) should equal totals.agents (${stats.totals.agents})`);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
  process.exit(failed > 0 ? 1 : 0);

})();
