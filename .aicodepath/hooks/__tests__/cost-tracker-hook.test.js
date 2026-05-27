#!/usr/bin/env node
/**
 * Tests for cost-tracker-hook.js
 *
 * Run: node .aicodepath/hooks/__tests__/cost-tracker-hook.test.js
 */

const path = require('path');
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  PASS ${name}`);
        passed++;
    } catch (err) {
        console.log(`  FAIL ${name}: ${err.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`${msg || ''} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertTrue(val, msg) {
    if (!val) throw new Error(msg || `Expected truthy, got ${val}`);
}

// ─── Load module under test ───────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'cost-tracker-hook.js');
let hookModule;
try {
    hookModule = require(hookPath);
} catch (e) {
    console.error(`Could not load cost-tracker-hook.js: ${e.message}`);
    process.exit(1);
}

const { buildCostRecord, executeImpl } = hookModule;

console.log('\ncost-tracker-hook.js tests\n');

// ─── buildCostRecord — valid input ───────────────────────────────────────

test('Valid hook input with token data creates cost record with correct fields', () => {
    const record = buildCostRecord({
        session_id: 'sess-123',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 5000,
        output_tokens: 1000,
    });
    assertTrue(record !== null, 'Record should not be null');
    assertEqual(record.session_id, 'sess-123', 'session_id');
    assertEqual(record.model, 'claude-sonnet-4-20250514', 'model');
    assertEqual(record.input_tokens, 5000, 'input_tokens');
    assertEqual(record.output_tokens, 1000, 'output_tokens');
    assertTrue(typeof record.cost_usd === 'number', 'cost_usd should be a number');
    assertTrue(record.cost_usd > 0, 'cost_usd should be positive for non-zero tokens');
});

// ─── buildCostRecord — missing token data ────────────────────────────────

test('Missing token data returns record with zero cost (no crash)', () => {
    const record = buildCostRecord({
        session_id: 'sess-456',
    });
    assertTrue(record !== null, 'Record should not be null');
    assertEqual(record.input_tokens, 0, 'input_tokens should default to 0');
    assertEqual(record.output_tokens, 0, 'output_tokens should default to 0');
    assertEqual(record.cost_usd, 0, 'cost_usd should be 0 with no tokens');
});

// ─── buildCostRecord — known cost calculation ────────────────────────────

test('Cost calculation: sonnet model 1M input + 1M output = $18.00', () => {
    // Sonnet pricing: $3/M input, $15/M output
    const record = buildCostRecord({
        session_id: 'sess-cost',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 1000000,
        output_tokens: 1000000,
    });
    // $3.00 input + $15.00 output = $18.00
    assertEqual(record.cost_usd, 18.0, 'cost should be $18.00 for 1M sonnet tokens');
});

test('Cost calculation: haiku 3.5 model 100k input + 10k output = $0.12', () => {
    // Haiku 3.5: $0.80/M input, $4.00/M output
    const record = buildCostRecord({
        session_id: 'sess-haiku',
        model: 'claude-3-5-haiku-20241022',
        input_tokens: 100000,
        output_tokens: 10000,
    });
    // $0.08 input + $0.04 output = $0.12
    assertEqual(record.cost_usd, 0.12, 'cost should be $0.12 for haiku 3.5');
});

// ─── executeImpl — always returns success ────────────────────────────────

test('executeImpl always returns success (never blocks)', () => {
    const result = executeImpl({
        session_id: 'sess-789',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 500,
        output_tokens: 100,
    }, { skipDb: true });
    assertTrue(result.success === true, 'Result should have success: true');
});

test('executeImpl with empty hookData returns success', () => {
    const result = executeImpl({}, { skipDb: true });
    assertTrue(result.success === true, 'Result should have success: true even with empty hookData');
});

test('executeImpl with null model returns success', () => {
    const result = executeImpl({
        session_id: 'sess-null',
        model: null,
        input_tokens: 100,
        output_tokens: 50,
    }, { skipDb: true });
    assertTrue(result.success === true, 'Result should have success: true with null model');
});

// ─── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
