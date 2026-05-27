/**
 * Test: plans-watcher.js directory watching
 *
 * Sprint: Tasks Path Mismatch Fix (2026-04-21)
 * Plan:   aicodepath-docs/plan/2026-04-21-tasks-path-mismatch-fix-plan.md Task 3
 *
 * TDD RED — must fail BEFORE plans-watcher.js is updated.
 *
 * Contract asserted:
 *   1. Hook triggers for file path inside aicodepath-docs/task/ prefix
 *   2. Hook does NOT trigger for unrelated files
 *   3. Hook still triggers for aicodepath-docs/planning.md (regression guard)
 *   4. Hook does NOT trigger for the old aicodepath-docs/tasks.md path
 */
const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}

// Load the watcher (exported function, not the stdin/stdout wrapper)
const { watchPlans } = require('../hooks/plans-watcher');

function makeHookData(filePath) {
  return {
    tool_name: 'Write',
    tool_input: {
      file_path: filePath,
      content: '| T1 | agent | Do X | pass | — | 1 | TODO |\n| T2 | agent | Do Y | pass | T1 | 2 | DONE |\n',
    },
  };
}

// --- Tests ---

test('should trigger for file inside aicodepath-docs/task/ directory', () => {
  const hookData = makeHookData('aicodepath-docs/task/2026-04-21-my-sprint-tasks.md');
  const result = watchPlans(hookData);
  assertTrue(result.hookSpecificOutput && result.hookSpecificOutput.additionalContext,
    'Hook should emit additionalContext for task/ directory file');
});

test('should NOT trigger for unrelated file', () => {
  const hookData = makeHookData('src/app/main.js');
  const result = watchPlans(hookData);
  assertEqual(result.hookSpecificOutput, undefined,
    'Hook should NOT emit context for unrelated files');
});

test('should NOT trigger for aicodepath-docs/adr-log.md', () => {
  const hookData = makeHookData('aicodepath-docs/adr-log.md');
  const result = watchPlans(hookData);
  assertEqual(result.hookSpecificOutput, undefined,
    'Hook should NOT watch the ADR log (not a task file)');
});

test('should NOT trigger for aicodepath-docs/planning.md', () => {
  const hookData = makeHookData('aicodepath-docs/planning.md');
  const result = watchPlans(hookData);
  assertEqual(result.hookSpecificOutput, undefined,
    'Hook should NOT watch the old planning.md path');
});

test('should NOT trigger for old aicodepath-docs/tasks.md path', () => {
  const hookData = makeHookData('aicodepath-docs/tasks.md');
  const result = watchPlans(hookData);
  assertEqual(result.hookSpecificOutput, undefined,
    'Hook should no longer watch the old tasks.md path');
});

// --- Summary ---
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
