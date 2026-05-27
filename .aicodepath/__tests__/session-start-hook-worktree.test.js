#!/usr/bin/env node
/**
 * Tests for session-start-hook.js — worktree injection (ADR-007)
 *
 * Run: node .aicodepath/__tests__/session-start-hook-worktree.test.js
 *
 * These tests verify that when aicodepath-docs/state/active-worktree.json
 * exists, a warning is injected into additionalContext.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

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

// ─── Load module under test ────────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'hooks', 'session-start-hook.js');
let hookModule;
try {
  hookModule = require(hookPath);
} catch (e) {
  console.error(`Could not load session-start-hook.js: ${e.message}`);
  process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Create a temporary project-root-like directory with the state directory
 * structure, optionally writing active-worktree.json with provided content.
 *
 * Returns the temp dir path and a cleanup function.
 */
function makeTempProject(worktreeContent) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-test-'));
  const stateDir = path.join(tmpDir, 'aicodepath-docs', 'state');
  fs.mkdirSync(stateDir, { recursive: true });

  if (worktreeContent !== undefined) {
    fs.writeFileSync(
      path.join(stateDir, 'active-worktree.json'),
      worktreeContent,
      'utf8'
    );
  }

  function cleanup() {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {
      // ignore cleanup errors
    }
  }

  return { tmpDir, cleanup };
}

/**
 * Call the hook's exported function with a custom projectRoot by temporarily
 * overriding the path-resolver's findProjectRoot to return our tmpDir.
 *
 * We reload the hook module fresh for each test to avoid caching issues.
 */
async function callHookWithRoot(projectRoot) {
  // Invalidate the cached module so re-require picks up the current state
  delete require.cache[require.resolve(hookPath)];

  // Also clear path-resolver cache so we can monkey-patch cleanly
  const resolverPath = require.resolve(path.join(__dirname, '..', 'lib', 'path-resolver'));
  const originalResolver = require.cache[resolverPath];

  // Patch path-resolver in the module registry
  if (require.cache[resolverPath]) {
    const origFindProjectRoot = require.cache[resolverPath].exports.findProjectRoot;
    require.cache[resolverPath].exports.findProjectRoot = () => projectRoot;

    const freshHook = require(hookPath);
    const result = await (freshHook.hook || freshHook.execute)({});

    // Restore
    require.cache[resolverPath].exports.findProjectRoot = origFindProjectRoot;
    delete require.cache[require.resolve(hookPath)];

    return result;
  } else {
    // path-resolver not yet loaded — load it, patch, then load hook
    const resolver = require(resolverPath);
    const origFindProjectRoot = resolver.findProjectRoot;
    resolver.findProjectRoot = () => projectRoot;

    const freshHook = require(hookPath);
    const result = await (freshHook.hook || freshHook.execute)({});

    resolver.findProjectRoot = origFindProjectRoot;
    delete require.cache[require.resolve(hookPath)];

    return result;
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\nsession-start-hook.js — worktree injection tests (ADR-007)\n');

  // ─── Test 1: module exports a callable hook function ────────────────────
  await test('exports hook or execute function', () => {
    const fn = hookModule.hook || hookModule.execute;
    assertTrue(typeof fn === 'function', 'hook/execute must be a function');
  });

  // ─── Test 2: no active-worktree.json → no worktree warning ──────────────
  await test('absent active-worktree.json — additionalContext has no worktree warning', async () => {
    const { tmpDir, cleanup } = makeTempProject(/* no file */);
    try {
      const result = await callHookWithRoot(tmpDir);

      // Result must exist and not throw
      assertTrue(result !== null && result !== undefined, 'result must be defined');

      const ctx = result &&
        result.hookSpecificOutput &&
        result.hookSpecificOutput.additionalContext;

      // If context is present, it must NOT mention the worktree warning
      if (ctx) {
        assertNotContains(
          ctx,
          'Worktree active',
          'additionalContext must NOT contain worktree warning when file is absent'
        );
        assertNotContains(
          ctx,
          'active-worktree',
          'additionalContext must NOT mention active-worktree when file is absent'
        );
      }
    } finally {
      cleanup();
    }
  });

  // ─── Test 3: valid JSON → worktree path and branch injected ─────────────
  await test('valid active-worktree.json — additionalContext includes worktree path', async () => {
    const wtData = JSON.stringify({ worktree_path: '/tmp/test-wt', branch: 'feature/test' });
    const { tmpDir, cleanup } = makeTempProject(wtData);
    try {
      const result = await callHookWithRoot(tmpDir);

      assertTrue(result !== null && result !== undefined, 'result must be defined');

      const ctx = result &&
        result.hookSpecificOutput &&
        result.hookSpecificOutput.additionalContext;

      assertTrue(
        typeof ctx === 'string' && ctx.length > 0,
        'additionalContext must be a non-empty string when worktree is active'
      );

      assertContains(
        ctx,
        '/tmp/test-wt',
        'additionalContext must contain the worktree_path value'
      );
      assertContains(
        ctx,
        'feature/test',
        'additionalContext must contain the branch name'
      );
      assertContains(
        ctx,
        'Active Worktree',
        'additionalContext must contain the ## Active Worktree heading'
      );
    } finally {
      cleanup();
    }
  });

  // ─── Test 4: invalid JSON → hook does not throw, returns normally ────────
  await test('invalid JSON in active-worktree.json — hook returns normally (fail-open)', async () => {
    const { tmpDir, cleanup } = makeTempProject('{ this is not valid json !!!');
    try {
      let result;
      let threw = false;
      try {
        result = await callHookWithRoot(tmpDir);
      } catch (e) {
        threw = true;
      }

      assertTrue(!threw, 'hook must NOT throw when active-worktree.json contains invalid JSON');
      assertTrue(result !== null && result !== undefined, 'result must be defined on malformed JSON');
    } finally {
      cleanup();
    }
  });

  // ─── Test 5: empty string content → hook does not throw, returns normally ─
  await test('empty active-worktree.json — hook returns normally (fail-open)', async () => {
    const { tmpDir, cleanup } = makeTempProject('');
    try {
      let result;
      let threw = false;
      try {
        result = await callHookWithRoot(tmpDir);
      } catch (e) {
        threw = true;
      }

      assertTrue(!threw, 'hook must NOT throw when active-worktree.json is empty');
      assertTrue(result !== null && result !== undefined, 'result must be defined on empty file');

      // No worktree warning should appear for empty/unparseable content
      const ctx = result &&
        result.hookSpecificOutput &&
        result.hookSpecificOutput.additionalContext;

      if (ctx) {
        assertNotContains(
          ctx,
          'Worktree active',
          'additionalContext must NOT contain worktree warning when file is empty'
        );
      }
    } finally {
      cleanup();
    }
  });

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests();
