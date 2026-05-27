#!/usr/bin/env node
/**
 * Tests for auto-mode-detector.js
 *
 * Covers: task counting (checkbox + table formats), mode detection thresholds,
 * explicit overrides, parallelCount handling, and formatModeResult output.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { detectMode, countPendingTasks, formatModeResult, MODE_THRESHOLDS } = require('../lib/auto-mode-detector');

let passed = 0;
let failed = 0;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(message || 'Expected true');
}

// --- Helpers ---

/** Write temp tasks file and return its path */
function writeTempTasksFile(content) {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `tasks-test-${Date.now()}.md`);
  fs.writeFileSync(tmpFile, content, 'utf-8');
  return tmpFile;
}

/** Clean up temp file */
function cleanup(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
}

console.log(`\n${colors.bold}Auto Mode Detector Tests${colors.reset}\n`);

// =====================================================================
// countPendingTasks — file input
// =====================================================================

test('countPendingTasks — missing file returns 0', () => {
  const count = countPendingTasks('/nonexistent/path/tasks.md');
  assertEqual(count, 0, 'Missing file should return 0');
});

test('countPendingTasks — null path returns 0', () => {
  const count = countPendingTasks(null);
  assertEqual(count, 0, 'Null path should return 0');
});

test('countPendingTasks — empty file returns 0', () => {
  const tmpFile = writeTempTasksFile('');
  try {
    assertEqual(countPendingTasks(tmpFile), 0, 'Empty file should return 0');
  } finally {
    cleanup(tmpFile);
  }
});

test('countPendingTasks — counts checkbox-style [ ] tasks', () => {
  const content = `
- [ ] Task one
- [x] Task two (done)
- [ ] Task three
- [ ] Task four
`;
  const tmpFile = writeTempTasksFile(content);
  try {
    assertEqual(countPendingTasks(tmpFile), 3, 'Should count 3 unchecked checkboxes');
  } finally {
    cleanup(tmpFile);
  }
});

test('countPendingTasks — does NOT count completed [x] tasks', () => {
  const content = `
- [x] Done task
- [X] Also done
`;
  const tmpFile = writeTempTasksFile(content);
  try {
    assertEqual(countPendingTasks(tmpFile), 0, 'Completed tasks should not be counted');
  } finally {
    cleanup(tmpFile);
  }
});

test('countPendingTasks — counts table-style TODO markers', () => {
  const content = `
| Task | Status |
| Build feature | TODO |
| Write tests | DONE |
| Deploy | PENDING |
`;
  const tmpFile = writeTempTasksFile(content);
  try {
    assertEqual(countPendingTasks(tmpFile), 2, 'Should count TODO + PENDING = 2');
  } finally {
    cleanup(tmpFile);
  }
});

test('countPendingTasks — case-insensitive table markers', () => {
  const content = `
| Feature X | todo |
| Feature Y | pending |
| Feature Z | done |
`;
  const tmpFile = writeTempTasksFile(content);
  try {
    assertEqual(countPendingTasks(tmpFile), 2, 'Should handle lowercase todo/pending');
  } finally {
    cleanup(tmpFile);
  }
});

test('countPendingTasks — combines checkbox + table formats', () => {
  const content = `
- [ ] Checkbox task 1
- [ ] Checkbox task 2
| Table task | TODO |
`;
  const tmpFile = writeTempTasksFile(content);
  try {
    assertEqual(countPendingTasks(tmpFile), 3, 'Should sum checkbox + table markers');
  } finally {
    cleanup(tmpFile);
  }
});

// =====================================================================
// detectMode — auto-detection thresholds
// =====================================================================

test('detectMode — 0 tasks → solo', () => {
  const result = detectMode({ taskCount: 0 });
  assertEqual(result.mode, 'solo', '0 tasks should be solo');
  assertEqual(result.workerCount, 1, 'Solo uses 1 worker');
});

test('detectMode — 1 task → solo', () => {
  const result = detectMode({ taskCount: 1 });
  assertEqual(result.mode, 'solo', '1 task should be solo');
  assertEqual(result.taskCount, 1);
});

test('detectMode — 2 tasks → parallel', () => {
  const result = detectMode({ taskCount: 2 });
  assertEqual(result.mode, 'parallel', '2 tasks should be parallel');
  assertEqual(result.workerCount, 2, '2 tasks = 2 workers');
});

test('detectMode — 3 tasks → parallel', () => {
  const result = detectMode({ taskCount: 3 });
  assertEqual(result.mode, 'parallel', '3 tasks should be parallel');
  assertEqual(result.workerCount, 3, '3 tasks = 3 workers');
});

test('detectMode — 4 tasks → swarm', () => {
  const result = detectMode({ taskCount: 4 });
  assertEqual(result.mode, 'swarm', '4 tasks should be swarm');
});

test('detectMode — 10 tasks → swarm', () => {
  const result = detectMode({ taskCount: 10 });
  assertEqual(result.mode, 'swarm', '10 tasks should be swarm');
  assertEqual(result.workerCount, 3, 'Swarm uses fixed 3 workers');
});

