/**
 * Test: Pricing Calculator
 *
 * Tests cost calculation, model classification, version extraction,
 * and cost formatting.
 */

const {
  calculateCost, classifyModel, extractVersion, formatCost, MODEL_TIERS,
  classifyTaskComplexity, predictBudget, checkBudget, COMPLEXITY_BUDGETS,
  buildBudgetLine,
} = require('../lib/pricing-calculator');

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
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`);
  }
}

function assertAlmostEqual(actual, expected, tolerance = 0.0001, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\n  Expected ~${expected} (±${tolerance})\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

// ============================================================================
// calculateCost tests
// ============================================================================

test('calculates Opus 4.5 cost correctly (new tier)', () => {
  const cost = calculateCost(
    { inputTokens: 1_000_000, outputTokens: 500_000, cacheRead: 0, cacheWrite: 0 },
    'claude-opus-4-5-20250929'
  );
  // $5/M input + $25/M * 0.5M output = $5 + $12.50 = $17.50
  assertAlmostEqual(cost, 17.5, 0.0001, 'Opus 4.5 cost');
});

test('calculates Opus 3 cost correctly (old tier)', () => {
  const cost = calculateCost(
    { inputTokens: 1_000_000, outputTokens: 500_000 },
    'claude-3-opus-20240229'
  );
  // $15/M input + $75/M * 0.5M output = $15 + $37.50 = $52.50
  assertAlmostEqual(cost, 52.5, 0.0001, 'Opus 3 cost');
});

test('calculates Sonnet cost correctly', () => {
  const cost = calculateCost(
    { inputTokens: 1_000_000, outputTokens: 1_000_000 },
    'claude-sonnet-4-5-20250929'
  );
  // $3/M input + $15/M output = $18.00
  assertAlmostEqual(cost, 18.0, 0.0001, 'Sonnet cost');
});

test('calculates Haiku 3.5 cost correctly', () => {
  const cost = calculateCost(
    { inputTokens: 1_000_000, outputTokens: 1_000_000 },
    'claude-3-5-haiku-20241022'
  );
  // $0.80/M input + $4/M output = $4.80
  assertAlmostEqual(cost, 4.8, 0.0001, 'Haiku 3.5 cost');
});

test('calculates cache read cost correctly (10% of input rate)', () => {
  const cost = calculateCost(
    { inputTokens: 0, outputTokens: 0, cacheRead: 1_000_000 },
    'claude-sonnet-4-5-20250929'
  );
  // $3/M * 0.10 = $0.30
  assertAlmostEqual(cost, 0.30, 0.0001, 'Cache read cost');
});

test('calculates cache write cost correctly (125% of input rate)', () => {
  const cost = calculateCost(
    { inputTokens: 0, outputTokens: 0, cacheWrite: 1_000_000 },
    'claude-sonnet-4-5-20250929'
  );
  // $3/M * 1.25 = $3.75
  assertAlmostEqual(cost, 3.75, 0.0001, 'Cache write cost');
});

test('uses default tier for unknown model', () => {
  const cost = calculateCost(
    { inputTokens: 1_000_000, outputTokens: 0 },
    'unknown-model-xyz'
  );
  // Default = Sonnet: $3/M input
  assertAlmostEqual(cost, 3.0, 0.0001, 'Unknown model cost');
});

test('returns 0 for empty usage', () => {
  const cost = calculateCost({}, 'claude-sonnet-4-5-20250929');
  assertEqual(cost, 0, 'Zero usage cost');
});

// ============================================================================
// extractVersion tests
// ============================================================================

test('extracts version from new format model ID (claude-opus-4-6-...)', () => {
  const { major, minor } = extractVersion('claude-opus-4-6-20260101', 'opus');
  assertEqual(major, 4, 'New format major version');
  assertEqual(minor, 6, 'New format minor version');
});

test('extracts version from old format model ID (claude-3-5-sonnet-...)', () => {
  const { major, minor } = extractVersion('claude-3-5-sonnet-20241022', 'sonnet');
  assertEqual(major, 3, 'Old format major version');
  assertEqual(minor, 5, 'Old format minor version');
});

test('returns {0,0} for unknown model ID without version', () => {
  const { major, minor } = extractVersion('completely-unknown', 'opus');
  assertEqual(major, 0, 'Unknown major');
  assertEqual(minor, 0, 'Unknown minor');
});

// ============================================================================
// formatCost tests
// ============================================================================

test('formats small cost as cents when cents option is true', () => {
  const formatted = formatCost(0.005, { cents: true });
  assertEqual(formatted, '1¢', 'Small cost in cents');
});

test('formats larger cost as dollars with 4 decimal places (< $1)', () => {
  const formatted = formatCost(0.0345);
  assertEqual(formatted, '$0.0345', 'Cost < $1 in dollars');
});

test('formats cost >= $1 with 2 decimal places', () => {
  const formatted = formatCost(12.3456);
  assertEqual(formatted, '$12.35', 'Cost >= $1 in dollars');
});

// ============================================================================
// classifyModel tests
// ============================================================================

test('classifies null/undefined model as default tier', () => {
  const tier = classifyModel(null);
  assertEqual(tier.input, MODEL_TIERS.default.input, 'Null model tier input');
});

test('classifies Haiku 4.5+ as haiku_new tier', () => {
  const tier = classifyModel('claude-haiku-4-5-20260101');
  assertEqual(tier.input, MODEL_TIERS.haiku_new.input, 'Haiku 4.5 tier input');
});

// ============================================================================
// classifyTaskComplexity tests
// ============================================================================

test('whitespace description → trivial (signal in trivial, not in earlier tiers)', () => {
  assertEqual(classifyTaskComplexity('whitespace'), 'trivial');
});

test('format the file → trivial (signal "format")', () => {
  assertEqual(classifyTaskComplexity('format the config file'), 'trivial');
});

test('rename the variable → simple (signal "rename")', () => {
  assertEqual(classifyTaskComplexity('rename the variable'), 'simple');
});

test('fix the null bug → simple (signal "fix")', () => {
  assertEqual(classifyTaskComplexity('fix the null pointer bug'), 'simple');
});

test('add endpoint for user profile → moderate (signal "add endpoint")', () => {
  assertEqual(classifyTaskComplexity('add endpoint for user profile'), 'moderate');
});

test('add route for payments → moderate (signal "add route")', () => {
  assertEqual(classifyTaskComplexity('add route for payments'), 'moderate');
});

test('implement oauth authentication → complex (signal "implement")', () => {
  assertEqual(classifyTaskComplexity('implement oauth authentication'), 'complex');
});

test('design the caching layer → complex (signal "design")', () => {
  assertEqual(classifyTaskComplexity('design the caching layer'), 'complex');
});

test('migrate entire database → very_complex (signal "migrate")', () => {
  assertEqual(classifyTaskComplexity('migrate entire database'), 'very_complex');
});

test('refactor all auth modules → very_complex (signal "refactor all")', () => {
  assertEqual(classifyTaskComplexity('refactor all auth modules'), 'very_complex');
});

test('empty string → trivial (length heuristic, 0 words)', () => {
  assertEqual(classifyTaskComplexity(''), 'trivial');
});

test('null → trivial (handles null gracefully)', () => {
  assertEqual(classifyTaskComplexity(null), 'trivial');
});

test('very long description with no signals → complex (> 40 words)', () => {
  // 41 unique words with no signals → falls through length heuristic to 'complex'
  const longDesc = 'foo bar baz qux alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega plus minus times divided equals above below left right center edge node leaf root';
  assertTrue(longDesc.split(/\s+/).length > 40, 'Test setup: should have > 40 words');
  assertEqual(classifyTaskComplexity(longDesc), 'complex');
});

// ============================================================================
// predictBudget tests
// ============================================================================

test('predictBudget returns correct structure fields', () => {
  const result = predictBudget('whitespace fix');
  assertTrue('complexity' in result, 'Should have complexity');
  assertTrue('outputTokens' in result, 'Should have outputTokens');
  assertTrue('estimatedCostUsd' in result, 'Should have estimatedCostUsd');
  assertTrue('budgetDescription' in result, 'Should have budgetDescription');
});

test('predictBudget trivial task uses 200 output tokens', () => {
  const result = predictBudget('format the config file');
  assertEqual(result.complexity, 'trivial');
  assertEqual(result.outputTokens, COMPLEXITY_BUDGETS.trivial.outputTokens);
});

test('predictBudget simple task uses 1000 output tokens', () => {
  const result = predictBudget('fix the null bug');
  assertEqual(result.complexity, 'simple');
  assertEqual(result.outputTokens, COMPLEXITY_BUDGETS.simple.outputTokens);
});

test('predictBudget complex task uses 6000 output tokens', () => {
  const result = predictBudget('implement oauth authentication');
  assertEqual(result.complexity, 'complex');
  assertEqual(result.outputTokens, COMPLEXITY_BUDGETS.complex.outputTokens);
});

test('predictBudget estimatedCostUsd is a non-negative number', () => {
  const result = predictBudget('fix bug', 'claude-sonnet-4-5-20250929');
  assertTrue(result.estimatedCostUsd >= 0, 'Cost should be non-negative');
});

test('predictBudget higher-tier model produces higher cost', () => {
  const opusCost = predictBudget('implement oauth', 'claude-opus-4-5-20250929').estimatedCostUsd;
  const haikuCost = predictBudget('implement oauth', 'claude-haiku-4-5-20260101').estimatedCostUsd;
  assertTrue(opusCost > haikuCost, `Opus (${opusCost}) should cost more than Haiku (${haikuCost})`);
});

// ============================================================================
// checkBudget tests
// ============================================================================

test('checkBudget: 40% used → On track (ratio < 0.5), overBudget false', () => {
  // trivial budget = 200 tokens; 80 actual = 40% (< 0.5 threshold)
  const result = checkBudget(80, 'trivial');
  assertFalse(result.overBudget, 'Should not be over budget');
  assertTrue(result.message.includes('On track'), `Expected "On track", got: ${result.message}`);
});

test('checkBudget: 75% used → Progressing (0.5 ≤ ratio < 0.8)', () => {
  // trivial = 200 tokens; 150 = 75%
  const result = checkBudget(150, 'trivial');
  assertFalse(result.overBudget);
  assertTrue(result.message.includes('Progressing'), `Expected "Progressing", got: ${result.message}`);
});

test('checkBudget: 95% used → Approaching budget', () => {
  // trivial = 200 tokens; 190 = 95%
  const result = checkBudget(190, 'trivial');
  assertFalse(result.overBudget);
  assertTrue(result.message.includes('Approaching'), `Expected "Approaching", got: ${result.message}`);
});

test('checkBudget: 105% used → Over budget, overBudget true', () => {
  // trivial = 200 tokens; 210 = 105%
  const result = checkBudget(210, 'trivial');
  assertTrue(result.overBudget, 'Should be over budget');
  assertTrue(result.message.includes('Over budget'), `Expected "Over budget", got: ${result.message}`);
});

test('checkBudget: 200% used → Well over budget', () => {
  // trivial = 200; 400 = 200%
  const result = checkBudget(400, 'trivial');
  assertTrue(result.overBudget);
  assertTrue(result.message.includes('Well over'), `Expected "Well over budget", got: ${result.message}`);
});

test('checkBudget: ratio is rounded to 2 decimal places', () => {
  const result = checkBudget(100, 'trivial'); // 100/200 = 0.5
  assertEqual(result.ratio, 0.5, 'Ratio should be 0.5');
});

test('checkBudget: unknown complexity defaults to moderate (2500 tokens)', () => {
  // 1000 actual / 2500 moderate = 0.4 → On track
  const result = checkBudget(1000, 'does_not_exist');
  assertFalse(result.overBudget, 'Unknown complexity should default to moderate budget');
});

// ============================================================================
// buildBudgetLine tests
// ============================================================================

test('buildBudgetLine returns 💰 line with complexity and token count', () => {
  const line = buildBudgetLine('simple', 'claude-sonnet-4-5-20250929');
  assertTrue(line.includes('💰'), 'Should include budget emoji');
  assertTrue(line.includes('simple'), 'Should include complexity name');
  assertTrue(line.includes('1,000') || line.includes('1000'), 'Should include token count for simple (1000)');
});

test('buildBudgetLine includes cost estimate', () => {
  const line = buildBudgetLine('trivial', 'claude-sonnet-4-5-20250929');
  assertTrue(line.includes('$'), 'Should include dollar sign for cost');
});

test('buildBudgetLine defaults unknown complexity to moderate', () => {
  const line = buildBudgetLine('unknown_tier', 'claude-sonnet-4-5-20250929');
  assertTrue(line.includes('💰'), 'Should still return budget line for unknown tier');
  assertTrue(line.length > 0, 'Should not return empty string');
});

test('buildBudgetLine works with no modelId (uses default tier)', () => {
  const line = buildBudgetLine('trivial');
  assertTrue(line.includes('💰'), 'Should return budget line without modelId');
  assertTrue(line.includes('trivial'), 'Should include complexity');
});

// ============================================================================
// Summary
// ============================================================================

function assertFalse(v, msg = '') { if (v) throw new Error(msg || `Expected falsy, got ${v}`); }

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
