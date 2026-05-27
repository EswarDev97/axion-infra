#!/usr/bin/env node
/**
 * Tests for pruneSessionEvents() in session-auto-cleanup.js
 *
 * Run: node .aicodepath/__tests__/session-auto-cleanup-events.test.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

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

// ─── Load module under test ────────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'hooks', 'session-auto-cleanup.js');
let hookModule;
try {
  hookModule = require(hookPath);
} catch (e) {
  console.error(`Could not load session-auto-cleanup.js: ${e.message}`);
  process.exit(1);
}

const { pruneSessionEvents } = hookModule;
if (typeof pruneSessionEvents !== 'function') {
  console.error('pruneSessionEvents is not exported from session-auto-cleanup.js');
  process.exit(1);
}

// ─── Helper: create a temp project root with session-events.jsonl ──────────
function makeTempRoot(lines) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-test-'));
  const docsDir = path.join(tmpRoot, 'aicodepath-docs');
  fs.mkdirSync(docsDir, { recursive: true });
  if (lines !== undefined) {
    const eventsFile = path.join(docsDir, 'session-events.jsonl');
    fs.writeFileSync(eventsFile, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf-8');
  }
  return tmpRoot;
}

function readEventsFile(tmpRoot) {
  const eventsFile = path.join(tmpRoot, 'aicodepath-docs', 'session-events.jsonl');
  if (!fs.existsSync(eventsFile)) return null;
  return fs.readFileSync(eventsFile, 'utf-8');
}

function cleanup(tmpRoot) {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch (_) { /* best-effort */ }
}

// ─── Timestamp helpers ─────────────────────────────────────────────────────
function isoNow() {
  return new Date().toISOString();
}

function isoOld(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Tests ──────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\npruneSessionEvents() tests\n');

  // Test 1: File absent → returns { pruned: 0, kept: 0 }, no error
  await test('file absent → pruned:0, kept:0 (no error)', () => {
    // Create root WITHOUT aicodepath-docs/session-events.jsonl
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-test-'));
    const docsDir = path.join(tmpRoot, 'aicodepath-docs');
    fs.mkdirSync(docsDir, { recursive: true });
    // Intentionally do NOT create session-events.jsonl

    try {
      const result = pruneSessionEvents(tmpRoot);
      assertEqual(result.pruned, 0, 'pruned should be 0');
      assertEqual(result.kept, 0, 'kept should be 0');
    } finally {
      cleanup(tmpRoot);
    }
  });

  // Test 2: All entries fresh → all kept, pruned === 0
  await test('all entries fresh → all kept, pruned === 0', () => {
    const freshLines = [
      JSON.stringify({ timestamp: isoNow(), event: 'session_start', sessionId: 'abc1' }),
      JSON.stringify({ timestamp: isoOld(1), event: 'session_end', sessionId: 'abc2' }),
      JSON.stringify({ timestamp: isoOld(15), event: 'tool_used', sessionId: 'abc3' }),
    ];
    const tmpRoot = makeTempRoot(freshLines);

    try {
      const result = pruneSessionEvents(tmpRoot);
      assertEqual(result.pruned, 0, 'pruned should be 0 when all entries are fresh');
      assertEqual(result.kept, 3, 'kept should be 3');

      // Verify file still has 3 entries
      const content = readEventsFile(tmpRoot);
      const remaining = content.split('\n').filter((l) => l.trim());
      assertEqual(remaining.length, 3, 'file should still have 3 lines');
    } finally {
      cleanup(tmpRoot);
    }
  });

  // Test 3: Mix of old and new entries → old pruned, fresh kept
  await test('mix old/new → old entries pruned, fresh entries kept', () => {
    const lines = [
      JSON.stringify({ timestamp: isoOld(31), event: 'session_start', sessionId: 'old1' }), // old
      JSON.stringify({ timestamp: isoNow(), event: 'session_start', sessionId: 'new1' }),    // fresh
      JSON.stringify({ timestamp: isoOld(45), event: 'session_end', sessionId: 'old2' }),    // old
      JSON.stringify({ timestamp: isoOld(5), event: 'tool_used', sessionId: 'new2' }),       // fresh
      JSON.stringify({ timestamp: isoOld(60), event: 'session_end', sessionId: 'old3' }),    // old
    ];
    const tmpRoot = makeTempRoot(lines);

    try {
      const result = pruneSessionEvents(tmpRoot);
      assertEqual(result.pruned, 3, 'pruned should be 3 (the old entries)');
      assertEqual(result.kept, 2, 'kept should be 2 (the fresh entries)');

      // Verify only fresh entries remain in the file
      const content = readEventsFile(tmpRoot);
      const remaining = content.split('\n').filter((l) => l.trim());
      assertEqual(remaining.length, 2, 'file should have 2 lines remaining');

      // Verify the kept entries are the fresh ones
      const keptIds = remaining.map((l) => JSON.parse(l).sessionId);
      assertTrue(keptIds.includes('new1'), 'new1 should be kept');
      assertTrue(keptIds.includes('new2'), 'new2 should be kept');
      assertTrue(!keptIds.includes('old1'), 'old1 should be pruned');
      assertTrue(!keptIds.includes('old2'), 'old2 should be pruned');
      assertTrue(!keptIds.includes('old3'), 'old3 should be pruned');
    } finally {
      cleanup(tmpRoot);
    }
  });

  // Test 4: Malformed JSON lines → skipped/pruned, valid old entries pruned normally
  await test('malformed JSON lines → skipped, valid old entries pruned normally', () => {
    const lines = [
      'THIS IS NOT JSON',                                                                     // malformed
      JSON.stringify({ timestamp: isoNow(), event: 'session_start', sessionId: 'good1' }),   // fresh
      '{broken json: true',                                                                   // malformed
      JSON.stringify({ timestamp: isoOld(35), event: 'session_end', sessionId: 'old1' }),    // old (valid)
      '   ',                                                                                  // blank (filtered before parse)
    ];
    const tmpRoot = makeTempRoot(lines);

    try {
      const result = pruneSessionEvents(tmpRoot);
      // Malformed lines are skipped (return false → pruned), old valid entry pruned
      // fresh valid entry kept
      // blank line filtered out before processing
      // So: kept=1 (good1), pruned = rest (malformed + old)
      assertEqual(result.kept, 1, 'kept should be 1 (the fresh valid entry)');
      assertTrue(result.pruned >= 2, `pruned should be >= 2 (malformed + old), got ${result.pruned}`);

      // Verify only the fresh entry remains
      const content = readEventsFile(tmpRoot);
      const remaining = content.split('\n').filter((l) => l.trim());
      assertEqual(remaining.length, 1, 'file should have 1 line remaining');
      const keptEntry = JSON.parse(remaining[0]);
      assertEqual(keptEntry.sessionId, 'good1', 'the kept entry should be good1');
    } finally {
      cleanup(tmpRoot);
    }
  });

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests();
