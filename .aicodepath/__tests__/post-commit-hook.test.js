#!/usr/bin/env node
/**
 * Tests for post-commit-hook.js
 *
 * Run: node .aicodepath/__tests__/post-commit-hook.test.js
 */

const path = require('path');
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
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
    if (!str.includes(substr)) {
        throw new Error(`${msg || ''} — expected "${str}" to contain "${substr}"`);
    }
}

// ─── Load module under test ───────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'hooks', 'post-commit-hook.js');
let hookModule;
try {
    hookModule = require(hookPath);
} catch (e) {
    console.error(`Could not load post-commit-hook.js: ${e.message}`);
    process.exit(1);
}

console.log('\npost-commit-hook.js tests\n');

// ─── Test 1: module exports execute function ──────────────────────────────
test('exports an execute function', () => {
    assertTrue(typeof hookModule.execute === 'function', 'execute must be a function');
});

// ─── Test 2: git commit command returns empty result ─────────────────────
test('git commit command returns empty result', async () => {
    const result = await hookModule.execute({
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "feat: add new feature"' },
    });
    assertTrue(result !== null && result !== undefined, 'result must not be null');
    const hasMessage = result && result.systemMessage && result.systemMessage.length > 0;
    assertTrue(!hasMessage, 'git commit must not produce a systemMessage');
});

// ─── Test 3: non-commit bash command returns empty/no systemMessage ───────
test('non-commit bash command returns no systemMessage', async () => {
    const result = await hookModule.execute({
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
    });
    // Should not inject a systemMessage for non-commit commands
    const hasMessage = result && result.systemMessage && result.systemMessage.length > 0;
    assertTrue(!hasMessage, 'non-commit command must not produce a systemMessage');
});

// ─── Test 4: git push (not commit) returns no systemMessage ──────────────
test('git push does not trigger learn message', async () => {
    const result = await hookModule.execute({
        tool_name: 'Bash',
        tool_input: { command: 'git push origin main' },
    });
    const hasMessage = result && result.systemMessage && result.systemMessage.length > 0;
    assertTrue(!hasMessage, 'git push must not produce a systemMessage');
});

// ─── Test 5: missing tool_input handled gracefully ────────────────────────
test('missing tool_input does not throw', async () => {
    const result = await hookModule.execute({
        tool_name: 'Bash',
        tool_input: null,
    });
    assertTrue(result !== undefined, 'result must not be undefined');
});

// ─── Test 6: git commit --amend returns empty result ─────────────────────
test('git commit --amend returns empty result', async () => {
    const result = await hookModule.execute({
        tool_name: 'Bash',
        tool_input: { command: 'git commit --amend --no-edit' },
    });
    assertTrue(result !== null && result !== undefined, 'result must not be null');
    const hasMessage = result && result.systemMessage && result.systemMessage.length > 0;
    assertTrue(!hasMessage, 'git commit --amend must not produce a systemMessage');
});

// ─── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
