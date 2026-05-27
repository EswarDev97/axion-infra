#!/usr/bin/env node
/**
 * Tests for desktop-notify-hook.js
 *
 * Run: node .aicodepath/hooks/__tests__/desktop-notify-hook.test.js
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

function assertContains(str, substr, msg) {
    if (!str.includes(substr)) {
        throw new Error(`${msg || ''} — expected "${str}" to contain "${substr}"`);
    }
}

// ─── Load module under test ───────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'desktop-notify-hook.js');
let hookModule;
try {
    hookModule = require(hookPath);
} catch (e) {
    console.error(`Could not load desktop-notify-hook.js: ${e.message}`);
    process.exit(1);
}

const { buildNotifyCommand, detectPlatform } = hookModule;

console.log('\ndesktop-notify-hook.js tests\n');

// ─── detectPlatform ───────────────────────────────────────────────────────

test('detectPlatform returns a string platform value', () => {
    const platform = detectPlatform();
    assertTrue(typeof platform === 'string', 'platform should be a string');
    assertTrue(
        ['darwin', 'linux', 'wsl', 'unsupported'].includes(platform),
        `platform should be one of darwin/linux/wsl/unsupported, got: ${platform}`
    );
});

// ─── buildNotifyCommand — Linux ──────────────────────────────────────────

test('On linux platform, constructs notify-send command', () => {
    const cmd = buildNotifyCommand('linux', 'Test Title', 'Test body');
    assertTrue(cmd !== null, 'Command should not be null for linux');
    assertEqual(cmd.bin, 'notify-send', 'Binary should be notify-send');
    assertTrue(Array.isArray(cmd.args), 'args should be an array');
    assertContains(cmd.args.join(' '), 'Test Title', 'args should contain title');
    assertContains(cmd.args.join(' '), 'Test body', 'args should contain body');
});

// ─── buildNotifyCommand — Darwin ─────────────────────────────────────────

test('On darwin platform, constructs osascript command', () => {
    const cmd = buildNotifyCommand('darwin', 'Test Title', 'Test body');
    assertTrue(cmd !== null, 'Command should not be null for darwin');
    assertEqual(cmd.bin, 'osascript', 'Binary should be osascript');
    assertTrue(Array.isArray(cmd.args), 'args should be an array');
    const argsStr = cmd.args.join(' ');
    assertContains(argsStr, 'display notification', 'args should contain display notification');
    assertContains(argsStr, 'Test body', 'args should contain body');
});

// ─── buildNotifyCommand — WSL ────────────────────────────────────────────

test('On wsl platform, constructs powershell.exe command', () => {
    const cmd = buildNotifyCommand('wsl', 'Test Title', 'Test body');
    assertTrue(cmd !== null, 'Command should not be null for wsl');
    assertEqual(cmd.bin, 'powershell.exe', 'Binary should be powershell.exe');
    assertTrue(Array.isArray(cmd.args), 'args should be an array');
    const argsStr = cmd.args.join(' ');
    assertContains(argsStr, 'Test body', 'args should contain body');
});

// ─── buildNotifyCommand — unsupported ────────────────────────────────────

test('On unsupported platform, returns null (no crash)', () => {
    const cmd = buildNotifyCommand('unsupported', 'Title', 'Body');
    assertEqual(cmd, null, 'Command should be null for unsupported platform');
});

// ─── execute — always returns exitSuccess shape ──────────────────────────

test('execute returns success result (never blocks)', () => {
    // Mock: override spawn behavior by testing the exported execute logic
    // execute should return a result with success: true
    const result = hookModule.executeImpl({
        reason: 'end_turn',
        tokens_used: 1000,
        session_id: 'test-session',
    }, { skipNotify: true });
    assertTrue(result.success === true, 'Result should have success: true');
});

test('execute handles missing hookData gracefully', () => {
    const result = hookModule.executeImpl({}, { skipNotify: true });
    assertTrue(result.success === true, 'Result should have success: true even with empty hookData');
});

// ─── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
