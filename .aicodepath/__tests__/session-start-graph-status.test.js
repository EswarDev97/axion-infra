/**
 * Tests for readGraphStatus() in session-start-hook.js
 *
 * Verifies the three cases:
 *  1. flag file missing   → warning message
 *  2. flag file stale >7d → stale message
 *  3. flag file fresh     → empty string
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { readGraphStatus } = require('../hooks/session-start-hook');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (e) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`);
  }
}

function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssh-test-'));
  return dir;
}

function writeFlag(projectRoot, indexedAt) {
  const stateDir = path.join(projectRoot, 'aicodepath-docs', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    path.join(stateDir, 'graph-indexed.json'),
    JSON.stringify({ entities: 5, relations: 10, indexed_at: indexedAt }, null, 2),
  );
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('flag missing → returns warning string', () => {
  const root = makeTempRoot();
  try {
    const result = readGraphStatus(root);
    assertTrue(result.length > 0, 'Should return non-empty warning');
    assertTrue(result.includes('not built') || result.includes('build_or_update_graph'),
      'Warning should mention build_or_update_graph');
  } finally {
    cleanup(root);
  }
});

test('flag stale (>7 days) → returns stale message', () => {
  const root = makeTempRoot();
  try {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    writeFlag(root, eightDaysAgo);
    const result = readGraphStatus(root);
    assertTrue(result.length > 0, 'Should return non-empty stale warning');
    assertTrue(result.includes('stale') || result.includes('day'),
      'Warning should mention staleness');
  } finally {
    cleanup(root);
  }
});

test('flag fresh (<7 days) → returns empty string', () => {
  const root = makeTempRoot();
  try {
    writeFlag(root, new Date().toISOString());
    const result = readGraphStatus(root);
    assertEqual(result, '', 'Fresh flag should return empty string');
  } finally {
    cleanup(root);
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
