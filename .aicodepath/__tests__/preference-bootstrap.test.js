/**
 * Test: Init bootstraps preferences/project-preferences.json
 * RED phase — init.js does not yet create this file.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }

// ── Helper: bootstrap function (extracted from init.js for testability) ───────

const { bootstrapPreferencesFile } = require('../commands/init');

// ── Setup: temp dir ───────────────────────────────────────────────────────────

function makeTempProject(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `acp-test-${name}-`));
  // aicodepath-docs/ is the runtime artifacts directory — no pre-creation needed; bootstrapPreferencesFile creates it
  return dir;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('creates preferences file with v2.0 schema when file does not exist', () => {
  const projectRoot = makeTempProject('bootstrap-create');
  bootstrapPreferencesFile(projectRoot, 'test-repo');

  const prefsPath = path.join(projectRoot, 'aicodepath-docs', 'preferences', 'project-preferences.json');
  assertTrue(fs.existsSync(prefsPath), 'preferences file should exist after bootstrap');

  const content = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  assertEqual(content.version, '2.0', 'version should be 2.0');
  assertEqual(content.repo, 'test-repo', 'repo should match provided name');
  assertTrue(Array.isArray(content.rules), 'rules should be an array');
  assertEqual(content.rules.length, 0, 'rules should be empty on init');
  assertTrue(typeof content.created_at === 'string', 'created_at should be set');
  assertTrue(typeof content.updated_at === 'string', 'updated_at should be set');
});

test('does not overwrite existing preferences file (idempotent)', () => {
  const projectRoot = makeTempProject('bootstrap-idempotent');
  const prefsPath = path.join(projectRoot, 'aicodepath-docs', 'preferences', 'project-preferences.json');

  // First call — creates file
  bootstrapPreferencesFile(projectRoot, 'test-repo');
  const firstContent = fs.readFileSync(prefsPath, 'utf8');

  // Second call — should skip
  bootstrapPreferencesFile(projectRoot, 'test-repo');
  const secondContent = fs.readFileSync(prefsPath, 'utf8');

  assertEqual(firstContent, secondContent, 'file content should be identical after second bootstrap call');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
process.exit(failed > 0 ? 1 : 0);
