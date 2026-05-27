#!/usr/bin/env node
/**
 * Tests for effort-scorer.js
 *
 * Covers: all 5 scoring factors, threshold behavior, effort levels,
 * shouldHighEffort detection, buildEffortGuidance, and summary formatting.
 */

const {
  calculateEffort,
  buildEffortGuidance,
  EFFORT_THRESHOLD,
  CRITICAL_DIRS,
  COMPLEXITY_KEYWORDS,
  EFFORT_LEVELS,
  HIGH_EFFORT_MARKER,
} = require('../lib/effort-scorer');

let passed = 0;
let failed = 0;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(message || 'Expected true');
}

function assertFalse(condition, message) {
  if (condition) throw new Error(message || 'Expected false');
}

console.log(`\n${colors.bold}Effort Scorer Tests${colors.reset}\n`);

// =====================================================================
// Defaults — empty context
// =====================================================================

test('empty context → score 0, level low', () => {
  const result = calculateEffort();
  assertEqual(result.score, 0);
  assertEqual(result.level, 'low');
  assertEqual(result.symbol, '○');
  assertFalse(result.shouldHighEffort, 'Should not recommend high effort at score 0');
});

test('empty context → factors is empty object', () => {
  const result = calculateEffort();
  assertEqual(Object.keys(result.factors).length, 0, 'No factors for empty context');
});

test('empty context → summary indicates no complexity factors', () => {
  const result = calculateEffort();
  assertTrue(result.summary.includes('low'), 'Summary should mention low level');
});

// =====================================================================
// Factor 1: File count ≥4 (+1)
// =====================================================================

test('Factor 1: 3 files → NO file count bonus', () => {
  const result = calculateEffort({ files: ['a.js', 'b.js', 'c.js'] });
  assertFalse('fileCount' in result.factors, '3 files should not trigger +1');
  assertEqual(result.score, 0);
});

test('Factor 1: 4 files → +1 file count bonus', () => {
  const result = calculateEffort({ files: ['a.js', 'b.js', 'c.js', 'd.js'] });
  assertTrue('fileCount' in result.factors, '4 files should trigger +1');
  assertEqual(result.score, 1);
});

test('Factor 1: 10 files → +1 (not more)', () => {
  const files = Array.from({ length: 10 }, (_, i) => `file${i}.js`);
  const result = calculateEffort({ files });
  assertEqual(result.score, 1, 'File count factor is always +1, not +N');
});

// =====================================================================
// Factor 2: Critical directories (+1)
// =====================================================================

test('Factor 2: file in hooks/ dir → +1', () => {
  const result = calculateEffort({ files: ['src/hooks/my-hook.js'] });
  assertTrue('criticalDir' in result.factors, 'hooks/ should trigger +1');
  assertEqual(result.score, 1);
});

test('Factor 2: file in lib/ dir → +1', () => {
  const result = calculateEffort({ files: ['.aicodepath/lib/my-lib.js'] });
  assertTrue('criticalDir' in result.factors, 'lib/ should trigger +1');
});

test('Factor 2: regular source file → no critical dir bonus', () => {
  const result = calculateEffort({ files: ['src/components/Button.tsx'] });
  assertFalse('criticalDir' in result.factors, 'Regular file should not trigger critical dir');
});

test('Factor 2: all CRITICAL_DIRS are recognized', () => {
  for (const dir of CRITICAL_DIRS) {
    const result = calculateEffort({ files: [`${dir}some-file.js`] });
    assertTrue('criticalDir' in result.factors, `${dir} should be recognized as critical`);
  }
});

// =====================================================================
// Factor 3: Complexity keywords (+1)
// =====================================================================

test('Factor 3: "architecture" in description → +1', () => {
  const result = calculateEffort({ taskDescription: 'Redesign the architecture of the auth system' });
  assertTrue('keywords' in result.factors, 'architecture keyword should trigger +1');
  assertEqual(result.score, 1);
});

test('Factor 3: "security" in description → +1', () => {
  const result = calculateEffort({ taskDescription: 'Fix security vulnerability in session handling' });
  assertTrue('keywords' in result.factors, 'security keyword should trigger +1');
});

test('Factor 3: keyword matching is case-insensitive', () => {
  const result = calculateEffort({ taskDescription: 'MIGRATION from v1 to v2 schema' });
  assertTrue('keywords' in result.factors, 'Uppercase keyword should still match');
});

