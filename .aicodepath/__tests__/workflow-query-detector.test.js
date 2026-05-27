#!/usr/bin/env node
/**
 * Tests for workflow-query-detector.js
 *
 * TDD: Written BEFORE the hook exists.
 * All tests should FAIL until the hook is implemented.
 *
 * Run: node .aicodepath/__tests__/workflow-query-detector.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Test harness (async-capable runner, sync or async test fns)
// ---------------------------------------------------------------------------

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

let passed = 0;
let failed = 0;
const suite = [];

function test(name, fn) {
  suite.push({ name, fn });
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, msg) {
  if (!condition) throw new Error(msg || 'Expected true, got false');
}

function assertFalse(condition, msg) {
  if (condition) throw new Error(msg || 'Expected false, got true');
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'acp-wqd-test-'));
}

// ---------------------------------------------------------------------------
// Load module under test
// ---------------------------------------------------------------------------

let isWorkflowQuery = null;
let isDebounced = null;
let workflowQueryDetectorHookImpl = null;

try {
  const mod = require('../hooks/workflow-query-detector');
  isWorkflowQuery = mod.isWorkflowQuery;
  isDebounced = mod.isDebounced;
  workflowQueryDetectorHookImpl = mod.hook || mod.workflowQueryDetectorHookImpl;
} catch (_) {
  // Not yet implemented — all tests will fail
}

// ---------------------------------------------------------------------------
// isWorkflowQuery — positive cases (synchronous)
// ---------------------------------------------------------------------------

test('isWorkflowQuery: detects "how does X work" pattern', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded — implement workflow-query-detector.js');
  assertTrue(
    isWorkflowQuery('how does the OCR jobcard creation workflow work'),
    'Should match "how does X work"'
  );
});

test('isWorkflowQuery: detects "how does X flow" variant', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertTrue(
    isWorkflowQuery('how does the payment flow work'),
    'Should match "how does X flow work"'
  );
});

test('isWorkflowQuery: detects "tell me how X works" pattern', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertTrue(
    isWorkflowQuery('tell me how the authentication module works'),
    'Should match "tell me how X works"'
  );
});

test('isWorkflowQuery: detects "explain the X workflow" pattern', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertTrue(
    isWorkflowQuery('explain the invoice approval workflow'),
    'Should match "explain the X workflow"'
  );
});

test('isWorkflowQuery: detects "walk me through X" pattern', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertTrue(
    isWorkflowQuery('walk me through the order submission process'),
    'Should match "walk me through X"'
  );
});

test('isWorkflowQuery: detects "trace X flow" pattern', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertTrue(
    isWorkflowQuery('trace the request execution flow'),
    'Should match "trace X flow"'
  );
});

test('isWorkflowQuery: detects "what happens when X is triggered" pattern', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertTrue(
    isWorkflowQuery('what happens when the webhook is triggered'),
    'Should match "what happens when X is triggered"'
  );
});

test('isWorkflowQuery: detects "how is X implemented" pattern', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertTrue(
    isWorkflowQuery('how is the session manager implemented'),
    'Should match "how is X implemented"'
  );
});

// ---------------------------------------------------------------------------
// isWorkflowQuery — negative cases (synchronous)
// ---------------------------------------------------------------------------

test('isWorkflowQuery: returns false for empty string', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertFalse(isWorkflowQuery(''), 'Empty string should not match');
});

test('isWorkflowQuery: returns false for null', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertFalse(isWorkflowQuery(null), 'Null should not match');
});

test('isWorkflowQuery: returns false for unrelated coding message', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertFalse(
    isWorkflowQuery('fix the bug in the login form validation'),
    'Unrelated message should not match'
  );
});

test('isWorkflowQuery: returns false for simple greeting', () => {
  assertTrue(isWorkflowQuery !== null, 'Hook module not loaded');
  assertFalse(
    isWorkflowQuery('hello, can you help me write a test?'),
    'Greeting should not match'
  );
});

// ---------------------------------------------------------------------------
// isDebounced (synchronous — uses fs.readFileSync internally)
// ---------------------------------------------------------------------------

test('isDebounced: returns false when state file does not exist', () => {
  assertTrue(isDebounced !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  const stateFile = path.join(tempDir, 'state.json');
  assertFalse(isDebounced(stateFile), 'Missing state file should not be debounced');
  fs.rmSync(tempDir, { recursive: true });
});

test('isDebounced: returns true when state file was written 5 minutes ago', () => {
  assertTrue(isDebounced !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  const stateFile = path.join(tempDir, 'state.json');
  const firedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  fs.writeFileSync(stateFile, JSON.stringify({ firedAt }), 'utf8');
  assertTrue(isDebounced(stateFile), 'State file from 5 min ago should be debounced');
  fs.rmSync(tempDir, { recursive: true });
});

test('isDebounced: returns false when state file is 35 minutes old', () => {
  assertTrue(isDebounced !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  const stateFile = path.join(tempDir, 'state.json');
  const firedAt = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  fs.writeFileSync(stateFile, JSON.stringify({ firedAt }), 'utf8');
  assertFalse(isDebounced(stateFile), 'State file older than 30 min should not be debounced');
  fs.rmSync(tempDir, { recursive: true });
});

test('isDebounced: returns false for invalid JSON in state file', () => {
  assertTrue(isDebounced !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  const stateFile = path.join(tempDir, 'state.json');
  fs.writeFileSync(stateFile, 'not valid json', 'utf8');
  assertFalse(isDebounced(stateFile), 'Invalid JSON should not be debounced');
  fs.rmSync(tempDir, { recursive: true });
});

// ---------------------------------------------------------------------------
// workflowQueryDetectorHookImpl — async, requires await + try-catch
// ---------------------------------------------------------------------------

test('hook impl: returns {} for non-workflow prompt', async () => {
  assertTrue(workflowQueryDetectorHookImpl !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  try {
    const result = await workflowQueryDetectorHookImpl(
      { prompt: 'write a test for the login function' },
      { stateFilePath: path.join(tempDir, 'state.json') }
    );
    assertEqual(JSON.stringify(result), '{}', 'Non-workflow prompt should return {}');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('hook impl: returns hookSpecificOutput for workflow query', async () => {
  assertTrue(workflowQueryDetectorHookImpl !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  try {
    const result = await workflowQueryDetectorHookImpl(
      { prompt: 'how does the OCR workflow work?' },
      { stateFilePath: path.join(tempDir, 'state.json') }
    );
    assertTrue(result.hookSpecificOutput !== undefined, 'Should have hookSpecificOutput');
    assertTrue(
      result.hookSpecificOutput.additionalContext !== undefined,
      'Should have additionalContext'
    );
    assertTrue(result.message !== undefined, 'Should have message field');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('hook impl: additionalContext mentions /aicodepath-analyze', async () => {
  assertTrue(workflowQueryDetectorHookImpl !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  try {
    const result = await workflowQueryDetectorHookImpl(
      { prompt: 'tell me how the payment workflow works' },
      { stateFilePath: path.join(tempDir, 'state.json') }
    );
    assertTrue(
      result.hookSpecificOutput.additionalContext.includes('/aicodepath-analyze'),
      'additionalContext must mention /aicodepath-analyze'
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('hook impl: writes debounce state file when triggered', async () => {
  assertTrue(workflowQueryDetectorHookImpl !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  const stateFile = path.join(tempDir, 'state.json');
  try {
    await workflowQueryDetectorHookImpl(
      { prompt: 'explain the invoice approval workflow' },
      { stateFilePath: stateFile }
    );
    assertTrue(fs.existsSync(stateFile), 'State file must be written after trigger');
    const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assertTrue(typeof data.firedAt === 'string', 'State file must contain firedAt timestamp');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('hook impl: returns {} when debounce is active', async () => {
  assertTrue(workflowQueryDetectorHookImpl !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  const stateFile = path.join(tempDir, 'state.json');
  const firedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  fs.writeFileSync(stateFile, JSON.stringify({ firedAt }), 'utf8');
  try {
    const result = await workflowQueryDetectorHookImpl(
      { prompt: 'how does the OCR workflow work?' },
      { stateFilePath: stateFile }
    );
    assertEqual(JSON.stringify(result), '{}', 'Should return {} when debounced');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

test('hook impl: is fail-open — returns object on file write error', async () => {
  assertTrue(workflowQueryDetectorHookImpl !== null, 'Hook module not loaded');
  try {
    const result = await workflowQueryDetectorHookImpl(
      { prompt: 'how does the payment workflow work?' },
      { stateFilePath: '/root/no-permission/state.json' }
    );
    assertTrue(typeof result === 'object', 'Should return an object even on error, not throw');
  } catch (err) {
    throw new Error(`Hook should be fail-open but threw: ${err.message}`);
  }
});

test('hook impl: accepts hookData.message as fallback for prompt', async () => {
  assertTrue(workflowQueryDetectorHookImpl !== null, 'Hook module not loaded');
  const tempDir = createTempDir();
  try {
    const result = await workflowQueryDetectorHookImpl(
      { message: 'walk me through the login flow' },
      { stateFilePath: path.join(tempDir, 'state.json') }
    );
    assertTrue(
      result.hookSpecificOutput !== undefined,
      'Should detect workflow query from hookData.message field'
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

async function runTests() {
  for (const { name, fn } of suite) {
    try {
      await fn();
      passed++;
      process.stdout.write(`${colors.green}\u2713${colors.reset} ${name}\n`);
    } catch (err) {
      failed++;
      process.stdout.write(`${colors.red}\u2717${colors.reset} ${name}\n`);
      process.stdout.write(`  ${colors.yellow}${err.message}${colors.reset}\n`);
    }
  }
}

console.log(`\n${colors.bold}Workflow Query Detector Tests${colors.reset}\n`);

runTests().then(() => {
  process.stdout.write(`\n${colors.bold}Results: ${passed} passed, ${failed} failed${colors.reset}\n`);
  if (failed > 0) {
    process.stdout.write(
      `${colors.red}Tests failed — expected until workflow-query-detector.js is implemented${colors.reset}\n`
    );
  }
  process.exit(failed > 0 ? 1 : 0);
}).catch(err => {
  process.stderr.write(`Runner error: ${err.message}\n`);
  process.exit(1);
});
