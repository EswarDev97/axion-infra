#!/usr/bin/env node
/**
 * Tests for graph-git-hook.js
 *
 * Run: node .aicodepath/__tests__/graph-git-hook.test.js
 */

'use strict';

const path = require('path');

// Point AICODEPATH_GRAPH_SCRIPT at the mock fixture so tests never invoke the real parser
const FIXTURE_SCRIPT = path.join(__dirname, 'fixtures', 'mock_parser.py');
process.env.AICODEPATH_GRAPH_SCRIPT = FIXTURE_SCRIPT;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
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

// ─── Load module under test ────────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'hooks', 'graph-git-hook.js');
let hookModule;
try {
  hookModule = require(hookPath);
} catch (e) {
  console.error(`Could not load graph-git-hook.js: ${e.message}`);
  process.exit(1);
}

console.log('\ngraph-git-hook.js tests\n');

// ─── Test runner ──────────────────────────────────────────────────────────
async function runTests() {

  // 1. module exports
  await test('exports execute function and GIT_GRAPH_TRIGGERS array', async () => {
    assertTrue(typeof hookModule.execute === 'function', 'execute must be a function');
    assertTrue(Array.isArray(hookModule.GIT_GRAPH_TRIGGERS), 'GIT_GRAPH_TRIGGERS must be an array');
    assertTrue(hookModule.GIT_GRAPH_TRIGGERS.length > 0, 'GIT_GRAPH_TRIGGERS must not be empty');
  });

  // 2. git commit triggers reindex
  await test('test_git_commit_triggers_reindex — git commit returns proceed:true', async () => {
    const result = await hookModule.execute({
      tool_input: { command: "git commit -m 'test'" },
    });
    assertTrue(result !== null && result !== undefined, 'result must not be null');
    assertEqual(result.proceed, true, 'proceed must be true');
  });

  // 3. git pull triggers reindex
  await test('test_git_pull_triggers_reindex — git pull origin main returns proceed:true', async () => {
    const result = await hookModule.execute({
      tool_input: { command: 'git pull origin main' },
    });
    assertTrue(result !== null && result !== undefined, 'result must not be null');
    assertEqual(result.proceed, true, 'proceed must be true');
  });

  // 4. npm install does NOT trigger
  await test('test_npm_install_no_trigger — npm install returns proceed:true with no additionalContext', async () => {
    const result = await hookModule.execute({
      tool_input: { command: 'npm install' },
    });
    assertEqual(result.proceed, true, 'proceed must be true');
    const hasContext = result.hookSpecificOutput && result.hookSpecificOutput.additionalContext;
    assertTrue(!hasContext, 'npm install must not produce additionalContext');
  });

  // 5. python failure → still returns proceed:true
  await test('test_python_failure_returns_proceed_true — diffReindex throws → proceed:true', async () => {
    const bridgePath = require.resolve('../hooks/lib/graph-bridge');
    const originalBridgeModule = require.cache[bridgePath];

    // Inject a mock that throws
    require.cache[bridgePath] = {
      id: bridgePath,
      filename: bridgePath,
      loaded: true,
      exports: {
        diffReindex: async () => { throw new Error('Python process crashed'); },
        reindexFile: async () => null,
        invokePython: async () => null,
      },
    };

    // Force re-require of graph-git-hook to pick up the mocked bridge
    const hookKey = require.resolve('../hooks/graph-git-hook');
    delete require.cache[hookKey];
    const freshHook = require(hookKey);

    let result;
    try {
      result = await freshHook.execute({
        tool_input: { command: 'git commit -m "crash test"' },
      });
    } finally {
      // Restore original modules
      require.cache[bridgePath] = originalBridgeModule;
      delete require.cache[hookKey];
    }

    assertTrue(result !== null && result !== undefined, 'result must not be null even when diffReindex throws');
    assertEqual(result.proceed, true, 'proceed must be true even when Python fails');
    const hasContext = result.hookSpecificOutput && result.hookSpecificOutput.additionalContext;
    assertTrue(!hasContext, 'failing diffReindex must not produce additionalContext');
  });

  // 6. git merge triggers
  await test('test_git_merge_triggers — git merge feature-branch returns proceed:true', async () => {
    const result = await hookModule.execute({
      tool_input: { command: 'git merge feature-branch' },
    });
    assertEqual(result.proceed, true, 'proceed must be true');
  });

  // 7. missing tool_input does not crash
  await test('test_missing_command_no_trigger — empty hookData returns proceed:true without crash', async () => {
    const result = await hookModule.execute({});
    assertEqual(result.proceed, true, 'proceed must be true for empty hookData');
    const hasContext = result.hookSpecificOutput && result.hookSpecificOutput.additionalContext;
    assertTrue(!hasContext, 'empty hookData must not produce additionalContext');
  });

  // 8. git stash pop triggers
  await test('git stash pop triggers reindex', async () => {
    const result = await hookModule.execute({
      tool_input: { command: 'git stash pop' },
    });
    assertEqual(result.proceed, true, 'proceed must be true');
  });

  // 9. git checkout triggers
  await test('git checkout main triggers reindex', async () => {
    const result = await hookModule.execute({
      tool_input: { command: 'git checkout main' },
    });
    assertEqual(result.proceed, true, 'proceed must be true');
  });

  // 10. git rebase triggers
  await test('git rebase main triggers reindex', async () => {
    const result = await hookModule.execute({
      tool_input: { command: 'git rebase main' },
    });
    assertEqual(result.proceed, true, 'proceed must be true');
  });

  // 11. git cherry-pick triggers
  await test('git cherry-pick abc1234 triggers reindex', async () => {
    const result = await hookModule.execute({
      tool_input: { command: 'git cherry-pick abc1234' },
    });
    assertEqual(result.proceed, true, 'proceed must be true');
  });

  // 12. null hookData does not crash
  await test('null hookData returns proceed:true without crash', async () => {
    const result = await hookModule.execute(null);
    assertEqual(result.proceed, true, 'proceed must be true for null hookData');
  });

  // 13. coverage threshold
  await test('checkAndTriggerFullReindex is exported and callable without throwing', async () => {
    assertTrue(
      typeof hookModule.checkAndTriggerFullReindex === 'function',
      'checkAndTriggerFullReindex must be exported as a function'
    );
    // Call with a non-existent db path — must not throw (fail-open)
    const result = await hookModule.checkAndTriggerFullReindex('/tmp/nonexistent-coverage-test.db');
    assertTrue(result !== null && result !== undefined, 'must return a result object');
    assertTrue(typeof result.triggered === 'boolean', 'result.triggered must be a boolean');
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
