/**
 * Test: graph-bridge.js
 *
 * Tests for the JS utility that invokes ast_parser.py for graph indexing operations.
 */

const path = require('path');

// Point AICODEPATH_GRAPH_SCRIPT at the mock fixture so tests never depend on the real parser
const FIXTURE_SCRIPT = path.join(__dirname, 'fixtures', 'mock_parser.py');
process.env.AICODEPATH_GRAPH_SCRIPT = FIXTURE_SCRIPT;

const { invokePython, diffReindex, reindexFile } = require('../hooks/lib/graph-bridge');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  const result = fn();
  // Support async tests
  if (result && typeof result.then === 'function') {
    return result
      .then(() => { passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); })
      .catch((e) => { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); });
  }
  passed++;
  console.log(`${colors.green}✓${colors.reset} ${name}`);
  return Promise.resolve();
}

function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${v}`); }
function assertNull(v, msg = '') { if (v !== null) throw new Error(msg || `Expected null, got ${JSON.stringify(v)}`); }

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {

  // 1. Non-existent script → returns null (does not throw)
  await test('invokePython: bad script path → returns null (no throw)', async () => {
    const saved = process.env.AICODEPATH_GRAPH_SCRIPT;
    process.env.AICODEPATH_GRAPH_SCRIPT = '/nonexistent/path/no_such_parser.py';
    // Re-require won't re-eval the module-level const since module is cached;
    // We need to call invokePython directly — it uses the SCRIPT_PATH computed at load time.
    // So we test this via a fresh require with cleared cache.
    delete require.cache[require.resolve('../hooks/lib/graph-bridge')];
    const bridge = require('../hooks/lib/graph-bridge');
    const result = await bridge.invokePython(['--index', '.']);
    process.env.AICODEPATH_GRAPH_SCRIPT = saved;
    // Restore the original module in cache
    delete require.cache[require.resolve('../hooks/lib/graph-bridge')];
    assertNull(result, 'Should return null for non-existent script');
  });

  // Re-require graph-bridge with the fixture script env var set
  delete require.cache[require.resolve('../hooks/lib/graph-bridge')];
  process.env.AICODEPATH_GRAPH_SCRIPT = FIXTURE_SCRIPT;
  const bridge = require('../hooks/lib/graph-bridge');

  // 2. Very short timeout → returns null (no throw)
  await test('invokePython: 1ms timeout → returns null (no throw)', async () => {
    const result = await bridge.invokePython(['--index', '.'], { timeout: 1 });
    assertNull(result, 'Should return null on timeout');
  });

  // 3. --index args → returns parsed JSON stats object
  await test('invokePython: --index args → returns parsed JSON', async () => {
    const result = await bridge.invokePython(['--index', '.', '--db-path', '/tmp/test.db']);
    assertTrue(result !== null, 'Should return non-null result');
    assertEqual(result.indexed, 1, 'indexed count');
    assertEqual(result.entities, 5, 'entities count');
    assertEqual(result.relations, 3, 'relations count');
  });

  // 4. --reindex args → returns parsed JSON
  await test('invokePython: --reindex args → returns parsed JSON', async () => {
    const result = await bridge.invokePython(['--reindex', '/some/file.js']);
    assertTrue(result !== null, 'Should return non-null result');
    assertEqual(result.indexed, 1, 'indexed count');
    assertEqual(result.entities, 2, 'entities count');
  });

  // 5. diffReindex convenience → calls --diff-reindex, returns JSON
  await test('diffReindex: calls --diff-reindex, returns JSON result', async () => {
    const result = await bridge.diffReindex('/tmp/test.db');
    assertTrue(result !== null, 'diffReindex should return non-null');
    assertEqual(result.indexed, 0, 'indexed count should be 0 for diff-reindex');
    assertEqual(result.entities, 0, 'entities should be 0');
  });

  // 6. reindexFile convenience → calls --reindex <filePath>, returns JSON
  await test('reindexFile: calls --reindex with filePath, returns JSON result', async () => {
    const result = await bridge.reindexFile('/some/file.js', '/tmp/test.db');
    assertTrue(result !== null, 'reindexFile should return non-null');
    assertEqual(result.indexed, 1, 'indexed count');
    assertEqual(result.relations, 1, 'relations count');
  });

  // 7. Unknown args (no matching flag) → exit code 1 → returns null
  await test('invokePython: exit code 1 → returns null', async () => {
    const result = await bridge.invokePython(['--unknown-flag']);
    assertNull(result, 'Should return null when script exits with non-zero code');
  });

  // 8. Parse error handling: script that outputs non-JSON
  await test('invokePython: non-JSON stdout → returns null', async () => {
    // Use python3 inline to output bad JSON
    const saved = process.env.AICODEPATH_GRAPH_SCRIPT;
    const python = process.env.AICODEPATH_PYTHON || 'python3';
    // Create a tiny inline script via env var override
    // We'll use a fixture approach: the mock_parser exits 1 for unknown args,
    // but we want to test stdout parse failure. Use a separate temp approach.
    // Test with a script that prints non-JSON text via python3 -c
    // Override AICODEPATH_GRAPH_SCRIPT temporarily with a script that prints bad output
    const { execFile } = require('child_process');
    const { promisify } = require('util');

    // We test indirectly: if the script returns exit 0 but stdout is not JSON,
    // invokePython should return null. We'll temporarily point to a script that does that.
    const fs = require('fs');
    const os = require('os');
    const tmpScript = path.join(os.tmpdir(), 'bad_output_parser.py');
    fs.writeFileSync(tmpScript, 'import sys\nprint("not valid json")\nsys.exit(0)\n');

    delete require.cache[require.resolve('../hooks/lib/graph-bridge')];
    process.env.AICODEPATH_GRAPH_SCRIPT = tmpScript;
    const freshBridge = require('../hooks/lib/graph-bridge');
    const result = await freshBridge.invokePython(['--anything']);

    // Cleanup
    fs.unlinkSync(tmpScript);
    process.env.AICODEPATH_GRAPH_SCRIPT = saved;
    delete require.cache[require.resolve('../hooks/lib/graph-bridge')];

    assertNull(result, 'Should return null when stdout is not valid JSON');
  });

  // 9. diffReindex writes graph-indexed.json flag file on success
  await test('diffReindex: writes graph-indexed.json flag file with entities + indexed_at', async () => {
    const os = require('os');
    const tmpFlagPath = path.join(os.tmpdir(), `graph-indexed-test-${Date.now()}.json`);
    process.env.AICODEPATH_GRAPH_FLAG_PATH = tmpFlagPath;

    // Re-require bridge so it picks up env var at module load time
    delete require.cache[require.resolve('../hooks/lib/graph-bridge')];
    process.env.AICODEPATH_GRAPH_SCRIPT = FIXTURE_SCRIPT;
    const b = require('../hooks/lib/graph-bridge');

    try {
      await b.diffReindex('/tmp/test.db');
      assertTrue(require('fs').existsSync(tmpFlagPath), 'Flag file should exist after diffReindex');
      const flag = JSON.parse(require('fs').readFileSync(tmpFlagPath, 'utf8'));
      assertTrue('entities' in flag, 'Flag file should have entities key');
      assertTrue('indexed_at' in flag, 'Flag file should have indexed_at key');
    } finally {
      delete process.env.AICODEPATH_GRAPH_FLAG_PATH;
      try { require('fs').unlinkSync(tmpFlagPath); } catch {}
      delete require.cache[require.resolve('../hooks/lib/graph-bridge')];
    }
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
