/**
 * Test: Hook Tier Metadata
 *
 * Verifies that every hook in hooks.json has a valid tier field
 * and that config.json contains a hookProfile key.
 *
 * @author AICodePath Team
 * @date 2026-03-26
 */

const path = require('path');
const fs = require('fs');

// Simple test framework
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Load hooks.json
const hooksPath = path.join(__dirname, '..', 'hooks', 'hooks.json');
const hooksData = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));

// Load config.json
const configPath = path.join(__dirname, '..', 'config.json');
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Helper: collect all hook objects that have a command field
function collectHookObjects(hooksData) {
  const hookObjects = [];
  for (const [eventType, groups] of Object.entries(hooksData.hooks || {})) {
    for (const group of groups) {
      for (const hook of (group.hooks || [])) {
        if (hook.type === 'command' && hook.command) {
          hookObjects.push({ ...hook, _eventType: eventType });
        }
      }
    }
  }
  return hookObjects;
}

const VALID_TIERS = ['minimal', 'standard', 'strict'];

// --- Tests ---

test('Every hook with a command field also has a tier field', () => {
  const hooks = collectHookObjects(hooksData);
  assertTrue(hooks.length > 0, 'Should find at least one hook object');

  const missing = hooks.filter(h => !h.tier);
  if (missing.length > 0) {
    const names = missing.map(h => {
      const match = h.command.match(/hooks\/([^.]+)\.js/);
      return match ? match[1] : h.command;
    });
    throw new Error(
      `${missing.length} hook(s) missing tier field: ${names.join(', ')}`
    );
  }
});

test('All tier values are one of: minimal, standard, strict', () => {
  const hooks = collectHookObjects(hooksData);

  const invalid = hooks.filter(h => h.tier && !VALID_TIERS.includes(h.tier));
  if (invalid.length > 0) {
    const details = invalid.map(h => {
      const match = h.command.match(/hooks\/([^.]+)\.js/);
      const name = match ? match[1] : h.command;
      return `${name} (tier="${h.tier}")`;
    });
    throw new Error(
      `${invalid.length} hook(s) have invalid tier values: ${details.join(', ')}`
    );
  }
});

test('config.json contains hookProfile key with value "standard"', () => {
  assertTrue(
    configData.hasOwnProperty('hookProfile'),
    'config.json should have a "hookProfile" key'
  );
  assertEqual(
    configData.hookProfile,
    'standard',
    'hookProfile should be "standard"'
  );
});

// --- Runner ---

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  PASS: ${t.name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${t.name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
