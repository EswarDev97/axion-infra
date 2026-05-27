/**
 * Test: SuggesterLock — parallel-write serialization (SPIKE S1)
 *
 * RED phase: all 7 tests fail because .aicodepath/lib/suggester-lock.js
 * does not exist yet.
 *
 * Run: node .aicodepath/__tests__/suggester-lock.test.js
 * Expected (RED): 7 failed, 0 passed
 * Expected (GREEN): 7 passed, 0 failed
 */

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

// Module under test — does not exist during RED phase
let SuggesterLock;
try {
  SuggesterLock = require('../lib/suggester-lock');
} catch (e) {
  console.warn('[RED phase] suggester-lock.js not found — expected during TDD RED:', e.message);
}

// ── Async-capable test runner ─────────────────────────────────────────────

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;
const pendingTests = [];

function test(name, fn) { pendingTests.push({ name, fn }); }
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }

// ── Helpers ───────────────────────────────────────────────────────────────

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'suggester-lock-test-'));
}

function makeSubDirs(tmpDir) {
  fs.mkdirSync(path.join(tmpDir, 'generated'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'packs', 'specialists'), { recursive: true });
}

function makeLockOpts(tmpDir) {
  return {
    lockFile: path.join(tmpDir, '.suggester.lock'),
    queueFile: path.join(tmpDir, 'generated', '.suggester-queue.jsonl'),
    projectRoot: tmpDir,
  };
}

function makeLock(tmpDir) {
  if (!SuggesterLock) throw new Error("Cannot find module '../lib/suggester-lock' — RED phase");
  return new SuggesterLock(makeLockOpts(tmpDir));
}

