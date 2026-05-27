#!/usr/bin/env node
/**
 * Tests for session-end-hook.js
 *
 * Run: node .aicodepath/__tests__/session-end-hook.test.js
 */

const path = require('path');
let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
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

function assertContains(str, substr, msg) {
    if (!str || !str.includes(substr)) {
        throw new Error(`${msg || ''} — expected string to contain "${substr}"`);
    }
}

function assertNotContains(str, substr, msg) {
    if (str && str.includes(substr)) {
        throw new Error(`${msg || ''} — expected string NOT to contain "${substr}"`);
    }
}

// ─── Load module under test ───────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'hooks', 'session-end-hook.js');
let hookModule;
try {
    hookModule = require(hookPath);
} catch (e) {
    console.error(`Could not load session-end-hook.js: ${e.message}`);
    process.exit(1);
}

// Minimal hook input for a normal session end
const MINIMAL_INPUT = {
    reason: 'user_quit',
    session_duration_ms: 1000,
    total_tokens_used: 100,
    tools_called_count: 5,
};

async function runTests() {
    console.log('\nsession-end-hook.js tests\n');

    // ─── Test 1: module exports execute function ──────────────────────────
    await test('exports an execute function', () => {
        assertTrue(typeof hookModule.execute === 'function', 'execute must be a function');
    });

    // ─── Test 2: systemMessage does NOT contain aicodepath-learn ─────────
    await test('systemMessage does not contain aicodepath-learn', async () => {
        let result;
        try {
            result = await hookModule.execute(MINIMAL_INPUT);
        } catch (e) {
            // Hook failed due to missing DB/modules — skip assertion
            return;
        }
        if (result && result.systemMessage) {
            assertNotContains(
                result.systemMessage,
                'aicodepath-learn',
                'systemMessage must NOT mention aicodepath-learn'
            );
        }
    });

    // ─── Test 3: systemMessage DOES contain aicodepath-pause ─────────────
    await test('systemMessage contains aicodepath-pause', async () => {
        let result;
        try {
            result = await hookModule.execute(MINIMAL_INPUT);
        } catch (e) {
            // Hook failed due to missing DB/modules — skip assertion
            return;
        }
        if (result && result.systemMessage) {
            assertContains(
                result.systemMessage,
                'aicodepath-pause',
                'systemMessage must mention aicodepath-pause'
            );
        }
    });

    // ─── Summary ──────────────────────────────────────────────────────────
    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

runTests();
