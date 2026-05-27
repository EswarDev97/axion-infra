/**
 * Test: Preference Schema Validator (v2.0)
 * RED phase — preference-validator.js does not exist yet.
 * Expected: all tests fail with "Cannot find module" on require.
 */

const { validatePreferenceFile } = require('../lib/preference-validator');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function validRule(overrides = {}) {
  return {
    id: 'test-rule',
    source: 'manual',
    title: 'Test Rule',
    rule: 'Do the right thing.',
    applies_to: '02.backend/',
    category: 'backend',
    severity: 'error',
    confidence: 0.90,
    enabled: true,
    expires_when: null,
    source_note: 'Added in session 2026-03-22.',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    ...overrides
  };
}

function validFile(overrides = {}) {
  return {
    version: '2.0',
    repo: 'my-project',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    rules: [validRule()],
    signalHistory: [],
    statistics: { totalRules: 1, totalSignals: 0, sessionsAnalyzed: 0, lastSessionId: null },
    ...overrides
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('valid v2.0 file passes with valid: true and no errors', () => {
  const result = validatePreferenceFile(validFile());
  assertEqual(result.valid, true, 'valid should be true');
  assertEqual(result.errors.length, 0, 'errors should be empty');
});

test('missing file-level repo field returns valid: false', () => {
  const file = validFile();
  delete file.repo;
  const result = validatePreferenceFile(file);
  assertEqual(result.valid, false, 'valid should be false');
  assertTrue(result.errors.length > 0, 'errors should be non-empty');
});

test('missing rule id returns valid: false', () => {
  const result = validatePreferenceFile(validFile({ rules: [validRule({ id: undefined })] }));
  assertEqual(result.valid, false, 'valid should be false when rule id is missing');
  assertTrue(result.errors.length > 0, 'errors array should be non-empty');
});

test('missing rule source returns valid: false', () => {
  const result = validatePreferenceFile(validFile({ rules: [validRule({ source: undefined })] }));
  assertEqual(result.valid, false, 'valid should be false when rule source is missing');
  assertTrue(result.errors.length > 0, 'errors array should be non-empty');
});

test('missing rule severity returns valid: false', () => {
  const result = validatePreferenceFile(validFile({ rules: [validRule({ severity: undefined })] }));
  assertEqual(result.valid, false, 'valid should be false when rule severity is missing');
  assertTrue(result.errors.length > 0, 'errors array should be non-empty');
});

test('missing rule enabled returns valid: false', () => {
  const result = validatePreferenceFile(validFile({ rules: [validRule({ enabled: undefined })] }));
  assertEqual(result.valid, false, 'valid should be false when rule enabled is missing');
  assertTrue(result.errors.length > 0, 'errors array should be non-empty');
});

test('invalid source value "guess" returns valid: false', () => {
  const result = validatePreferenceFile(validFile({ rules: [validRule({ source: 'guess' })] }));
  assertEqual(result.valid, false, 'valid should be false for unknown source value');
  assertTrue(result.errors.length > 0, 'errors array should be non-empty');
});

test('expires_when: null is valid', () => {
  const result = validatePreferenceFile(validFile({ rules: [validRule({ expires_when: null })] }));
  assertEqual(result.valid, true, 'expires_when: null should be accepted');
  assertEqual(result.errors.length, 0, 'no errors for null expires_when');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
process.exit(failed > 0 ? 1 : 0);