function cleanup(tmpDir) {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {
    console.warn('[cleanup] Failed to remove temp dir:', e.message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pluginJson(agents = []) {
  return JSON.stringify({ name: 'specialists', agents });
}

/**
 * Serialized concurrent writer — acquires lock, queues one edit, releases.
 * Errors rethrown with context so Promise.all rejects on any failure.
 */
async function serialWrite(opts, edit) {
  try {
    const lock = new SuggesterLock(opts);
    await lock.acquireLock();
    lock.queueEdit(edit);
    await lock.releaseLock();
  } catch (e) {
    throw new Error(`serialWrite failed [${edit.targetPath}]: ${e.message}`);
  }
}

// ── Test 1: Single writer — acquires, queues, applies ────────────────────

test('single writer acquires lock, queues 1 edit, applies — file contains expected entry', async () => {
  const tmpDir = makeTempDir();
  makeSubDirs(tmpDir);

  const pluginPath = path.join(tmpDir, 'packs', 'specialists', 'plugin.json');
  fs.writeFileSync(pluginPath, pluginJson([]));

  const lock = makeLock(tmpDir);
  await lock.acquireLock();
  lock.queueEdit({
    targetFile: pluginPath,
    targetPath: '.agents',
    value: { path: '../../../agents/new-agent.md' },
    mergeStrategy: 'append',
  });
  await lock.applyBatchMerge();
  await lock.releaseLock();

  const result = readJson(pluginPath);
  assertEqual(result.agents.length, 1, 'Should have exactly 1 agent after single edit');
  assertEqual(result.agents[0].path, '../../../agents/new-agent.md');

  cleanup(tmpDir);
});

// ── Test 2: 4 concurrent writers — no duplicates, no truncation ──────────

test('4 concurrent writers each queue 1 edit — exactly 4 entries, no duplicates, no truncation', async () => {
  const tmpDir = makeTempDir();
  makeSubDirs(tmpDir);

  const pluginPath = path.join(tmpDir, 'packs', 'specialists', 'plugin.json');
  fs.writeFileSync(pluginPath, pluginJson([]));

  const opts = makeLockOpts(tmpDir);
  const agents = ['agent-alpha.md', 'agent-beta.md', 'agent-gamma.md', 'agent-delta.md'];

  await Promise.all(agents.map(agentFile => serialWrite(opts, {
    targetFile: pluginPath,
    targetPath: '.agents',
    value: { path: agentFile },
    mergeStrategy: 'append',
  })));

  const mergeLock = new SuggesterLock(opts);
  await mergeLock.applyBatchMerge();

  const result = readJson(pluginPath);
  assertEqual(result.agents.length, 4, `Expected 4 agents, got ${result.agents.length}`);
  for (const agentFile of agents) {
    assertTrue(result.agents.some(a => a.path === agentFile), `Missing entry: ${agentFile}`);
  }

  cleanup(tmpDir);
});

// ── Test 3: Lock contention ───────────────────────────────────────────────
//
// Verification strategy: use a short acquireLock timeout (80 ms) while
// writer 1 holds the lock — expect a timeout error. Then release writer 1
// and verify writer 2 can acquire (no sleep needed).

test('writer 2 times out while lock is held; succeeds after writer 1 releases', async () => {
  const tmpDir = makeTempDir();
  makeSubDirs(tmpDir);

  const opts = makeLockOpts(tmpDir);
  const lock1 = new SuggesterLock(opts);
  const lock2 = new SuggesterLock(opts);

  await lock1.acquireLock();

  // With lock held, writer 2 must time out
  let contended = false;
  const contendResult = await lock2.acquireLock(80)
    .then(() => { contended = false; return 'acquired'; })
    .catch((e) => { contended = true; return `timeout: ${e.message}`; });
  assertTrue(contended, `Writer 2 should time out while lock is held — got: ${contendResult}`);

  // Release — writer 2 should now succeed
  await lock1.releaseLock();

  try {
    await lock2.acquireLock(2000);
    await lock2.releaseLock();
  } catch (e) {
    throw new Error(`Writer 2 should acquire after lock1 released, but got: ${e.message}`);
  }

  cleanup(tmpDir);
});

// ── Test 4: Crash recovery — stale lock with dead PID is released ─────────

test('stale lock file with PID of dead process is released — new lock acquired', async () => {
  const tmpDir = makeTempDir();
  makeSubDirs(tmpDir);

  const lockFile = path.join(tmpDir, '.suggester.lock');
  // PID 9999999 is virtually guaranteed not to exist
  fs.writeFileSync(lockFile, JSON.stringify({ pid: 9999999, acquired: Date.now() - 60000 }));

  const lock = makeLock(tmpDir);
  const acquireResult = await lock.acquireLock(2000)
    .then(() => lock.releaseLock().then(() => ({ ok: true })))
    .catch(e => ({ ok: false, error: e.message }));

  assertTrue(acquireResult.ok, `acquireLock should succeed on stale PID, but threw: ${acquireResult.error}`);

  cleanup(tmpDir);
});

// ── Test 5: 4 surfaces — all land correctly ───────────────────────────────

test('edits targeting 4 surfaces all land correctly with 4 concurrent writers', async () => {
  const tmpDir = makeTempDir();
  makeSubDirs(tmpDir);

  const hooksLibDir = path.join(tmpDir, 'hooks', 'lib');
  const skillDir = path.join(tmpDir, 'skills', 'using-aicodepath');
  fs.mkdirSync(hooksLibDir, { recursive: true });
  fs.mkdirSync(skillDir, { recursive: true });

  // Surface 1: agent-suggester.js DOMAIN_MAPPING
  const suggesterPath = path.join(hooksLibDir, 'agent-suggester.js');
  fs.writeFileSync(suggesterPath, [
    'const DOMAIN_MAPPING = {',
    '  "python": ["aicodepath-python-expert"]',
    '};',
    'module.exports = { DOMAIN_MAPPING };',
  ].join('\n') + '\n');

  // Surface 2: agent-taxonomy.md table
  const taxonomyPath = path.join(tmpDir, 'agent-taxonomy.md');
  fs.writeFileSync(taxonomyPath,
    '| Agent | Component | Phase | When |\n|---|---|---|---|\n| existing-agent | all | plan | existing |\n');

  // Surface 3: using-aicodepath/SKILL.md Direct Invocation table
  const skillPath = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(skillPath,
    '# Using AICodePath\n\n### Agents (Direct Invocation)\n| Trigger | Agent |\n|---------|-------|\n| existing trigger | existing-agent |\n');

  // Surface 4: plugin.json .agents array
  const pluginPath = path.join(tmpDir, 'packs', 'specialists', 'plugin.json');
  fs.writeFileSync(pluginPath, pluginJson([]));

  const opts = makeLockOpts(tmpDir);

  await Promise.all([
    serialWrite(opts, { targetFile: pluginPath, targetPath: '.agents', value: { path: '../../../agents/new-agent-1.md' }, mergeStrategy: 'append' }),
    serialWrite(opts, { targetFile: taxonomyPath, targetPath: 'table-row', value: '| new-agent-2 | all | construction | for testing |', mergeStrategy: 'append' }),
    serialWrite(opts, { targetFile: skillPath, targetPath: 'table-row', value: '| new trigger | new-agent-3 |', mergeStrategy: 'append' }),
    serialWrite(opts, { targetFile: suggesterPath, targetPath: 'DOMAIN_MAPPING.testing', value: 'new-agent-4', mergeStrategy: 'append' }),
  ]);

  const mergeLock = new SuggesterLock(opts);
  await mergeLock.applyBatchMerge();

  const pluginResult = readJson(pluginPath);
  assertEqual(pluginResult.agents.length, 1, 'plugin.json should have 1 new agent');

  assertTrue(fs.readFileSync(taxonomyPath, 'utf8').includes('new-agent-2'), 'taxonomy.md should contain new-agent-2 row');
  assertTrue(fs.readFileSync(skillPath, 'utf8').includes('new-agent-3'), 'SKILL.md should contain new-agent-3 row');
  assertTrue(fs.readFileSync(suggesterPath, 'utf8').includes('new-agent-4'), 'agent-suggester.js should contain new-agent-4 DOMAIN_MAPPING entry');

  cleanup(tmpDir);
});

// ── Test 6: Same-file JSON contention — both entries land ────────────────

test('2 concurrent writers appending to same plugin.json — both entries land (not last-writer-wins)', async () => {
  const tmpDir = makeTempDir();
  makeSubDirs(tmpDir);

  const pluginPath = path.join(tmpDir, 'packs', 'specialists', 'plugin.json');
  fs.writeFileSync(pluginPath, pluginJson([{ path: '../../../agents/existing.md' }]));

  const opts = makeLockOpts(tmpDir);

  await Promise.all([
    serialWrite(opts, { targetFile: pluginPath, targetPath: '.agents', value: { path: '../../../agents/newcomer-1.md' }, mergeStrategy: 'append' }),
    serialWrite(opts, { targetFile: pluginPath, targetPath: '.agents', value: { path: '../../../agents/newcomer-2.md' }, mergeStrategy: 'append' }),
  ]);

  const mergeLock = new SuggesterLock(opts);
  await mergeLock.applyBatchMerge();

  const result = readJson(pluginPath);
  assertEqual(result.agents.length, 3, `Expected 3 agents (1 existing + 2 new), got ${result.agents.length}`);
  const paths = result.agents.map(a => a.path);
  assertTrue(paths.includes('../../../agents/existing.md'), 'Original entry must be preserved');
  assertTrue(paths.includes('../../../agents/newcomer-1.md'), 'Writer 1 entry must be present');
  assertTrue(paths.includes('../../../agents/newcomer-2.md'), 'Writer 2 entry must be present');

  cleanup(tmpDir);
});

// ── Test 7: DOMAIN_MAPPING key collision — append semantics ──────────────

test('2 concurrent writers adding different agents under same DOMAIN_MAPPING key — both appear (append, not replace)', async () => {
  const tmpDir = makeTempDir();
  makeSubDirs(tmpDir);

  const hooksLibDir = path.join(tmpDir, 'hooks', 'lib');
  fs.mkdirSync(hooksLibDir, { recursive: true });

  const suggesterPath = path.join(hooksLibDir, 'agent-suggester.js');
  fs.writeFileSync(suggesterPath, [
    'const DOMAIN_MAPPING = {',
    '  "python": ["aicodepath-python-expert"]',
    '};',
    'module.exports = { DOMAIN_MAPPING };',
  ].join('\n') + '\n');

  const opts = makeLockOpts(tmpDir);

  await Promise.all([
    serialWrite(opts, { targetFile: suggesterPath, targetPath: 'DOMAIN_MAPPING.python', value: 'aicodepath-django-expert', mergeStrategy: 'append' }),
    serialWrite(opts, { targetFile: suggesterPath, targetPath: 'DOMAIN_MAPPING.python', value: 'aicodepath-fastapi-expert', mergeStrategy: 'append' }),
  ]);

  const mergeLock = new SuggesterLock(opts);
  await mergeLock.applyBatchMerge();

  const content = fs.readFileSync(suggesterPath, 'utf8');
  assertTrue(content.includes('aicodepath-python-expert'), 'Original python expert must be preserved');
  assertTrue(content.includes('aicodepath-django-expert'), 'django-expert must be appended to python key');
  assertTrue(content.includes('aicodepath-fastapi-expert'), 'fastapi-expert must be appended to python key');

  cleanup(tmpDir);
});

// ── Runner ────────────────────────────────────────────────────────────────

async function runAllTests() {
  for (const { name, fn } of pendingTests) {
    try {
      await fn();
      passed++;
      console.log(`${colors.green}✓${colors.reset} ${name}`);
    } catch (e) {
      failed++;
      console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`);
    }
  }
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
  if (failed > 0) process.exit(1);
}

runAllTests();
