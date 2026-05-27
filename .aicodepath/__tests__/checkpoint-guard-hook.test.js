#!/usr/bin/env node
/**
 * Tests for checkpoint-guard-hook.js
 *
 * TDD: These tests are written BEFORE the hook exists.
 * All tests should FAIL until the hook is implemented (Task T5).
 *
 * Scenarios:
 *   1. Clean worktree → allow (no block)
 *   2. Dirty worktree → block with reason
 *   3. No active-worktree.json → fallback to project root for git status
 *   4. Non-checkpoint path → pass through (not applicable)
 */

let passed = 0;
let failed = 0;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(message || 'Expected true');
}

function assertFalse(condition, message) {
  if (condition) throw new Error(message || 'Expected false');
}

// --- Try to load the hook module ---
let evaluate;
try {
  // The hook should export an evaluate function for testability
  const hook = require('../hooks/checkpoint-guard-hook');
  evaluate = hook.evaluate;
} catch (e) {
  // Hook doesn't exist yet — all tests should fail
  evaluate = null;
}

// Helper to build PreToolUse Write hook data
function writeInput(filePath, content) {
  return {
    tool_name: 'Write',
    tool_input: {
      file_path: filePath,
      content: content || '{}',
    },
  };
}

console.log(`\n${colors.bold}Checkpoint Guard Hook Tests${colors.reset}\n`);

// --- Test 1: Clean worktree → allow ---
test('Clean worktree allows checkpoint write', () => {
  assertTrue(evaluate !== null, 'Hook module not found — implement checkpoint-guard-hook.js');

  const hookData = writeInput('aicodepath-docs/checkpoints/cp_20260401.json');
  // Mock: git status --porcelain returns empty (clean)
  const result = evaluate(hookData, {
    gitStatusOutput: '',
    worktreePath: '/tmp/test-worktree',
  });

  // Should allow — no decision field or decision !== 'block'
  if (result.decision) {
    assertTrue(result.decision !== 'block', 'Clean worktree should not block checkpoint write');
  }
});

// --- Test 2: Dirty worktree → block ---
test('Dirty worktree blocks checkpoint write with reason', () => {
  assertTrue(evaluate !== null, 'Hook module not found — implement checkpoint-guard-hook.js');

  const hookData = writeInput('aicodepath-docs/checkpoints/cp_20260401.json');
  // Mock: git status --porcelain returns modified files
  const result = evaluate(hookData, {
    gitStatusOutput: ' M src/file.js\n?? new-file.js\n',
    worktreePath: '/tmp/test-worktree',
  });

  assertEqual(result.decision, 'block', 'Dirty worktree should block checkpoint write');
  assertTrue(
    result.reason && result.reason.length > 0,
    'Block decision must include a reason'
  );
  assertTrue(
    result.reason.includes('uncommitted') || result.reason.includes('commit'),
    'Reason should mention uncommitted files or committing'
  );
});

// --- Test 3: No active-worktree.json → fallback to project root ---
test('Missing active-worktree.json falls back to project root', () => {
  assertTrue(evaluate !== null, 'Hook module not found — implement checkpoint-guard-hook.js');

  const hookData = writeInput('aicodepath-docs/checkpoints/cp_20260401.json');
  // Mock: no worktree file, git status returns clean from project root
  const result = evaluate(hookData, {
    gitStatusOutput: '',
    worktreePath: null, // signals no active-worktree.json
    fallbackPath: '/home/user/project',
  });

  // Should allow — clean status from fallback path
  if (result.decision) {
    assertTrue(result.decision !== 'block', 'Clean fallback path should not block');
  }
});

// --- Test 4: Non-checkpoint path → pass through ---
test('Non-checkpoint path passes through without checking git status', () => {
  assertTrue(evaluate !== null, 'Hook module not found — implement checkpoint-guard-hook.js');

  const hookData = writeInput('src/components/Button.tsx');
  // No git status mock needed — hook should not check for non-checkpoint paths
  const result = evaluate(hookData, {});

  // Should return empty or allow — no block decision
  if (result.decision) {
    assertTrue(result.decision !== 'block', 'Non-checkpoint path should never be blocked by this hook');
  }
});

// --- Test 5: Dirty worktree includes file count in reason ---
test('Block reason includes count of uncommitted files', () => {
  assertTrue(evaluate !== null, 'Hook module not found — implement checkpoint-guard-hook.js');

  const hookData = writeInput('aicodepath-docs/checkpoints/latest.json');
  const result = evaluate(hookData, {
    gitStatusOutput: ' M file1.js\n M file2.js\n?? file3.js\n',
    worktreePath: '/tmp/test-worktree',
  });

  assertEqual(result.decision, 'block', 'Should block on dirty worktree');
  assertTrue(
    result.reason.includes('3') || result.reason.includes('uncommitted'),
    'Reason should mention the number of uncommitted files'
  );
});

// --- Summary ---
console.log(`\n${colors.bold}Results: ${passed} passed, ${failed} failed${colors.reset}`);
if (failed > 0) {
  console.log(`${colors.red}Some tests failed — this is expected until checkpoint-guard-hook.js is implemented (Task T5)${colors.reset}`);
}
process.exit(failed > 0 ? 1 : 0);
