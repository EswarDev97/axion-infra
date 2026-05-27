#!/usr/bin/env node
/**
 * Test: auto-artifact-creator.js widened scope filter
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-19)
 * Follow-up: Phase 0 Option (a) — unblock the 0-row artifact pipeline by
 * widening the PostToolUse scope to include framework-source writes
 * (.aicodepath/skills/*, .aicodepath/agents/*, .aicodepath/hooks/*).
 *
 * TDD RED — these tests MUST fail until the scope filter at line 185 of
 * auto-artifact-creator.js is widened and the detectPhase/detectStage
 * classifiers are extended to classify framework-internal writes.
 *
 * Scenarios:
 *   (p1) .aicodepath/skills/foo/SKILL.md write -> hook INSERTs artifact
 *        with phase='operations', stage='skill'
 *   (p2) .aicodepath/agents/bar.md write -> insert with
 *        phase='operations', stage='agent'
 *   (p3) .aicodepath/hooks/baz.js write -> insert with
 *        phase='operations', stage='hook'
 *   (r1) aicodepath-docs/inception/plans/x.md write -> still INSERTs (regression)
 *   (n1) node_modules/pkg/index.js write -> NOT trackable (0 inserts)
 *   (n2) .aicodepath/skills/foo/SKILL.md + metadata.source='artifact-writer'
 *        -> T2 recursion guard still wins (0 inserts)
 *
 * Uses the same stub pattern as auto-artifact-creator-recursion.test.js
 * to avoid real DB access.
 */

'use strict';

