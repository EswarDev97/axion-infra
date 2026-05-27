/**
 * Test: GICL Score Calculator
 *
 * Tests weighted scoring, complexity detection, and continue/stop logic.
 * Pure-logic module - no DB or filesystem dependencies.
 */

const path = require('path');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

// ============================================================================
// Import module under test
// ============================================================================

const {
  calculateWeightedScore,
  detectComplexity,
  shouldContinue,
  getScoreGrade,
  DEFAULT_WEIGHTS,
  GRADES,
} = require('../lib/gicl-score-calculator');

// ============================================================================
// calculateWeightedScore tests
// ============================================================================

console.log('\n--- calculateWeightedScore ---');

test('perfect score with all 100s', () => {
  const score = calculateWeightedScore({
    tests: 100,
    guidelines: 100,
    architecture: 100,
    duplication: 100,
    authenticity: 100,
  });
  assertEqual(score, 100, 'All 100s should produce 100');
});

test('zero score with all 0s', () => {
  const score = calculateWeightedScore({
    tests: 0,
    guidelines: 0,
    architecture: 0,
    duplication: 0,
    authenticity: 0,
  });
  assertEqual(score, 0, 'All 0s should produce 0');
});

test('null components default to 100', () => {
  const score = calculateWeightedScore({});
  assertEqual(score, 100, 'Empty components should default all to 100');
});

test('partial components fill missing with 100', () => {
  const score = calculateWeightedScore({ tests: 0 });
  // tests=0 (35%), rest=100 (65%)
  assertEqual(score, 65, 'Only tests=0 should produce 65');
});

test('weighted calculation is correct', () => {
  const score = calculateWeightedScore({
    tests: 80,       // 80 * 0.35 = 28
    guidelines: 70,  // 70 * 0.20 = 14
    architecture: 90,// 90 * 0.15 = 13.5
    duplication: 60, // 60 * 0.20 = 12
    authenticity: 100,// 100 * 0.10 = 10
  });
  // 28 + 14 + 13.5 + 12 + 10 = 77.5
  assertEqual(score, 77.5, 'Weighted score should be 77.5');
});

test('values are clamped to 0-100', () => {
  const score = calculateWeightedScore({
    tests: 150,
    guidelines: -20,
  });
  // tests=100 * 0.35 = 35, guidelines=0 * 0.20 = 0, rest=100
  // 35 + 0 + 15 + 20 + 10 = 80
  assertEqual(score, 80, 'Values should be clamped');
});

test('custom weights are used', () => {
  const score = calculateWeightedScore(
    { tests: 100, guidelines: 0 },
    { tests: 0.5, guidelines: 0.5 }
  );
  assertEqual(score, 50, 'Custom weights should apply');
});

// ============================================================================
// detectComplexity tests
// ============================================================================

console.log('\n--- detectComplexity ---');

test('empty content is trivial', () => {
  const result = detectComplexity('');
  assertEqual(result.complexity, 'trivial');
  assertEqual(result.loc, 0);
  assertEqual(result.maxIterations, 3);
});

test('null content is trivial', () => {
  const result = detectComplexity(null);
  assertEqual(result.complexity, 'trivial');
});

test('small file is trivial', () => {
  const content = 'const x = 1;\nconst y = 2;\n';
  const result = detectComplexity(content);
  assertEqual(result.complexity, 'trivial');
  assertTrue(result.loc <= 30, 'LOC should be small');
});

test('moderate file detected correctly', () => {
  // Generate ~150 lines with ~8 functions
  const lines = [];
  for (let idx = 0; idx < 8; idx++) {
    lines.push(`function handler${idx}(req, res) {`);
    for (let jdx = 0; jdx < 15; jdx++) {
      lines.push(`  const val${jdx} = process(req.body);`);
    }
    lines.push('}');
    lines.push('');
  }
  const result = detectComplexity(lines.join('\n'));
  assertTrue(
    result.complexity === 'moderate' || result.complexity === 'simple',
    `Expected moderate or simple, got ${result.complexity}`
  );
});

test('comments and blanks are excluded from LOC', () => {
  const content = [
    '// this is a comment',
    '/* block comment */',
    '* middle of block',
    '',
    '  ',
    '# python comment',
    'const real = 1;',
    'const also = 2;',
  ].join('\n');
  const result = detectComplexity(content);
  assertEqual(result.loc, 2, 'Only real code lines should count');
});

// ============================================================================
// shouldContinue tests
// ============================================================================

console.log('\n--- shouldContinue ---');

test('stops when score >= 90', () => {
  const result = shouldContinue(
    { current_iteration: 2, maxIterations: 7 },
    92,
    [80, 85]
  );
  assertEqual(result.shouldContinue, false);
  assertEqual(result.reason, 'quality_gate_passed');
});

test('stops at max iterations', () => {
  const result = shouldContinue(
    { current_iteration: 7, maxIterations: 7 },
    85,
    [80, 82, 84]
  );
  assertEqual(result.shouldContinue, false);
  assertEqual(result.reason, 'max_iterations_reached');
});

test('stops on score regression > 10 points', () => {
  const result = shouldContinue(
    { current_iteration: 3, maxIterations: 7 },
    60,
    [75, 80]
  );
  assertEqual(result.shouldContinue, false);
  assertEqual(result.reason, 'score_regression');
});

test('continues when score drops <= 10 points', () => {
  const result = shouldContinue(
    { current_iteration: 3, maxIterations: 7 },
    72,
    [75, 80]
  );
  assertEqual(result.shouldContinue, true);
  assertEqual(result.reason, null);
});

test('stops when stalled for 3 iterations', () => {
  const result = shouldContinue(
    { current_iteration: 4, maxIterations: 7 },
    75,
    [74, 75, 76]
  );
  assertEqual(result.shouldContinue, false);
  assertEqual(result.reason, 'score_stalled');
});

test('continues with empty previous scores', () => {
  const result = shouldContinue(
    { current_iteration: 1, maxIterations: 7 },
    50,
    []
  );
  assertEqual(result.shouldContinue, true);
  assertEqual(result.reason, null);
});

test('continues normally when improving', () => {
  const result = shouldContinue(
    { current_iteration: 3, maxIterations: 7 },
    80,
    [60, 70]
  );
  assertEqual(result.shouldContinue, true);
  assertEqual(result.reason, null);
});

// ============================================================================
// getScoreGrade tests
// ============================================================================

console.log('\n--- getScoreGrade ---');

test('95 is PASS', () => {
  assertEqual(getScoreGrade(95).key, 'PASS');
});

test('90 is PASS', () => {
  assertEqual(getScoreGrade(90).key, 'PASS');
});

test('80 is ACCEPTABLE', () => {
  assertEqual(getScoreGrade(80).key, 'ACCEPTABLE');
});

test('60 is NEEDS_WORK', () => {
  assertEqual(getScoreGrade(60).key, 'NEEDS_WORK');
});

test('30 is FAIL', () => {
  assertEqual(getScoreGrade(30).key, 'FAIL');
});

test('0 is FAIL', () => {
  assertEqual(getScoreGrade(0).key, 'FAIL');
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${colors.green}Passed: ${passed}${colors.reset}`);
if (failed > 0) {
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  process.exit(1);
} else {
  console.log('All tests passed!');
}
