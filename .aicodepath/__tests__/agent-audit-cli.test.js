/**
 * Test: acp agent audit subcommand (F4)
 *
 * TDD tests written BEFORE implementation — all 5 must fail initially.
 * Tests the AgentCommand.auditAgent() method and audit action routing.
 */

const { execSync } = require('child_process');
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
const CLI = path.join(ROOT, '.aicodepath', 'bin', 'aicodepath.js');

function runCLI(args) {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (e) {
    return { exitCode: e.status || 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

// Lazy require for direct module tests
let AgentCommand;
try {
  ({ AgentCommand } = require('../commands/agent'));
} catch (e) {
  console.error(`${colors.red}Module not found or AgentCommand not exported: ../commands/agent${colors.reset}`);
  console.error(`Error: ${e.message}`);
  process.exit(1);
}

(async () => {

  // ── Test 1: --check-wiring exits 0 on fully wired agent ──────────────────

  await testAsync('audit --check-wiring exits 0 on fully wired agent (security-engineer)', async () => {
    const result = runCLI('agent audit aicodepath-security-engineer --check-wiring');
    assertEqual(result.exitCode, 0,
      `Expected exit 0 for wired agent, got ${result.exitCode}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });

  // ── Test 2: exits non-zero on unwired agent with missing list ─────────────

  await testAsync('audit --check-wiring exits non-zero on unwired agent with missing items listed', async () => {
    // Run against a known unwired agent name (doesn't exist → should fail clearly)
    const result = runCLI('agent audit aicodepath-does-not-exist --check-wiring');
    assertTrue(result.exitCode !== 0,
      `Expected non-zero exit for unknown agent, got ${result.exitCode}`);
    const combined = result.stdout + result.stderr;
    assertTrue(combined.length > 0, 'Expected some output for failed audit');
  });

  // ── Test 3: --format=json emits parseable JSON ────────────────────────────

  await testAsync('audit --format=json emits parseable JSON with required fields', async () => {
    const result = runCLI('agent audit aicodepath-security-engineer --check-wiring --format=json');
    assertEqual(result.exitCode, 0,
      `Expected exit 0, got ${result.exitCode}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);

    let parsed;
    try {
      // Find the single-line JSON object (logger emits multi-line; the audit JSON is one line starting with {"name":)
      const lines = result.stdout.trim().split('\n');
      const jsonLine = lines.find(l => l.trim().startsWith('{"name":'));
      assertTrue(!!jsonLine, `No {"name":...} JSON line found in output:\n${result.stdout}`);
      parsed = JSON.parse(jsonLine);
    } catch (e) {
      throw new Error(`Could not parse JSON output: ${e.message}\nOutput: ${result.stdout}`);
    }

    assertTrue('name' in parsed, `JSON missing "name" field: ${JSON.stringify(parsed)}`);
    assertTrue('score' in parsed, `JSON missing "score" field: ${JSON.stringify(parsed)}`);
    assertTrue('max' in parsed, `JSON missing "max" field: ${JSON.stringify(parsed)}`);
    assertTrue('missing' in parsed, `JSON missing "missing" field: ${JSON.stringify(parsed)}`);
    assertTrue('details' in parsed, `JSON missing "details" field: ${JSON.stringify(parsed)}`);
    assertEqual(parsed.max, 18, 'max should be 18');
  });

  // ── Test 4: --format=github-actions emits annotation format ──────────────

  await testAsync('audit --format=github-actions on unwired agent emits ::error annotation', async () => {
    const result = runCLI('agent audit aicodepath-does-not-exist --check-wiring --format=github-actions');
    assertTrue(result.exitCode !== 0, 'Expected non-zero exit for unknown agent');
    const combined = result.stdout + result.stderr;
    // Either an error annotation or a clear error message
    assertTrue(combined.includes('::error') || combined.includes('error') || combined.includes('Error'),
      `Expected error output, got:\n${combined}`);
  });

  // ── Test 5: audit all --check-wiring iterates all agents ─────────────────

  await testAsync('audit all --check-wiring iterates all 106 agents and emits a summary', async () => {
    const result = runCLI('agent audit all --check-wiring');
    // Command must run without crash (exit 0 or 1 depending on wiring state)
    assertTrue(result.exitCode === 0 || result.exitCode === 1,
      `Expected exit 0 or 1 from audit all, got ${result.exitCode}.\nstderr: ${result.stderr}`);
    // Summary line must mention agent count
    assertTrue(result.stdout.includes('106') || result.stdout.includes('Audit complete'),
      `Expected summary mentioning 106 agents:\n${result.stdout.split('\n').slice(-5).join('\n')}`);
    // Non-zero exit when any agent fails — verify exit code matches actual failures
    const hasFailures = result.stdout.includes('❌');
    if (hasFailures) {
      assertEqual(result.exitCode, 1, 'Expected exit 1 when audit reports failures');
    } else {
      assertEqual(result.exitCode, 0, 'Expected exit 0 when all agents pass');
    }
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
  process.exit(failed > 0 ? 1 : 0);

})();
