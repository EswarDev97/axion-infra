#!/usr/bin/env node
/**
 * Tests for pre-compact-hook.js
 *
 * Run: node .aicodepath/__tests__/pre-compact-hook.test.js
 */

const path = require('path');
const fs = require('fs');
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

function assertTrue(val, msg) {
    if (!val) throw new Error(msg || `Expected truthy, got ${val}`);
}

function assertContains(str, substr, msg) {
    if (!str.includes(substr)) {
        throw new Error(`${msg || ''} — expected string to contain "${substr}"`);
    }
}

// ─── Load module under test ───────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'hooks', 'pre-compact-hook.js');
let hookModule;
try {
    hookModule = require(hookPath);
} catch (e) {
    console.error(`Could not load pre-compact-hook.js: ${e.message}`);
    process.exit(1);
}

// Read source text for string-based assertions (fallback and supplementary)
const hookSource = fs.readFileSync(hookPath, 'utf8');

console.log('\npre-compact-hook.js tests\n');

// ─── Test 1: module exports execute function ──────────────────────────────
test('exports an execute function', () => {
    assertTrue(typeof hookModule.execute === 'function', 'execute must be a function');
});

// ─── Test 2: systemMessage contains "if you haven't" (case-insensitive) ──
// Checks the source text directly — execute() requires DB/session infrastructure
// that is unavailable in the test environment.
test('systemMessage source contains "if you haven\'t" (case-insensitive)', () => {
    assertContains(
        hookSource.toLowerCase(),
        "if you haven't",
        'hook source must contain the safety-net framing "if you haven\'t"'
    );
});

// ─── Test 3: systemMessage does NOT contain "NOW" as an all-caps word ─────
test('systemMessage source does not contain "NOW" in all-caps', () => {
    // Check the line that sets result.systemMessage
    const lines = hookSource.split('\n');
    const msgLine = lines.find(l => l.includes('result.systemMessage') && l.includes('"'));
    assertTrue(msgLine !== undefined, 'could not find result.systemMessage assignment line');
    // Verify the message text does not include the word NOW in all-caps
    assertTrue(
        !/ NOW[^a-z]/.test(msgLine) && !msgLine.includes(' NOW.') && !msgLine.includes(' NOW"') && !/NOW/.test(msgLine.match(/"([^"]*)"/)?.[1] || ''),
        'systemMessage must not contain "NOW" in all-caps — use softer safety-net framing'
    );
});

// ─── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
