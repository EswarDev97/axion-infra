#!/usr/bin/env node
'use strict';

/**
 * Test Template: Hook Tests
 *
 * Adapt this template for any AICodePath hook.
 * Replace HOOK_NAME with the actual hook filename (without .js).
 *
 * Usage:
 *   node .aicodepath/__tests__/hook-HOOK_NAME.test.js
 *
 * Pattern matches the project's existing test files:
 *   - test(name, fn) — synchronous or async test runner
 *   - assertEqual(actual, expected, msg) — strict equality
 *   - assertTrue(condition, msg) — truthy assertion
 *   - assertFalse(condition, msg) — falsy assertion
 *   - assertIncludes(str, substr, msg) — string contains check
 */

const path = require('path');
const { execSync } = require('child_process');

// =============================================================================
// Test runner (project-standard pattern — matches __tests__/*.test.js)
// =============================================================================

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
    const result = fn();
    // Support async test functions
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passed++;
        console.log(`${colors.green}\u2713${colors.reset} ${name}`);
      }).catch(err => {
        failed++;
        console.log(`${colors.red}\u2717${colors.reset} ${name}`);
        console.log(`  ${colors.yellow}${err.message}${colors.reset}`);
      });
    }
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (err) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${err.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(
      `${message}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message || `Expected truthy, got ${condition}`}`);
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(`${message || `Expected falsy, got ${condition}`}`);
  }
}

function assertIncludes(str, substring, message = '') {
  if (!str.includes(substring)) {
    throw new Error(
      `${message}\n  Expected to include: ${JSON.stringify(substring)}\n  In: ${JSON.stringify(str.substring(0, 200))}`
    );
  }
}

// =============================================================================
// Hook under test
// =============================================================================

// REPLACE: Change HOOK_NAME to your actual hook filename (without .js)
const HOOK_NAME = 'HOOK_NAME';
const HOOK_PATH = path.join(__dirname, '..', 'hooks', `${HOOK_NAME}.js`);

// =============================================================================
// Helper: Run hook as a child process
//
// This tests the full protocol: stdin JSON → stdout JSON → exit code
// It catches the hook's actual exit code and stdout output.
//
// Returns: { exitCode: number, output: object|null, rawOutput: string }
// =============================================================================

