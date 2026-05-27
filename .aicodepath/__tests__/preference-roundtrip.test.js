/**
 * Test: Preference round-trip — learned rule write, toggle, and v1→v2 migration.
 */

'use strict';

const { validatePreferenceFile, migrateV1toV2 } = require('../lib/preference-validator');

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

// ── Test 1: learned rule write passes validation ───────────────────────────────

test('v2.0 file with source:learned rule passes validatePreferenceFile', () => {
  const file = {
    version: '2.0',
    repo: 'my-project',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
    rules: [{
      id: 'no-console-log',
      source: 'learned',
      title: 'No console.log in production code',
      rule: 'Never use console.log; use logger from lib/logger.js',
      applies_to: '02.backend/',
      category: 'backend',
      severity: 'warning',
      confidence: 0.85,
      enabled: false,
      expires_when: null,
      source_note: 'Observed 3 times in GICL session 2026-03-22',
      created_at: '2026-03-22T00:00:00Z',
      updated_at: '2026-03-22T00:00:00Z',
    }],
    signalHistory: [],
    statistics: { totalRules: 1, totalSignals: 0, sessionsAnalyzed: 0, lastSessionId: null },
  };

  const result = validatePreferenceFile(file);
  assertEqual(result.valid, true, 'learned rule should pass validation');
  assertEqual(result.errors.length, 0, 'no errors expected');
});

// ── Test 2: toggle flips enabled and updates updated_at ───────────────────────

test('toggling enabled flips the value and updated_at changes', () => {
  const originalUpdatedAt = '2026-03-22T00:00:00Z';
  const rule = {
    id: 'test-toggle',
    source: 'learned',
    title: 'Toggle test rule',
    rule: 'Test.',
    applies_to: '*',
    category: 'workflow',
    severity: 'info',
    confidence: 0.80,
    enabled: false,
    expires_when: null,
    source_note: 'Test source',
    created_at: originalUpdatedAt,
    updated_at: originalUpdatedAt,
  };

  // Simulate toggle
  const newUpdatedAt = new Date().toISOString();
  const toggled = { ...rule, enabled: !rule.enabled, updated_at: newUpdatedAt };

  assertEqual(toggled.enabled, true, 'enabled should flip from false to true');
  assertTrue(toggled.updated_at !== originalUpdatedAt, 'updated_at should change after toggle');
});

// ── Test 3: migrateV1toV2 converts preferences[] to rules[] ───────────────────

test('migrateV1toV2 converts v1.0 preferences to v2.0 rules', () => {
  const v1 = {
    version: '1.0',
    preferences: [
      {
        id: 'no-hardcoded-lookups',
        title: 'No hardcoded lookups',
        rule: 'Always fetch from API.',
        applies_to: '04.web/web-portal/',
        confidence: 0.95,
        source: 'Explicit rejection in session 2026-03-18.',
      },
      {
        id: 'validate-before-fix',
        title: 'Validate before fix',
        rule: 'Always validate assumption before writing fix.',
        applies_to: '02.backend/',
        confidence: 0.73,
        source: 'User redirected twice in session 2026-03-19.',
      },
    ],
  };

  const v2 = migrateV1toV2(v1);

  assertEqual(v2.version, '2.0', 'version should be 2.0');
  assertEqual(v2.rules.length, 2, 'should have 2 rules');

  const lookup = v2.rules.find(r => r.id === 'no-hardcoded-lookups');
  assertTrue(!!lookup, 'rule should be present');
  assertEqual(lookup.source, 'manual', 'source should be manual');
  assertEqual(lookup.category, 'frontend', 'category inferred from 04.web/ prefix');
  assertEqual(lookup.severity, 'error', 'severity error for confidence 0.95');
  assertEqual(lookup.enabled, true, 'enabled should be true');
  assertEqual(lookup.expires_when, null, 'expires_when should be null');
  assertEqual(lookup.created_at, '2026-03-18T00:00:00Z', 'created_at parsed from source note');

  const validateFix = v2.rules.find(r => r.id === 'validate-before-fix');
  assertEqual(validateFix.severity, 'info', 'severity info for confidence 0.73');
  assertEqual(validateFix.category, 'backend', 'category inferred from 02.backend/ prefix');
  assertEqual(validateFix.created_at, '2026-03-19T00:00:00Z', 'created_at parsed from session 2026-03-19');
});

test('migrateV1toV2 excludes write-plan-persist-agent-recommendations', () => {
  const v1 = {
    version: '1.0',
    preferences: [
      { id: 'keep-this', title: 'Keep', rule: 'K', applies_to: '*', confidence: 0.9, source: 'session 2026-03-22' },
      { id: 'write-plan-persist-agent-recommendations', title: 'Framework rule', rule: 'F', applies_to: '.aicodepath/', confidence: 0.92, source: 'session 2026-03-22' },
    ],
  };

  const v2 = migrateV1toV2(v1);
  assertEqual(v2.rules.length, 1, 'framework rule should be excluded');
  assertEqual(v2.rules[0].id, 'keep-this', 'remaining rule should be keep-this');
});

test('migrateV1toV2 sets expires_when for known workaround rule', () => {
  const v1 = {
    version: '1.0',
    preferences: [
      { id: 'extract-pure-utils-for-testability', title: 'Workaround', rule: 'W', applies_to: '04.web/web-portal/', confidence: 0.75, source: 'session 2026-03-19' },
    ],
  };

  const v2 = migrateV1toV2(v1);
  assertTrue(v2.rules[0].expires_when !== null, 'expires_when should be set for known workaround');
  assertTrue(v2.rules[0].expires_when.includes('Jest'), 'expires_when should reference Jest/Babel');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}`);
process.exit(failed > 0 ? 1 : 0);
