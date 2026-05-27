/**
 * Test: Provider Detection
 *
 * Tests the provider-detector module which identifies whether Claude Code
 * is running against the Anthropic API or a third-party provider (e.g. z.ai).
 *
 * These tests are intentionally FAILING until provider-detector.js is implemented.
 */

const path = require('path');

// provider-detector.js does not exist yet — require will throw MODULE_NOT_FOUND
// The try/catch lets all 7 tests run and fail with a clear message rather
// than crashing the process before the test runner starts.
let detectProvider, normalizeStatuslineData;
let loadError = null;
try {
  const mod = require('../lib/provider-detector');
  detectProvider = mod.detectProvider;
  normalizeStatuslineData = mod.normalizeStatuslineData;
} catch (e) {
  loadError = e;
}

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`${msg ? msg + '\n  ' : ''}Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg) { if (!v) throw new Error(msg || `Expected truthy, got ${v}`); }
function assertNull(v, msg) { if (v !== null) throw new Error(msg || `Expected null, got ${JSON.stringify(v)}`); }
function assertNotNull(v, msg) { if (v === null || v === undefined) throw new Error(msg || `Expected non-null value, got ${JSON.stringify(v)}`); }

// Helper: throws if the module failed to load so each test reports a clear failure
function requireLoaded(fnName) {
  if (loadError) throw new Error(`provider-detector.js not found (MODULE_NOT_FOUND): ${loadError.message}`);
  if (typeof fnName === 'string') return; // just a load-check call
}

// Load fixture files once
const zaiFixture = require('./fixtures/statusline/test-zai.json');
const anthropicFixture = require('./fixtures/statusline/test-anthropic.json');

// ── detectProvider ────────────────────────────────────────────────────────────

test('Test 1: glm-4.7 model name → detects z.ai provider', () => {
  requireLoaded();
  const result = detectProvider({ model: { name: 'glm-4.7' } });
  assertEqual(result.name, 'z.ai', 'provider name should be z.ai for glm-4.7');
});

test('Test 2: glm-5.1 model name → detects z.ai provider', () => {
  requireLoaded();
  const result = detectProvider({ model: { name: 'glm-5.1' } });
  assertEqual(result.name, 'z.ai', 'provider name should be z.ai for glm-5.1');
});

test('Test 3: ANTHROPIC_BASE_URL containing z.ai → detects z.ai (no model.name)', () => {
  requireLoaded();
  const savedUrl = process.env.ANTHROPIC_BASE_URL;
  process.env.ANTHROPIC_BASE_URL = 'https://api.z.ai/v1';
  try {
    const result = detectProvider({});
    assertEqual(result.name, 'z.ai', 'provider name should be z.ai when ANTHROPIC_BASE_URL contains z.ai');
  } finally {
    if (savedUrl === undefined) delete process.env.ANTHROPIC_BASE_URL;
    else process.env.ANTHROPIC_BASE_URL = savedUrl;
  }
});

test('Test 4: claude-sonnet-4-6 model name → detects anthropic provider', () => {
  requireLoaded();
  const result = detectProvider({ model: { name: 'claude-sonnet-4-6' } });
  assertEqual(result.name, 'anthropic', 'provider name should be anthropic for claude-sonnet-4-6');
});

// ── normalizeStatuslineData ───────────────────────────────────────────────────

test('Test 5: z.ai normalize → rate_limits.five_hour is null', () => {
  requireLoaded();
  const result = normalizeStatuslineData(zaiFixture);
  assertNull(result.rate_limits.five_hour, 'z.ai rate_limits.five_hour should be null (not available)');
});

test('Test 6: z.ai normalize → cost_usd is null', () => {
  requireLoaded();
  const result = normalizeStatuslineData(zaiFixture);
  assertNull(result.cost_usd, 'z.ai cost_usd should be null (not available)');
});

test('Test 7: Anthropic normalize → rate_limits.five_hour is a number (not null)', () => {
  requireLoaded();
  const result = normalizeStatuslineData(anthropicFixture);
  assertNotNull(result.rate_limits.five_hour, 'Anthropic rate_limits.five_hour should not be null');
  assertTrue(typeof result.rate_limits.five_hour === 'number', `rate_limits.five_hour should be a number, got ${typeof result.rate_limits.five_hour}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