test('Factor 3: no keywords in description → no bonus', () => {
  const result = calculateEffort({ taskDescription: 'Add a button to the navbar' });
  assertFalse('keywords' in result.factors, 'No keyword should give no bonus');
  assertEqual(result.score, 0);
});

test('Factor 3: all COMPLEXITY_KEYWORDS are recognized', () => {
  for (const keyword of COMPLEXITY_KEYWORDS) {
    const result = calculateEffort({ taskDescription: `Task involves ${keyword} work` });
    assertTrue('keywords' in result.factors, `"${keyword}" should trigger keyword factor`);
  }
});

// =====================================================================
// Factor 4: Failure history (+2)
// =====================================================================

test('Factor 4: hasFailureHistory=false → no bonus', () => {
  const result = calculateEffort({ hasFailureHistory: false });
  assertFalse('failureHistory' in result.factors, 'No failure history should give no bonus');
});

test('Factor 4: hasFailureHistory=true → +2', () => {
  const result = calculateEffort({ hasFailureHistory: true });
  assertTrue('failureHistory' in result.factors, 'Failure history should trigger +2');
  assertEqual(result.score, 2);
});

test('Factor 4: failure history alone reaches medium level (score 2)', () => {
  const result = calculateEffort({ hasFailureHistory: true });
  assertEqual(result.level, 'medium', 'Score 2 should be medium level');
  assertEqual(result.symbol, '◐');
});

test('Factor 4: failure history alone does NOT trigger high effort (score 2 < 3)', () => {
  const result = calculateEffort({ hasFailureHistory: true });
  assertFalse(result.shouldHighEffort, 'Score 2 should not trigger high effort');
});

// =====================================================================
// Factor 5: Explicit [high-effort] marker (+3)
// =====================================================================

test('Factor 5: explicitHigh=true → +3', () => {
  const result = calculateEffort({ explicitHigh: true });
  assertTrue('explicit' in result.factors, 'explicitHigh should trigger +3');
  assertEqual(result.score, 3);
  assertTrue(result.shouldHighEffort, 'Score 3 should trigger high effort');
});

test('Factor 5: [high-effort] in taskDescription → +3', () => {
  const result = calculateEffort({ taskDescription: 'Refactor DB schema [high-effort]' });
  assertTrue('explicit' in result.factors, '[high-effort] marker should trigger +3');
  assertEqual(result.score, 4, 'keyword(+1) + explicit(+3) = 4');
});

test('Factor 5: [HIGH-EFFORT] uppercase in description → +3 (case-insensitive)', () => {
  const result = calculateEffort({ taskDescription: 'Critical fix [HIGH-EFFORT]' });
  assertTrue('explicit' in result.factors, 'Uppercase [HIGH-EFFORT] should trigger +3');
});

test('Factor 5: [ultrathink] legacy alias still triggers +3', () => {
  const result = calculateEffort({ taskDescription: 'Critical migration [ultrathink]' });
  assertTrue('explicit' in result.factors, '[ultrathink] legacy alias should still work');
  assertEqual(result.score, 4, 'keyword(+1) + explicit(+3) = 4');
});

// =====================================================================
// Score accumulation and threshold
// =====================================================================

test('Score accumulation: all 5 factors → score 8', () => {
  const result = calculateEffort({
    files: ['a.js', 'b.js', 'c.js', 'd.js', 'hooks/e.js'], // +1 (count) +1 (critical dir)
    taskDescription: 'security architecture refactor [high-effort]', // +1 (keyword) +3 (explicit)
    hasFailureHistory: true, // +2
  });
  // +1 +1 +1 +3 +2 = 8
  assertEqual(result.score, 8);
  assertEqual(result.level, 'high');
  assertTrue(result.shouldHighEffort, 'Max score should recommend high effort');
});

test('Threshold: score exactly 3 → high level + shouldHighEffort', () => {
  const result = calculateEffort({ explicitHigh: true }); // +3
  assertEqual(result.score, EFFORT_THRESHOLD);
  assertEqual(result.level, 'high');
  assertTrue(result.shouldHighEffort);
});

test('Threshold: score 2 → medium level, no high effort', () => {
  const result = calculateEffort({ hasFailureHistory: true }); // +2
  assertEqual(result.level, 'medium');
  assertFalse(result.shouldHighEffort);
});

test('Threshold: score 1 → medium level', () => {
  const result = calculateEffort({ files: ['a.js', 'b.js', 'c.js', 'd.js'] }); // +1
  assertEqual(result.level, 'medium');
});

test('Threshold: score 0 → low level', () => {
  const result = calculateEffort({});
  assertEqual(result.level, 'low');
  assertEqual(result.symbol, '○');
});

