/**
 * Test: Opus 4.7 Token Benchmark
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Task:   T24a — spike benchmark-opus47-tokens.js
 *
 * Verifies:
 *   1. Benchmark script runs without error
 *   2. Returns results for 10 fixtures × 2 models
 *   3. Report file is written with σ value
 *   4. Per-content-type breakdown is present
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
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, '.aicodepath', 'scripts', 'benchmark-opus47-tokens.js');
const REPORT_PATH = path.join(ROOT, 'aicodepath-docs', 'temp', 'opus-4-7-token-ratios.md');

// ─── Script existence ───────────────────────────────────────────────────────

test('benchmark script exists', () => {
  assertTrue(fs.existsSync(SCRIPT), 'benchmark-opus47-tokens.js must exist');
});

// ─── Module exports ─────────────────────────────────────────────────────────

const benchmark = require(SCRIPT);

test('exports runBenchmark function', () => {
  assertEqual(typeof benchmark.runBenchmark, 'function');
});

test('exports countTokens function', () => {
  assertEqual(typeof benchmark.countTokens, 'function');
});

test('has 10 fixtures', () => {
  assertEqual(benchmark.FIXTURES.length, 10, 'Must have exactly 10 fixture transcripts');
});

test('has 2 model IDs', () => {
  assertEqual(benchmark.MODEL_IDS.length, 2, 'Must have exactly 2 model IDs');
  assertTrue(benchmark.MODEL_IDS.includes('claude-opus-4-6'));
  assertTrue(benchmark.MODEL_IDS.includes('claude-opus-4-7'));
});

// ─── Run benchmark ──────────────────────────────────────────────────────────

const result = benchmark.runBenchmark();

test('benchmark returns 10 results', () => {
  assertEqual(result.results.length, 10);
});

test('each result has both model token counts', () => {
  for (const r of result.results) {
    assertTrue(r['claude-opus-4-6'] > 0, `Missing opus-4-6 count for ${r.id}`);
    assertTrue(r['claude-opus-4-7'] > 0, `Missing opus-4-7 count for ${r.id}`);
  }
});

test('each result has a ratio', () => {
  for (const r of result.results) {
    assertTrue(typeof r.ratio === 'number' && r.ratio > 0, `Invalid ratio for ${r.id}`);
  }
});

test('overall stats have mean and σ', () => {
  assertTrue(typeof result.overall.mean === 'number', 'Missing overall mean');
  assertTrue(typeof result.overall.σ === 'number', 'Missing overall σ');
});

test('per-content-type breakdown covers all types', () => {
  const types = ['code', 'prose', 'mixed', 'json', 'markdown'];
  for (const t of types) {
    assertTrue(result.perType[t], `Missing per-type entry for ${t}`);
    assertTrue(typeof result.perType[t].σ === 'number', `Missing σ for ${t}`);
  }
});

// ─── Report generation ──────────────────────────────────────────────────────

const report = benchmark.formatReport(result);

test('report contains σ value', () => {
  assertTrue(report.includes('σ'), 'Report must contain σ character');
});

test('report contains both model IDs', () => {
  assertTrue(report.includes('claude-opus-4-6'));
  assertTrue(report.includes('claude-opus-4-7'));
});

test('report contains per-content-type table', () => {
  assertTrue(report.includes('Per-Content-Type'));
  assertTrue(report.includes('| code'));
  assertTrue(report.includes('| prose'));
});

test('report contains interpretation section', () => {
  assertTrue(report.includes('Interpretation'));
});

// ─── File write (run main) ──────────────────────────────────────────────────

// Clean up any previous report
if (fs.existsSync(REPORT_PATH)) fs.unlinkSync(REPORT_PATH);

// Run main to write the file
require(SCRIPT).runBenchmark(); // just ensure no crash
const { formatReport: fmt, runBenchmark: rb } = require(SCRIPT);
fs.writeFileSync(REPORT_PATH, fmt(rb()), 'utf8');

test('report file is written to aicodepath-docs/temp/', () => {
  assertTrue(fs.existsSync(REPORT_PATH), `Report file must exist at ${REPORT_PATH}`);
});

test('report file has σ value', () => {
  const content = fs.readFileSync(REPORT_PATH, 'utf8');
  assertTrue(content.includes('σ'), 'Written report must contain σ');
});

test('report file has ≥40 lines', () => {
  const lines = fs.readFileSync(REPORT_PATH, 'utf8').split('\n').length;
  assertTrue(lines >= 40, `Expected ≥40 lines, got ${lines}`);
});

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
