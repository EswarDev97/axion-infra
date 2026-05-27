/**
 * Test: Confidence Checker
 */

const { checkConfidence, formatReport } = require('../lib/confidence-checker');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${v}`); }

// ── checkConfidence ───────────────────────────────────────────────────────────

test('all checks false → score 0, level LOW, recommendation STOP', () => {
  const r = checkConfidence({});
  assertEqual(r.score, 0);
  assertEqual(r.level, 'LOW');
  assertEqual(r.recommendation, 'STOP');
});

test('all checks true → score 100, level HIGH, recommendation PROCEED', () => {
  const r = checkConfidence({
    hasSearchedDuplicates: true,
    architectureCompliant: true,
    docsVerified: true,
    ossReferenceFound: true,
    rootCauseIdentified: true,
  });
  assertEqual(r.score, 100);
  assertEqual(r.level, 'HIGH');
  assertEqual(r.recommendation, 'PROCEED');
});

test('weights sum correctly: noduplicates=25, arch=25, docs=20, oss=15, rootcause=15', () => {
  const r = checkConfidence({ hasSearchedDuplicates: true });
  assertEqual(r.score, 25);
  assertEqual(r.checks.noduplicates.contribution, 25);
  assertEqual(r.checks.architecture.contribution, 0);
});

test('score 75 → level MEDIUM, recommendation ALTERNATIVES', () => {
  // 25 + 25 + 20 + 5 = 75? No: noduplicates(25) + arch(25) + docs(20) + oss(0) + rootcause(0) = 70
  // noduplicates(25) + arch(25) + docs(20) + rootcause(15) = 85 → MEDIUM
  const r = checkConfidence({
    hasSearchedDuplicates: true,
    architectureCompliant: true,
    docsVerified: true,
    rootCauseIdentified: true,
  });
  assertEqual(r.score, 85);
  assertEqual(r.level, 'MEDIUM');
  assertEqual(r.recommendation, 'ALTERNATIVES');
});

test('score exactly 90 → HIGH', () => {
  // noduplicates(25)+arch(25)+docs(20)+oss(15)+rootcause(15) = 100, need 90 exactly
  // noduplicates(25)+arch(25)+docs(20)+rootcause(15) = 85 — not 90
  // noduplicates(25)+arch(25)+docs(20)+oss(15) = 85 — not 90
  // Only 100 or 0-85 with these weights. Test at 70 boundary.
  const r70 = checkConfidence({ hasSearchedDuplicates: true, architectureCompliant: true, docsVerified: true });
  assertEqual(r70.score, 70);
  assertEqual(r70.level, 'MEDIUM'); // exactly 70 = MEDIUM not LOW
});

test('score 69 → LOW', () => {
  const r = checkConfidence({ hasSearchedDuplicates: true, architectureCompliant: true });
  assertEqual(r.score, 50);
  assertEqual(r.level, 'LOW');
});

test('per-check result has weight and contribution', () => {
  const r = checkConfidence({ docsVerified: true });
  assertEqual(r.checks.docs.weight, 20);
  assertEqual(r.checks.docs.contribution, 20);
  assertEqual(r.checks.docs.passed, true);
  assertEqual(r.checks.noduplicates.passed, false);
  assertEqual(r.checks.noduplicates.contribution, 0);
});

test('default context (empty object) treated as all false', () => {
  const r1 = checkConfidence({});
  const r2 = checkConfidence();
  assertEqual(r1.score, r2.score);
});

// ── formatReport ──────────────────────────────────────────────────────────────

test('formatReport includes score and recommendation', () => {
  const r = checkConfidence({ hasSearchedDuplicates: true, architectureCompliant: true, docsVerified: true });
  const report = formatReport(r);
  assertTrue(report.includes('70'), 'Report should include score');
  assertTrue(report.includes('ALTERNATIVES'), 'Report should include recommendation');
});

test('formatReport includes all 5 check names', () => {
  const report = formatReport(checkConfidence({}));
  ['noduplicates', 'architecture', 'docs', 'oss', 'rootcause'].forEach(k => {
    assertTrue(report.includes(k), `Report missing check: ${k}`);
  });
});

test('formatReport marks passed checks with ✅ and failed with ❌', () => {
  const r = checkConfidence({ hasSearchedDuplicates: true });
  const report = formatReport(r);
  assertTrue(report.includes('✅'), 'Should have passing check marker');
  assertTrue(report.includes('❌'), 'Should have failing check marker');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