test('detectMode — taskCount exactly at SOLO_MAX threshold (1) → solo', () => {
  const result = detectMode({ taskCount: MODE_THRESHOLDS.SOLO_MAX });
  assertEqual(result.mode, 'solo', 'SOLO_MAX should produce solo');
});

test('detectMode — taskCount at PARALLEL_MAX threshold (3) → parallel', () => {
  const result = detectMode({ taskCount: MODE_THRESHOLDS.PARALLEL_MAX });
  assertEqual(result.mode, 'parallel', 'PARALLEL_MAX should produce parallel');
});

test('detectMode — taskCount one above PARALLEL_MAX (4) → swarm', () => {
  const result = detectMode({ taskCount: MODE_THRESHOLDS.PARALLEL_MAX + 1 });
  assertEqual(result.mode, 'swarm', 'Above PARALLEL_MAX should be swarm');
});

// =====================================================================
// detectMode — explicit overrides
// =====================================================================

test('override: --solo forces solo even with 10 tasks', () => {
  const result = detectMode({ taskCount: 10, override: 'solo' });
  assertEqual(result.mode, 'solo', '--solo override should win');
  assertTrue(result.reason.includes('solo'), 'Reason should mention solo');
});

test('override: --parallel forces parallel even with 10 tasks', () => {
  const result = detectMode({ taskCount: 10, override: 'parallel' });
  assertEqual(result.mode, 'parallel', '--parallel override should win');
});

test('override: --swarm forces swarm even with 1 task', () => {
  const result = detectMode({ taskCount: 1, override: 'swarm' });
  assertEqual(result.mode, 'swarm', '--swarm override should win');
});

test('override: invalid override value is ignored', () => {
  const result = detectMode({ taskCount: 1, override: 'turbo' });
  assertEqual(result.mode, 'solo', 'Invalid override should fall back to auto-detection');
});

// =====================================================================
// detectMode — parallelCount
// =====================================================================

test('parallelCount: explicit worker count implies parallel mode', () => {
  const result = detectMode({ taskCount: 1, parallelCount: 3 });
  assertEqual(result.mode, 'parallel', 'Explicit parallelCount should force parallel');
  assertEqual(result.workerCount, 3, 'Should use specified worker count');
});

test('parallelCount: 0 does NOT force parallel mode', () => {
  const result = detectMode({ taskCount: 1, parallelCount: 0 });
  assertEqual(result.mode, 'solo', 'parallelCount=0 should not override auto-detection');
});

test('override takes priority over parallelCount', () => {
  const result = detectMode({ taskCount: 5, override: 'solo', parallelCount: 3 });
  assertEqual(result.mode, 'solo', 'Explicit override should beat parallelCount');
});

// =====================================================================
// detectMode — result shape
// =====================================================================

test('detectMode result has required fields', () => {
  const result = detectMode({ taskCount: 2 });
  assertTrue('mode' in result, 'result.mode required');
  assertTrue('taskCount' in result, 'result.taskCount required');
  assertTrue('workerCount' in result, 'result.workerCount required');
  assertTrue('reason' in result, 'result.reason required');
  assertTrue(typeof result.reason === 'string', 'reason must be string');
});

// =====================================================================
// formatModeResult
// =====================================================================

test('formatModeResult — solo contains SOLO and icon', () => {
  const result = detectMode({ taskCount: 1 });
  const formatted = formatModeResult(result);
  assertTrue(formatted.includes('SOLO'), 'Should include SOLO');
});

test('formatModeResult — parallel contains PARALLEL and icon', () => {
  const result = detectMode({ taskCount: 2 });
  const formatted = formatModeResult(result);
  assertTrue(formatted.includes('PARALLEL'), 'Should include PARALLEL');
});

test('formatModeResult — swarm contains SWARM and icon', () => {
  const result = detectMode({ taskCount: 4 });
  const formatted = formatModeResult(result);
  assertTrue(formatted.includes('SWARM'), 'Should include SWARM');
});

test('formatModeResult — includes task count', () => {
  const result = detectMode({ taskCount: 3 });
  const formatted = formatModeResult(result);
  assertTrue(formatted.includes('3'), 'Should show task count');
});

// =====================================================================
// MODE_THRESHOLDS export
// =====================================================================

test('MODE_THRESHOLDS exports SOLO_MAX and PARALLEL_MAX', () => {
  assertTrue('SOLO_MAX' in MODE_THRESHOLDS, 'SOLO_MAX should be exported');
  assertTrue('PARALLEL_MAX' in MODE_THRESHOLDS, 'PARALLEL_MAX should be exported');
  assertTrue(MODE_THRESHOLDS.SOLO_MAX < MODE_THRESHOLDS.PARALLEL_MAX, 'SOLO_MAX < PARALLEL_MAX');
});

// Summary
console.log(`\n${colors.bold}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