// =====================================================================
// EFFORT_THRESHOLD constant
// =====================================================================

test('EFFORT_THRESHOLD is 3', () => {
  assertEqual(EFFORT_THRESHOLD, 3, 'Threshold must be 3');
});

// =====================================================================
// Result shape
// =====================================================================

test('calculateEffort returns all required fields', () => {
  const result = calculateEffort({ taskDescription: 'add feature' });
  assertTrue('score' in result, 'result.score required');
  assertTrue('level' in result, 'result.level required');
  assertTrue('symbol' in result, 'result.symbol required');
  assertTrue('factors' in result, 'result.factors required');
  assertTrue('shouldHighEffort' in result, 'result.shouldHighEffort required');
  assertTrue('threshold' in result, 'result.threshold required');
  assertTrue('summary' in result, 'result.summary required');
});

test('result.threshold equals EFFORT_THRESHOLD', () => {
  const result = calculateEffort();
  assertEqual(result.threshold, EFFORT_THRESHOLD);
});

test('result.summary contains level and score', () => {
  const result = calculateEffort({ hasFailureHistory: true });
  assertTrue(result.summary.includes('medium') || result.summary.includes('2'), 'Summary should reference level or score');
});

test('result.summary for high effort mentions factors', () => {
  const result = calculateEffort({ explicitHigh: true });
  assertTrue(result.summary.length > 20, 'High effort summary should have detail');
});

// =====================================================================
// buildEffortGuidance
// =====================================================================

test('buildEffortGuidance(high) returns non-empty string', () => {
  const guidance = buildEffortGuidance('high', 4);
  assertTrue(typeof guidance === 'string', 'Guidance must be string');
  assertTrue(guidance.length > 0, 'High effort guidance must be non-empty');
});

test('buildEffortGuidance(high) mentions effortLevel setting', () => {
  const guidance = buildEffortGuidance('high');
  assertTrue(guidance.includes('effortLevel') || guidance.includes('effort'), 'High guidance should mention effort setting');
});

test('buildEffortGuidance(medium) returns non-empty string', () => {
  const guidance = buildEffortGuidance('medium');
  assertTrue(typeof guidance === 'string', 'Guidance must be string');
  assertTrue(guidance.length > 0, 'Medium effort guidance must be non-empty');
});

test('buildEffortGuidance(low) returns empty string', () => {
  const guidance = buildEffortGuidance('low');
  assertEqual(guidance, '', 'Low effort guidance should be empty string');
});

test('buildEffortGuidance(high) includes score when provided', () => {
  const guidance = buildEffortGuidance('high', 5);
  assertTrue(guidance.includes('5'), 'Guidance should include the provided score');
});

// =====================================================================
// HIGH_EFFORT_MARKER export
// =====================================================================

test('HIGH_EFFORT_MARKER matches [high-effort]', () => {
  assertTrue(HIGH_EFFORT_MARKER.test('[high-effort]'), '[high-effort] should match');
});

test('HIGH_EFFORT_MARKER matches [ultrathink] legacy alias', () => {
  assertTrue(HIGH_EFFORT_MARKER.test('[ultrathink]'), '[ultrathink] should match as legacy alias');
});

test('HIGH_EFFORT_MARKER is case-insensitive', () => {
  assertTrue(HIGH_EFFORT_MARKER.test('[HIGH-EFFORT]'), 'Pattern should be case-insensitive');
  assertTrue(HIGH_EFFORT_MARKER.test('[ULTRATHINK]'), 'Pattern should be case-insensitive');
});

// =====================================================================
// EFFORT_LEVELS export
// =====================================================================

test('EFFORT_LEVELS exports low, medium, high', () => {
  assertTrue('low' in EFFORT_LEVELS, 'low level should be exported');
  assertTrue('medium' in EFFORT_LEVELS, 'medium level should be exported');
  assertTrue('high' in EFFORT_LEVELS, 'high level should be exported');
});

test('EFFORT_LEVELS high threshold matches EFFORT_THRESHOLD', () => {
  assertEqual(EFFORT_LEVELS.high.min, EFFORT_THRESHOLD, 'High level min should match threshold');
});

test('EFFORT_LEVELS symbols are correct', () => {
  assertEqual(EFFORT_LEVELS.low.symbol, '○');
  assertEqual(EFFORT_LEVELS.medium.symbol, '◐');
  assertEqual(EFFORT_LEVELS.high.symbol, '●');
});

// Summary
console.log(`\n${colors.bold}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