const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', bold: '\x1b[1m' };
let passed = 0;
let failed = 0;

async function testAsync(name, fn) {
  try { await fn(); passed++; console.log(`${colors.green}\u2713${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}\u2717${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`${msg || ''}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg) { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }

const ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(ROOT, '.aicodepath', 'hooks', 'auto-artifact-creator.js');
const ARTIFACT_WRITER_PATH = path.join(ROOT, '.aicodepath', 'lib', 'artifact-writer.js');
const KB_WRITER_PATH = path.join(ROOT, '.aicodepath', 'lib', 'kb-writer.js');

// Stub ArtifactWriter: record insert calls + their (phase, stage) arguments so
// the test can assert classifier output without hitting the real DB.
// Real signature: createArtifact(type, title, content, filePath, crNumber, phase, stage, unit, metadata).
function makeArtifactWriterStub() {
  const inserts = [];
  class StubArtifactWriter {
    constructor() {}
    getArtifactsByPhase() { return []; }
    createArtifact(type, title, content, filePath, crNumber, phase, stage, unit, metadata) {
      inserts.push({ type, title, filePath, phase, stage, unit, metadata });
      return inserts.length;
    }
    close() {}
  }
  return { Stub: StubArtifactWriter, getInserts: () => inserts };
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

function loadHookWithStubs(artifactWriterStub, kbWriterStub) {
  delete require.cache[HOOK_PATH];
  delete require.cache[ARTIFACT_WRITER_PATH];
  delete require.cache[KB_WRITER_PATH];
  require.cache[ARTIFACT_WRITER_PATH] = { id: ARTIFACT_WRITER_PATH, filename: ARTIFACT_WRITER_PATH, loaded: true, exports: artifactWriterStub };
  require.cache[KB_WRITER_PATH] = { id: KB_WRITER_PATH, filename: KB_WRITER_PATH, loaded: true, exports: kbWriterStub };
  return require(HOOK_PATH);
}
function cleanupCache() {
  delete require.cache[HOOK_PATH];
  delete require.cache[ARTIFACT_WRITER_PATH];
  delete require.cache[KB_WRITER_PATH];
}

function buildPayload(file_path, overrides = {}) {
  return { tool_name: 'Write', file_path, ...overrides };
}

console.log(`\n${colors.bold}Auto-Artifact Creator Scope Filter Tests${colors.reset}\n`);

(async () => {
  delete process.env.ACP_SUPPRESS_AUTO_ARTIFACT; // ensure env guard is off for all tests

  await testAsync('(p1) skill path: .aicodepath/skills/foo/SKILL.md inserts with phase=operations stage=skill', async () => {
    const { Stub, getInserts } = makeArtifactWriterStub();
    const hookModule = loadHookWithStubs(Stub, makeKBWriterStub());
    await hookModule.hook(buildPayload('/home/u/proj/.aicodepath/skills/foo/SKILL.md'));
    const inserts = getInserts();
    assertEqual(inserts.length, 1, 'Expected exactly 1 createArtifact call for skill path');
    assertEqual(inserts[0].phase, 'operations', 'Skill writes must be classified as operations phase');
    assertEqual(inserts[0].stage, 'skill', 'Skill writes must get stage=skill');
    cleanupCache();
  });

  await testAsync('(p2) agent path: .aicodepath/agents/bar.md inserts with phase=operations stage=agent', async () => {
    const { Stub, getInserts } = makeArtifactWriterStub();
    const hookModule = loadHookWithStubs(Stub, makeKBWriterStub());
    await hookModule.hook(buildPayload('/home/u/proj/.aicodepath/agents/bar.md'));
    const inserts = getInserts();
    assertEqual(inserts.length, 1, 'Expected exactly 1 createArtifact call for agent path');
    assertEqual(inserts[0].phase, 'operations', 'Agent writes must be classified as operations phase');
    assertEqual(inserts[0].stage, 'agent', 'Agent writes must get stage=agent');
    cleanupCache();
  });

  await testAsync('(p3) hook path: .aicodepath/hooks/baz.js inserts with phase=operations stage=hook', async () => {
    const { Stub, getInserts } = makeArtifactWriterStub();
    const hookModule = loadHookWithStubs(Stub, makeKBWriterStub());
    await hookModule.hook(buildPayload('/home/u/proj/.aicodepath/hooks/baz.js'));
    const inserts = getInserts();
    assertEqual(inserts.length, 1, 'Expected exactly 1 createArtifact call for hook path');
    assertEqual(inserts[0].phase, 'operations', 'Hook writes must be classified as operations phase');
    assertEqual(inserts[0].stage, 'hook', 'Hook writes must get stage=hook');
    cleanupCache();
  });

  await testAsync('(r1) regression: aicodepath-docs/ writes still insert', async () => {
    const { Stub, getInserts } = makeArtifactWriterStub();
    const hookModule = loadHookWithStubs(Stub, makeKBWriterStub());
    await hookModule.hook(buildPayload('/home/u/proj/aicodepath-docs/inception/plans/my-plan.md'));
    assertEqual(getInserts().length, 1, 'Pre-existing aicodepath-docs/ scope must still produce inserts');
    cleanupCache();
  });

  await testAsync('(n1) negative: node_modules path is NOT trackable', async () => {
    const { Stub, getInserts } = makeArtifactWriterStub();
    const hookModule = loadHookWithStubs(Stub, makeKBWriterStub());
    await hookModule.hook(buildPayload('/home/u/proj/node_modules/pkg/index.js'));
    assertEqual(getInserts().length, 0, 'node_modules writes must not trigger artifact INSERTs');
    cleanupCache();
  });

  await testAsync('(n2) negative: T2 recursion guard still wins for framework paths', async () => {
    const { Stub, getInserts } = makeArtifactWriterStub();
    const hookModule = loadHookWithStubs(Stub, makeKBWriterStub());
    const payload = buildPayload('/home/u/proj/.aicodepath/skills/foo/SKILL.md', { metadata: { source: 'artifact-writer' } });
    await hookModule.hook(payload);
    assertEqual(getInserts().length, 0, 'metadata.source=artifact-writer must short-circuit even for newly-tracked paths');
    cleanupCache();
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
