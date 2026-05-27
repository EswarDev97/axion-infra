/**
 * Tests for graph-context-nudge.js (PreToolUse hook)
 *
 * Cases:
 *  1. flag file missing      → returns empty object (no additionalContext)
 *  2. flag file present      → returns additionalContext with graph stats
 *  3. feature flag off       → returns empty object
 *  4. flag file parse error  → returns empty object (fail-safe)
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// ── Test runner ───────────────────────────────────────────────────────────────
const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  const result = fn();
  if (result && typeof result.then === 'function') {
    return result
      .then(() => { passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); })
      .catch((e) => { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); });
  }
  passed++;
  console.log(`${colors.green}✓${colors.reset} ${name}`);
  return Promise.resolve();
}

function assertTrue(v, msg = '') {
  if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`);
}
function assertEqual(a, b, msg = '') {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gcn-test-'));
}

function writeFlag(projectRoot, content) {
  const stateDir = path.join(projectRoot, 'aicodepath-docs', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'graph-indexed.json'), content);
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Stub path-resolver to point at our temp root ──────────────────────────────

const Module = require('module');
const origResolve = Module._resolveFilename.bind(Module);

function withMockedRoot(root, flagEnabled, fn) {
  // Clear module cache so hook re-evaluates env
  Object.keys(require.cache).forEach(k => {
    if (k.includes('graph-context-nudge') || k.includes('feature-flags') || k.includes('path-resolver')) {
      delete require.cache[k];
    }
  });

  // Patch path-resolver
  const pathResolverPath = require.resolve('../lib/path-resolver');
  require.cache[pathResolverPath] = {
    id: pathResolverPath,
    filename: pathResolverPath,
    loaded: true,
    exports: {
      findProjectRoot: () => root,
      getDbPath: () => path.join(root, 'aicodepath-docs', 'aicodepath.db'),
    },
  };

  // Patch feature-flags
  const ffPath = require.resolve('../lib/feature-flags');
  require.cache[ffPath] = {
    id: ffPath,
    filename: ffPath,
    loaded: true,
    exports: { isEnabled: (name) => name === 'graph_nudge' ? flagEnabled : true },
  };

  // Re-require hook with patched deps
  delete require.cache[require.resolve('../hooks/graph-context-nudge')];
  const hook = require('../hooks/graph-context-nudge');

  try {
    return fn(hook);
  } finally {
    // Restore
    delete require.cache[pathResolverPath];
    delete require.cache[ffPath];
    delete require.cache[require.resolve('../hooks/graph-context-nudge')];
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const allTests = [];

allTests.push(test('flag missing → hook returns empty object (no additionalContext)', async () => {
  const root = makeTempRoot();
  try {
    const result = await withMockedRoot(root, true, ({ hook }) =>
      hook({ tool_name: 'Glob', tool_input: { pattern: '**/*.js' } })
    );
    // No additionalContext when flag is absent
    assertTrue(!result.hookSpecificOutput, 'Should not have hookSpecificOutput when flag missing');
  } finally {
    cleanup(root);
  }
}));

allTests.push(test('flag present → hook injects additionalContext with entity count', async () => {
  const root = makeTempRoot();
  try {
    writeFlag(root, JSON.stringify({ entities: 42, relations: 100, indexed_at: new Date().toISOString() }));
    const result = await withMockedRoot(root, true, ({ hook }) =>
      hook({ tool_name: 'Grep', tool_input: { pattern: 'foo' } })
    );
    assertTrue(result.hookSpecificOutput, 'Should have hookSpecificOutput when flag present');
    const ctx = result.hookSpecificOutput.additionalContext;
    assertTrue(typeof ctx === 'string' && ctx.length > 0, 'additionalContext must be a non-empty string');
    assertTrue(ctx.includes('42'), 'Context should mention entity count 42');
    assertTrue(ctx.includes('callers_of'), 'Context should mention callers_of tool');
  } finally {
    cleanup(root);
  }
}));

allTests.push(test('feature flag off → hook returns empty object', async () => {
  const root = makeTempRoot();
  try {
    writeFlag(root, JSON.stringify({ entities: 10, relations: 5, indexed_at: new Date().toISOString() }));
    const result = await withMockedRoot(root, false, ({ hook }) =>
      hook({ tool_name: 'Glob', tool_input: { pattern: '*.ts' } })
    );
    assertTrue(!result.hookSpecificOutput, 'Should not inject when feature flag is off');
  } finally {
    cleanup(root);
  }
}));

allTests.push(test('flag file parse error → hook returns empty object (fail-safe)', async () => {
  const root = makeTempRoot();
  try {
    writeFlag(root, 'NOT VALID JSON {{{');
    const result = await withMockedRoot(root, true, ({ hook }) =>
      hook({ tool_name: 'Grep', tool_input: { pattern: 'bar' } })
    );
    assertTrue(!result.hookSpecificOutput, 'Parse error should result in empty pass-through');
  } finally {
    cleanup(root);
  }
}));

// ── Summary ───────────────────────────────────────────────────────────────────
Promise.all(allTests).then(() => {
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
  if (failed > 0) process.exit(1);
});