function runHook(input) {
  // Normalize input to a JSON string
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

  try {
    const stdout = execSync(
      // Use printf to avoid shell interpretation of special characters in inputStr
      `printf '%s' ${JSON.stringify(inputStr)} | node ${HOOK_PATH}`,
      {
        encoding: 'utf8',
        timeout: 10000,  // 10s max — hooks should be fast
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    const raw = stdout.trim();
    return {
      exitCode: 0,
      output: raw ? JSON.parse(raw) : null,
      rawOutput: raw,
    };
  } catch (err) {
    // execSync throws when exit code !== 0
    const raw = (err.stdout || '').trim();
    let output = null;
    try {
      output = raw ? JSON.parse(raw) : null;
    } catch (_) {
      // stdout wasn't JSON — that's OK for some hooks
    }
    return {
      exitCode: err.status ?? 1,
      output,
      rawOutput: raw,
    };
  }
}

// =============================================================================
// Helper: Directly call execute() without process overhead
//
// Faster than runHook() — use for logic-heavy tests where you don't need
// to verify the full stdin→stdout→exit protocol.
//
// Note: You must export execute() from your hook for this to work.
// Add this at the bottom of your hook file:
//   if (require.main !== module) module.exports = { execute };
// =============================================================================

// UNCOMMENT if your hook exports execute():
// const { execute } = require(HOOK_PATH);

// =============================================================================
// Test cases
// =============================================================================

// Minimal valid hookData for PreToolUse Write (adapt for your event type)
const BASE_HOOK_DATA = {
  hook_event_name: 'PreToolUse',
  session_id: 'test-session-123',
  tool_name: 'Write',
  tool_input: {
    file_path: '/project/src/example.ts',
    content: '// normal content\nexport const x = 1;\n',
  },
};

// ============================================================================
// TEST 1: Happy path — normal input passes through
// ============================================================================
console.log('\n--- Happy path ---\n');

test('normal input exits 0', () => {
  const result = runHook(BASE_HOOK_DATA);
  assertEqual(result.exitCode, 0, 'Should exit 0 for normal input');
});

test('normal input produces valid JSON output or no output', () => {
  const result = runHook(BASE_HOOK_DATA);
  // Output may be null (hook only sets exit code) or a valid object
  assertTrue(
    result.output === null || typeof result.output === 'object',
    'Output must be null or a JSON object'
  );
});

// REPLACE: Add hook-specific assertions for the happy path
// Example: if your hook injects context:
// test('injects additionalContext for relevant files', () => {
//   const result = runHook({ ...BASE_HOOK_DATA, tool_input: { file_path: '/project/schema.sql', content: 'CREATE TABLE ...' } });
//   assertEqual(result.exitCode, 0);
//   assertTrue(result.output?.hookSpecificOutput?.additionalContext?.length > 0, 'Should inject schema context');
// });

// ============================================================================
// TEST 2: Block path — input that should be denied
// ============================================================================
console.log('\n--- Block path (PreToolUse hooks only) ---\n');

// REPLACE: Provide input that your hook should block
// Delete this section if your hook is PostToolUse or another non-blockable event

// test('blocks when [condition]', () => {
//   const blockedInput = {
//     ...BASE_HOOK_DATA,
//     tool_input: {
//       file_path: '/project/src/example.ts',
//       content: '// content that violates a rule\nconsole.log("debug")\n',
//     },
//   };
//   const result = runHook(blockedInput);
//   assertEqual(result.exitCode, 2, 'Should exit 2 to block the operation');
// });

// test('block output includes permissionDecision deny', () => {
//   const blockedInput = { ...BASE_HOOK_DATA, tool_input: { file_path: '...', content: '...' } };
//   const result = runHook(blockedInput);
//   assertEqual(result.output?.hookSpecificOutput?.permissionDecision, 'deny');
// });

// ============================================================================
// TEST 3: Fail-open — malformed input must always exit 0
// ============================================================================
console.log('\n--- Fail-open (critical — must pass) ---\n');

test('malformed JSON input exits 0 (fail open)', () => {
  const result = runHook('not-valid-json');
  assertEqual(result.exitCode, 0, 'Malformed input must fail open (exit 0)');
});

test('empty string input exits 0 (fail open)', () => {
  const result = runHook('');
  assertEqual(result.exitCode, 0, 'Empty input must fail open (exit 0)');
});

test('null tool_input exits 0 (fail open)', () => {
  const result = runHook({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: null });
  assertEqual(result.exitCode, 0, 'Null tool_input must fail open (exit 0)');
});

test('missing file_path exits 0 (fail open)', () => {
  const result = runHook({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: {} });
  assertEqual(result.exitCode, 0, 'Missing file_path must fail open (exit 0)');
});

// ============================================================================
// TEST 4: Hook-specific edge cases
// ============================================================================
console.log('\n--- Edge cases (fill in for your hook) ---\n');

// REPLACE: Add tests specific to your hook's behavior.
// Consider:
//   - Empty content: tool_input.content = ''
//   - Very large content: tool_input.content = 'x'.repeat(100000)
//   - Non-matching file extension: file_path = '/project/README.md' (if hook is TS-only)
//   - Non-matching tool: tool_name = 'Read' (if hook only handles Write)
//   - Concurrent calls: run multiple instances in parallel

test('non-matching tool name exits 0 without processing', () => {
  // Most hooks should pass through when the tool is not their target
  // REPLACE: adjust tool_name to a tool your hook should ignore
  const result = runHook({ ...BASE_HOOK_DATA, tool_name: 'Read' });
  assertEqual(result.exitCode, 0, 'Non-matching tool should pass through');
  // OPTIONAL: also assert no context was injected
  // assertEqual(result.output?.hookSpecificOutput, undefined, 'Should not inject for Read tool');
});

// REPLACE: Add at least one meaningful edge case for your hook's specific domain.
// Example edge case template:
// test('[describe edge case]', () => {
//   const edgeCaseInput = {
//     ...BASE_HOOK_DATA,
//     tool_input: {
//       file_path: '...',
//       content: '...',
//     },
//   };
//   const result = runHook(edgeCaseInput);
//   // assert expected behavior
// });

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(
  `Tests: ${passed + failed} total, ` +
  `${colors.green}${passed} passed${colors.reset}, ` +
  `${colors.red}${failed} failed${colors.reset}`
);
console.log(`${'='.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
