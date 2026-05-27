#!/usr/bin/env node
/**
 * Test: auto-artifact-creator.js re-entry guard
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-19)
 * Plan: Batch 1 Task 2
 *
 * TDD RED — these tests MUST fail until the re-entry guard is added to
 * auto-artifact-creator.js. The guard prevents infinite recursion when
 * ArtifactWriter (T10/T11) triggers PostToolUse writes that would re-enter
 * this hook and create duplicate artifact rows.
 *
 * Three scenarios:
 *   (a) ACP_SUPPRESS_AUTO_ARTIFACT=1 env var — hook must return early (0 inserts)
 *   (b) hookData.metadata.source === 'artifact-writer' — hook must return early (0 inserts)
 *   (c) Normal payload (neither signal) — hook still creates artifact (control case)
 *
 * DB access pattern: ArtifactWriter opens the real DB file via getDbPath().
 * To avoid a real DB dependency we monkey-patch ArtifactWriter in the require
 * cache so the hook sees a spy class, then restore after each test.
 */

'use strict';

const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

let passed = 0;
let failed = 0;

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (e) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${e.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(
      `${msg || ''}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(v, msg) {
  if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`);
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(ROOT, '.aicodepath', 'hooks', 'auto-artifact-creator.js');
const ARTIFACT_WRITER_PATH = path.join(ROOT, '.aicodepath', 'lib', 'artifact-writer.js');
const KB_WRITER_PATH = path.join(ROOT, '.aicodepath', 'lib', 'kb-writer.js');

// ---------------------------------------------------------------------------
// Stub infrastructure
//
// ArtifactWriter opens a real SQLite file in its constructor. We inject a
// spy class into the require cache so the hook under test never touches disk.
// KBWriter (used in updateWorkflowState) is also stubbed for the same reason.
// ---------------------------------------------------------------------------

function makeArtifactWriterStub() {
  let insertCount = 0;

  class StubArtifactWriter {
    constructor() {}
    getArtifactsByPhase() {
      // Return empty array so the hook always proceeds to the insert path
      return [];
    }
    createArtifact() {
      insertCount++;
      return 1; // fake artifact ID
    }
    close() {}
  }

  return { Stub: StubArtifactWriter, getInsertCount: () => insertCount };
}

function makeKBWriterStub() {
  return class StubKBWriter {
    constructor() {}
    getPhaseStages() { return []; }
    initializePhaseStages() {}
    updateStageStatus() {}
    close() {}
  };
}

/**
 * Load a fresh copy of the hook module with stubs injected.
 * Clears the require cache for hook + dependencies before each load so
 * module-level state is fully re-evaluated.
 */
function loadHookWithStubs(artifactWriterStub, kbWriterStub) {
  delete require.cache[HOOK_PATH];
  delete require.cache[ARTIFACT_WRITER_PATH];
  delete require.cache[KB_WRITER_PATH];

  // Inject stubs under their real resolved paths
  require.cache[ARTIFACT_WRITER_PATH] = {
    id: ARTIFACT_WRITER_PATH,
    filename: ARTIFACT_WRITER_PATH,
    loaded: true,
    exports: artifactWriterStub,
  };
  require.cache[KB_WRITER_PATH] = {
    id: KB_WRITER_PATH,
    filename: KB_WRITER_PATH,
    loaded: true,
    exports: kbWriterStub,
  };

  return require(HOOK_PATH);
}

function cleanupCache() {
  delete require.cache[HOOK_PATH];
  delete require.cache[ARTIFACT_WRITER_PATH];
  delete require.cache[KB_WRITER_PATH];
}

// ---------------------------------------------------------------------------
// Test payload helpers
//
// A Write to aicodepath-docs/inception/plans/ is the canonical triggering path.
// ---------------------------------------------------------------------------

const TRIGGERING_FILE = '/home/user/project/aicodepath-docs/inception/plans/my-plan.md';

function buildPayload(overrides = {}) {
  return {
    tool_name: 'Write',
    file_path: TRIGGERING_FILE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log(`\n${colors.bold}Auto-Artifact Creator Re-entry Guard Tests${colors.reset}\n`);

(async () => {

  // ── (a) ACP_SUPPRESS_AUTO_ARTIFACT=1 env var ─────────────────────────────
  //
  // The env var must be SET when the hook function executes (call-time check,
  // not module-load-time). Load stubs first, then set env var, call hook,
  // then restore env var.

  await testAsync('(a) env guard: ACP_SUPPRESS_AUTO_ARTIFACT=1 causes hook to return early with 0 inserts', async () => {
    const { Stub, getInsertCount } = makeArtifactWriterStub();
    const kbStub = makeKBWriterStub();
    const hookModule = loadHookWithStubs(Stub, kbStub);

    const prevEnv = process.env.ACP_SUPPRESS_AUTO_ARTIFACT;
    process.env.ACP_SUPPRESS_AUTO_ARTIFACT = '1';
    let result;
    try {
      result = await hookModule.hook(buildPayload());
    } finally {
      if (prevEnv === undefined) delete process.env.ACP_SUPPRESS_AUTO_ARTIFACT;
      else process.env.ACP_SUPPRESS_AUTO_ARTIFACT = prevEnv;
    }

    assertEqual(
      getInsertCount(),
      0,
      'ACP_SUPPRESS_AUTO_ARTIFACT=1 must prevent createArtifact from being called'
    );
    assertTrue(
      result !== null && typeof result === 'object',
      'Hook must still return an object when suppressed via env var'
    );

    cleanupCache();
  });

  // ── (b) metadata.source === 'artifact-writer' guard ──────────────────────
  //
  // The payload carries metadata.source = 'artifact-writer' at the top level
  // of the params object (same level as file_path / tool_name).

  await testAsync('(b) metadata guard: params.metadata.source === "artifact-writer" causes hook to return early with 0 inserts', async () => {
    delete process.env.ACP_SUPPRESS_AUTO_ARTIFACT; // ensure env path is OFF

    const { Stub, getInsertCount } = makeArtifactWriterStub();
    const kbStub = makeKBWriterStub();
    const hookModule = loadHookWithStubs(Stub, kbStub);

    const payload = buildPayload({ metadata: { source: 'artifact-writer' } });
    const result = await hookModule.hook(payload);

    assertEqual(
      getInsertCount(),
      0,
      'metadata.source="artifact-writer" must prevent createArtifact from being called'
    );
    assertTrue(
      result !== null && typeof result === 'object',
      'Hook must still return an object when suppressed via metadata'
    );

    cleanupCache();
  });

  // ── (c) Normal payload — control case ────────────────────────────────────
  //
  // Neither guard signal is present. The hook must behave normally and call
  // createArtifact at least once. This verifies the guard doesn't over-fire.

  await testAsync('(c) control: normal payload (no guard signals) still calls createArtifact', async () => {
    delete process.env.ACP_SUPPRESS_AUTO_ARTIFACT; // ensure env path is OFF

    const { Stub, getInsertCount } = makeArtifactWriterStub();
    const kbStub = makeKBWriterStub();
    const hookModule = loadHookWithStubs(Stub, kbStub);

    const result = await hookModule.hook(buildPayload());

    assertTrue(
      getInsertCount() >= 1,
      `Normal payload must call createArtifact (guard regressed normal operation). ` +
      `Got ${getInsertCount()} calls.`
    );
    assertTrue(
      result !== null && typeof result === 'object',
      'Hook must return an object for normal payloads'
    );

    cleanupCache();
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${colors.bold}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    console.log(
      `${colors.yellow}RED phase: guard not yet implemented in auto-artifact-creator.js${colors.reset}`
    );
  }
  process.exit(failed > 0 ? 1 : 0);

})();
