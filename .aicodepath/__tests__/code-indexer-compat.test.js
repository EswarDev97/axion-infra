/**
 * Test: code-indexer.js — Python AST delegation compatibility
 *
 * Verifies that CodeIndexer.indexFile() delegates to graph-bridge.js reindexFile()
 * and falls back to the original regex implementation when Python returns null or throws.
 */

'use strict';

const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;
const testPromises = [];

function test(name, fn) {
  const promise = Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log(`${colors.green}✓${colors.reset} ${name}`);
    })
    .catch((e) => {
      failed++;
      console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`);
    });
  testPromises.push(promise);
  return promise;
}

function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') {
  if (!v) throw new Error(msg || `Expected truthy, got ${v}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load a fresh CodeIndexer with a mocked graph-bridge.
 * Uses require.cache injection so no changes to the module under test are needed
 * for dependency substitution.
 */
function loadCodeIndexerWithMock(graphBridgeMock) {
  // Resolve the canonical paths so cache keys match
  const graphBridgePath = require.resolve('../hooks/lib/graph-bridge');
  const codeIndexerPath = require.resolve('../lib/code-indexer');

  // Clear both modules from cache
  delete require.cache[graphBridgePath];
  delete require.cache[codeIndexerPath];

  // Inject the mock into the cache under graph-bridge's path
  require.cache[graphBridgePath] = {
    id: graphBridgePath,
    filename: graphBridgePath,
    loaded: true,
    exports: graphBridgeMock
  };

  // Now require CodeIndexer — it will pick up the mock via the injected cache entry
  const CodeIndexer = require('../lib/code-indexer');

  return CodeIndexer;
}

/**
 * Create a minimal CodeIndexer instance without a real DB (tests only need indexFile
 * to attempt delegation; we stub the constructor-level DB via require.cache injection).
 * For tests where Python returns a valid result, indexFile should return without
 * touching the DB (early return after delegation succeeds).
 */
function makeInstance(CodeIndexer) {
  // Stub out the Database constructor so no real SQLite connection is needed
  const dbKey = require.resolve('better-sqlite3');
  const origDb = require.cache[dbKey];

  const fakeDb = function() {
    return {
      pragma: () => {},
      prepare: () => ({ get: () => null, run: () => ({ lastInsertRowid: 1 }), all: () => [] }),
      close: () => {}
    };
  };

  require.cache[dbKey] = { id: dbKey, filename: dbKey, loaded: true, exports: fakeDb };

  // Also stub path-resolver so it doesn't error when no project root found
  const prKey = require.resolve('../lib/path-resolver');
  const origPr = require.cache[prKey];
  const fakePathResolver = {
    findProjectRoot: () => '/tmp/test-project',
    getDbPath: () => '/tmp/test-project/aicodepath-docs/aicodepath.db'
  };
  require.cache[prKey] = { id: prKey, filename: prKey, loaded: true, exports: fakePathResolver };

  // Re-require CodeIndexer now with stubbed deps
  const codeIndexerPath = require.resolve('../lib/code-indexer');
  delete require.cache[codeIndexerPath];
  const FreshCodeIndexer = require('../lib/code-indexer');

  const instance = new FreshCodeIndexer('/tmp/test-project');

  // Restore originals
  if (origDb) {
    require.cache[dbKey] = origDb;
  } else {
    delete require.cache[dbKey];
  }
  if (origPr) {
    require.cache[prKey] = origPr;
  } else {
    delete require.cache[prKey];
  }

  return instance;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {

  // ── Test 1: indexFile delegates to Python reindexFile ──────────────────────
  await test('indexFile delegates to Python reindexFile', async () => {
    let reindexFileCalled = false;
    let capturedFilePath = null;

    const mockGraphBridge = {
      reindexFile: async (filePath, dbPath) => {
        reindexFileCalled = true;
        capturedFilePath = filePath;
        return { indexed: 1, entities: 2, relations: 1 };
      },
      invokePython: async () => null,
      diffReindex: async () => null
    };

    const CodeIndexer = loadCodeIndexerWithMock(mockGraphBridge);
    const instance = makeInstance(CodeIndexer);

    // Point indexFile at a real file so the fs.existsSync / statSync checks pass
    const realFilePath = path.join(__dirname, 'graph-bridge.test.js');
    const result = await instance.indexFile(realFilePath);

    assertTrue(reindexFileCalled, 'reindexFile should have been called');
    assertTrue(capturedFilePath !== null, 'reindexFile should receive a file path');
    assertTrue(result !== null && result !== undefined, 'indexFile should return a result');
  });

  // ── Test 2: indexFile falls back when Python returns null ──────────────────
  await test('indexFile falls back when Python returns null', async () => {
    const mockGraphBridge = {
      reindexFile: async () => null,
      invokePython: async () => null,
      diffReindex: async () => null
    };

    const CodeIndexer = loadCodeIndexerWithMock(mockGraphBridge);
    const instance = makeInstance(CodeIndexer);

    const realFilePath = path.join(__dirname, 'graph-bridge.test.js');

    // Should not throw — fallback to regex parser
    let threw = false;
    try {
      await instance.indexFile(realFilePath);
    } catch (e) {
      threw = true;
    }

    assertTrue(!threw, `indexFile should not throw when Python returns null, but got error`);
  });

  // ── Test 3: indexFile falls back when Python throws ────────────────────────
  await test('indexFile falls back when Python throws', async () => {
    const mockGraphBridge = {
      reindexFile: async () => { throw new Error('Python unavailable'); },
      invokePython: async () => null,
      diffReindex: async () => null
    };

    const CodeIndexer = loadCodeIndexerWithMock(mockGraphBridge);
    const instance = makeInstance(CodeIndexer);

    const realFilePath = path.join(__dirname, 'graph-bridge.test.js');

    let threw = false;
    try {
      await instance.indexFile(realFilePath);
    } catch (e) {
      threw = true;
    }

    assertTrue(!threw, `indexFile should not throw when Python reindexFile throws`);
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
