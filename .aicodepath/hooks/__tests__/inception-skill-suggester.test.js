'use strict';

/**
 * TDD test for inception-skill-suggester.js brownfield-readiness trigger.
 *
 * This test is written BEFORE the trigger is implemented.
 * It MUST FAIL until the hook adds the brownfield-readiness suggestion.
 *
 * Test: "should suggest aicodepath-brownfield-readiness when RE dir exists and report does not"
 *
 * Mock conditions:
 *   - reverseEngDir (aicodepath-docs/inception/reverse-engineering) → true
 *   - brownfield-readiness-report.md → false
 *   - all brownfield code indicators (package.json etc.) → false (pure path-based trigger)
 *
 * Expected result: hookSpecificOutput.additionalContext contains "aicodepath-brownfield-readiness"
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');

// ---------------------------------------------------------------------------
// Async-capable minimal test runner (matches project pattern — no jest)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];
const testQueue = [];

function describe(name, fn) {
  fn();
}

function it(name, fn) {
  testQueue.push({ name, fn });
}

async function runAll() {
  for (const { name, fn } of testQueue) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${err.message}`);
      failed++;
      failures.push({ name, error: err.message });
    }
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
  };
}

// ---------------------------------------------------------------------------
// Load hook under test
// ---------------------------------------------------------------------------

const HOOK_PATH = path.join(__dirname, '..', 'inception-skill-suggester.js');

/**
 * Run the hook with a mocked fs.existsSync.
 *
 * existsMap keys are matched as path suffixes (normalized to forward slashes).
 * Any path not matched returns false.
 */
async function runWithMockedFs(existsMap, params) {
  const originalExistsSync = fs.existsSync;
  const originalReadFileSync = fs.readFileSync;

  fs.existsSync = function (filePath) {
    const normalized = String(filePath).replace(/\\/g, '/');
    for (const [key, value] of Object.entries(existsMap)) {
      const normalizedKey = key.replace(/\\/g, '/');
      if (normalized.endsWith(normalizedKey) || normalized.includes(normalizedKey)) {
        return Boolean(value);
      }
    }
    return false;
  };

  // Prevent fs.readFileSync from reading the actual state file
  // (isInceptionPhase calls readFileSync when existsSync returns true for state file)
  fs.readFileSync = function (filePath, encoding) {
    const normalized = String(filePath).replace(/\\/g, '/');
    if (normalized.includes('aicodepath-state.md')) {
      return '**Phase**: inception\n';
    }
    return originalReadFileSync.call(fs, filePath, encoding);
  };

  let result;
  try {
    // Bust require cache so the hook picks up our mocked fs
    delete require.cache[require.resolve(HOOK_PATH)];
    const hookModule = require(HOOK_PATH);
    result = await hookModule.hook(params || { tool_input: {} });
  } finally {
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
    delete require.cache[require.resolve(HOOK_PATH)];
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('inception-skill-suggester — brownfield-readiness trigger', () => {

  it('should suggest aicodepath-brownfield-readiness when RE dir exists and report does not', async () => {
    // Arrange:
    //   isBrownfield = true  (package.json present)
    //   inInception = true   (state file present, contains "inception")
    //   reverseEngDir exists = true
    //   brownfield-readiness-report.md exists = false
    //
    // The new trigger condition (not yet implemented in the hook) should fire and
    // return hookSpecificOutput.additionalContext containing "aicodepath-brownfield-readiness".
    //
    // This test is RED until the hook implements the trigger.

    const existsMap = {
      // isBrownfield = true
      'package.json': true,
      // inInception = true (state file present; readFileSync mock returns inception phase)
      'aicodepath-docs/aicodepath-state.md': true,
      // reverseEngDir exists
      'aicodepath-docs/inception/reverse-engineering': true,
      // brownfield-readiness-report.md does NOT exist
      'aicodepath-docs/brownfield-readiness-report.md': false,
    };

    const result = await runWithMockedFs(existsMap);

    const hasReadinessSuggestion =
      result &&
      result.hookSpecificOutput &&
      result.hookSpecificOutput.additionalContext &&
      result.hookSpecificOutput.additionalContext.includes('aicodepath-brownfield-readiness');

    if (!hasReadinessSuggestion) {
      throw new Error(
        'Expected hookSpecificOutput.additionalContext to contain "aicodepath-brownfield-readiness"\n' +
        `Got: ${JSON.stringify(result, null, 2)}`
      );
    }
  });

  it('should NOT suggest aicodepath-brownfield-readiness when report already exists', async () => {
    const existsMap = {
      'package.json': true,
      'aicodepath-docs/aicodepath-state.md': true,
      'aicodepath-docs/inception/reverse-engineering': true,
      // Report already present — suppresses suggestion
      'aicodepath-docs/brownfield-readiness-report.md': true,
    };

    const result = await runWithMockedFs(existsMap);

    const hasReadinessSuggestion =
      result &&
      result.hookSpecificOutput &&
      result.hookSpecificOutput.additionalContext &&
      result.hookSpecificOutput.additionalContext.includes('aicodepath-brownfield-readiness');

    if (hasReadinessSuggestion) {
      throw new Error(
        'Expected NO brownfield-readiness suggestion when report already exists.\n' +
        `Got: ${JSON.stringify(result, null, 2)}`
      );
    }
  });

  it('should NOT suggest aicodepath-brownfield-readiness when RE dir does not exist', async () => {
    const existsMap = {
      'package.json': true,
      'aicodepath-docs/aicodepath-state.md': true,
      // RE dir absent — condition should not fire
      'aicodepath-docs/inception/reverse-engineering': false,
      'aicodepath-docs/brownfield-readiness-report.md': false,
    };

    const result = await runWithMockedFs(existsMap);

    const hasReadinessSuggestion =
      result &&
      result.hookSpecificOutput &&
      result.hookSpecificOutput.additionalContext &&
      result.hookSpecificOutput.additionalContext.includes('aicodepath-brownfield-readiness');

    if (hasReadinessSuggestion) {
      throw new Error(
        'Expected NO brownfield-readiness suggestion when RE dir does not exist.\n' +
        `Got: ${JSON.stringify(result, null, 2)}`
      );
    }
  });

});

// ---------------------------------------------------------------------------
// Execute and report
// ---------------------------------------------------------------------------

runAll().then(() => {
  console.log('');
  console.log(`inception-skill-suggester tests: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailures:');
    failures.forEach(f => {
      console.log(`  - ${f.name}: ${f.error}`);
    });
    process.exit(1);
  }

  process.exit(0);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
