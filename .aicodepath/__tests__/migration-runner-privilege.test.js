/**
 * Test: Migration runner privilege audit (Phase 0)
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan: Batch 1 Task 3
 * Agent: aicodepath-security-engineer
 *
 * TDD RED — must fail before the least-privilege posture is documented.
 *
 * SQLite has no GRANT / role-based privilege model. The "least-privilege"
 * posture for the migration runner boils down to:
 *   1. PRAGMA foreign_keys=ON (so FK constraints actually enforce)
 *   2. BEGIN IMMEDIATE / COMMIT around each migration apply (so a
 *      partial migration rolls back cleanly instead of corrupting state)
 *   3. A committed audit report documenting the above in aicodepath-docs/
 *
 * Discovery note: the task spec names `.aicodepath/lib/db-init.js`, but
 * the actual primary migration runner in this codebase is
 * `.aicodepath/commands/init-db.js`. This test targets the real file; the
 * privilege report documents the discrepancy.
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
const RUNNER = path.join(ROOT, '.aicodepath', 'commands', 'init-db.js');
const REPORT = path.join(ROOT, 'aicodepath-docs', 'temp', 'phase0-privilege-report.md');

function countMatches(filePath, pattern) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  const re = new RegExp(pattern, 'g');
  const matches = content.match(re);
  return matches ? matches.length : 0;
}

test('migration runner exists at commands/init-db.js', () => {
  assertTrue(fs.existsSync(RUNNER), `Runner missing at ${RUNNER}`);
});

test('migration runner references PRAGMA foreign_keys at least once', () => {
  const n = countMatches(RUNNER, 'PRAGMA\\s+foreign_keys|foreign_keys\\s*=\\s*ON|foreign_keys\\s*=\\s*on');
  assertTrue(n >= 1, `Expected ≥1 foreign_keys pragma reference in ${RUNNER}, found ${n}`);
});

test('migration runner wraps applies in BEGIN IMMEDIATE transactions', () => {
  const n = countMatches(RUNNER, 'BEGIN\\s+IMMEDIATE');
  assertTrue(n >= 1, `Expected ≥1 "BEGIN IMMEDIATE" in ${RUNNER}, found ${n}. ` +
    `Without an explicit IMMEDIATE transaction wrapping each migration, a partial failure ` +
    `mid-migration can leave the DB in an inconsistent state.`);
});

test('phase0 privilege report exists with a Verdict section', () => {
  assertTrue(fs.existsSync(REPORT), `Expected privilege report at ${REPORT}`);
  const body = fs.readFileSync(REPORT, 'utf8');
  assertTrue(/^##\s+Verdict\b/m.test(body), 'Report must contain a "## Verdict" section');
  assertTrue(/LEAST-PRIVILEGE POSTURE:\s*(VERIFIED|NEEDS-FOLLOWUP)/.test(body),
    'Report must state "LEAST-PRIVILEGE POSTURE: VERIFIED" or "NEEDS-FOLLOWUP"');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
