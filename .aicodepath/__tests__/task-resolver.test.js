/**
 * Test: task-resolver.js
 *
 * Sprint: Tasks Path Mismatch Fix (2026-04-21)
 * Plan:   aicodepath-docs/plan/2026-04-21-tasks-path-mismatch-fix-plan.md Task 1
 * Design: aicodepath-docs/design/2026-04-21-tasks-path-mismatch-fix-design.md DEC-2/DEC-5
 *
 * TDD RED — must fail BEFORE task-resolver.js is written.
 *
 * Contract asserted:
 *   1. resolveActiveTaskFile() with CR-slug matches the correct file
 *   2. resolveActiveTaskFile() falls back to most-recent-by-date when no CR
 *   3. resolveActiveTaskFile() returns null for empty directory
 *   4. resolveActiveTaskFile() picks most recent mtime among multi-file matches
 *   5. listTaskFiles() returns all files sorted by date prefix descending
 *   6. listTaskFiles(filterSlug) filters by slug
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }
function assertNull(v, msg = '') { if (v !== null) throw new Error(msg || `Expected null, got ${JSON.stringify(v)}`); }

// --- Fixture helpers ---

function createTempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-task-resolver-'));
  const taskDir = path.join(root, 'aicodepath-docs', 'task');
  fs.mkdirSync(taskDir, { recursive: true });
  return { root, taskDir };
}

function addTaskFile(taskDir, filename, delayMs = 0) {
  const filePath = path.join(taskDir, filename);
  fs.writeFileSync(filePath, `# Tasks: ${filename}\n`);
  // Adjust mtime for ordering tests
  if (delayMs) {
    const now = Date.now();
    fs.utimesSync(filePath, new Date(now + delayMs), new Date(now + delayMs));
  }
  return filePath;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

// --- Tests ---

test('should resolve file matching CR-slug', () => {
  const { resolveActiveTaskFile } = require('../lib/task-resolver');
  const { root, taskDir } = createTempProject();
  try {
    addTaskFile(taskDir, '2026-04-21-tasks-path-mismatch-fix-tasks.md');
    addTaskFile(taskDir, '2026-04-20-specialist-review-agents-tasks.md');

    const result = resolveActiveTaskFile({
      projectRoot: root,
      crSlug: 'tasks-path-mismatch-fix'
    });

    assertTrue(result !== null, 'Should find a match');
    assertTrue(result.endsWith('2026-04-21-tasks-path-mismatch-fix-tasks.md'),
      `Should match CR slug file, got: ${result}`);
  } finally { cleanup(root); }
});

test('should fall back to most-recent-by-date when no CR slug', () => {
  const { resolveActiveTaskFile } = require('../lib/task-resolver');
  const { root, taskDir } = createTempProject();
  try {
    addTaskFile(taskDir, '2026-04-19-context-budget-tasks.md');
    addTaskFile(taskDir, '2026-04-21-new-sprint-tasks.md');
    addTaskFile(taskDir, '2026-04-20-middle-sprint-tasks.md');

    const result = resolveActiveTaskFile({ projectRoot: root });

    assertTrue(result !== null, 'Should find most recent');
    assertTrue(result.endsWith('2026-04-21-new-sprint-tasks.md'),
      `Should pick most recent date prefix, got: ${result}`);
  } finally { cleanup(root); }
});

test('should return null for empty directory', () => {
  const { resolveActiveTaskFile } = require('../lib/task-resolver');
  const { root } = createTempProject();
  try {
    const result = resolveActiveTaskFile({ projectRoot: root });
    assertNull(result, 'Empty task dir should return null');
  } finally { cleanup(root); }
});

test('should pick most recent mtime among multiple slug matches', () => {
  const { resolveActiveTaskFile } = require('../lib/task-resolver');
  const { root, taskDir } = createTempProject();
  try {
    // Two files with same slug pattern but different plan suffixes
    addTaskFile(taskDir, '2026-04-06-agent-metadata-sot-plan1-tasks.md', -5000);
    addTaskFile(taskDir, '2026-04-06-agent-metadata-sot-plan2-tasks.md', 5000);

    const result = resolveActiveTaskFile({
      projectRoot: root,
      crSlug: 'agent-metadata-sot'
    });

    assertTrue(result !== null, 'Should find a match');
    assertTrue(result.endsWith('plan2-tasks.md'),
      `Should pick most recent mtime, got: ${path.basename(result)}`);
  } finally { cleanup(root); }
});

test('should return null when directory does not exist', () => {
  const { resolveActiveTaskFile } = require('../lib/task-resolver');
  const root = path.join(os.tmpdir(), 'acp-nonexistent-' + Date.now());
  const result = resolveActiveTaskFile({ projectRoot: root });
  assertNull(result, 'Non-existent dir should return null');
});

test('listTaskFiles should return all files sorted by date desc', () => {
  const { listTaskFiles } = require('../lib/task-resolver');
  const { root, taskDir } = createTempProject();
  try {
    addTaskFile(taskDir, '2026-04-19-alpha-tasks.md');
    addTaskFile(taskDir, '2026-04-21-charlie-tasks.md');
    addTaskFile(taskDir, '2026-04-20-bravo-tasks.md');

    const files = listTaskFiles({ projectRoot: root });

    assertEqual(files.length, 3, 'Should return all 3 files');
    assertTrue(files[0].endsWith('2026-04-21-charlie-tasks.md'), 'First should be most recent');
    assertTrue(files[2].endsWith('2026-04-19-alpha-tasks.md'), 'Last should be oldest');
  } finally { cleanup(root); }
});

test('listTaskFiles with filterSlug should only return matching files', () => {
  const { listTaskFiles } = require('../lib/task-resolver');
  const { root, taskDir } = createTempProject();
  try {
    addTaskFile(taskDir, '2026-04-19-alpha-tasks.md');
    addTaskFile(taskDir, '2026-04-21-alpha-plan2-tasks.md');
    addTaskFile(taskDir, '2026-04-20-bravo-tasks.md');

    const files = listTaskFiles({ projectRoot: root, filterSlug: 'alpha' });

    assertEqual(files.length, 2, 'Should return only alpha matches');
    assertTrue(files.every(f => f.includes('alpha')), 'All should contain slug');
  } finally { cleanup(root); }
});

// --- Summary ---
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
