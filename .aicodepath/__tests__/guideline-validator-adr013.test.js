#!/usr/bin/env node
/**
 * Tests for guideline-validator.js — ADR-013 enforcement
 *
 * Run: node .aicodepath/__tests__/guideline-validator-adr013.test.js
 *
 * ADR-013: aicodepath-docs/ is runtime-only.
 * README.md files written to aicodepath-docs/ (or any subdirectory) must be blocked.
 */

'use strict';

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

function assertContains(str, substr, msg) {
  if (!str || !str.includes(substr)) {
    throw new Error(`${msg || ''} — expected string to contain "${substr}"`);
  }
}

// ─── Load hook ─────────────────────────────────────────────────────────────
const hookPath = path.join(__dirname, '..', 'hooks', 'guideline-validator');
let hookModule;
try {
  hookModule = require(hookPath);
} catch (e) {
  console.error(`Could not load guideline-validator: ${e.message}`);
  process.exit(1);
}
const { hook } = hookModule;

// project_path with no preferences file → loadPreferences returns null (safe)
const FAKE_PROJECT = '/tmp/adr013-test-project';

function makeParams(filePath, content) {
  return {
    tool_name: 'Write',
    tool_input: { file_path: filePath, content },
    project_path: FAKE_PROJECT,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────
console.log('\nADR-013 enforcement — guideline-validator\n');

(async () => {
  // 1. README.md in aicodepath-docs/ subdirectory → BLOCKED
  await test('blocks README.md in aicodepath-docs/pm/', async () => {
    const result = await hook(makeParams(
      '/home/faizal/workspace/project/aicodepath-docs/pm/README.md',
      '# PM Artifact Schema\n\nStatic spec content.',
    ));
    assertEqual(result.proceed, false, 'should block README.md in aicodepath-docs/pm/');
    assertContains(result.message, 'ADR-013', 'message should cite ADR-013');
    assertContains(result.message, 'runtime-only', 'message should mention runtime-only');
  });

  // 2. README.md at aicodepath-docs/ root → BLOCKED
  await test('blocks README.md at aicodepath-docs/ root', async () => {
    const result = await hook(makeParams(
      '/home/faizal/workspace/project/aicodepath-docs/README.md',
      '# aicodepath-docs\n\nStatic framework spec.',
    ));
    assertEqual(result.proceed, false, 'should block README.md at aicodepath-docs/ root');
    assertContains(result.message, 'ADR-013', 'message should cite ADR-013');
  });

  // 3. Non-README runtime artifact in aicodepath-docs/ → ALLOWED
  await test('allows runtime artifact (non-README .md) in aicodepath-docs/', async () => {
    const result = await hook(makeParams(
      '/home/faizal/workspace/project/aicodepath-docs/pm/hypothesis-personas.md',
      '# Hypothesis Personas\n\n**Source:** AI Hypothesis\n\nRuntime artifact.',
    ));
    assertEqual(result.proceed, true, 'should allow non-README runtime artifact in aicodepath-docs/');
  });

  // 4. README.md outside aicodepath-docs/ → ALLOWED
  await test('allows README.md outside aicodepath-docs/', async () => {
    const result = await hook(makeParams(
      '/home/faizal/workspace/project/README.md',
      '# My Project\n\nProject documentation.',
    ));
    assertEqual(result.proceed, true, 'should allow README.md outside aicodepath-docs/');
  });

  // 5. README.md in .aicodepath/ skills directory → ALLOWED
  await test('allows README.md in .aicodepath/skills/<name>/references/', async () => {
    const result = await hook(makeParams(
      '/home/faizal/workspace/project/.aicodepath/skills/aicodepath-pm/references/README.md',
      '# PM Reference\n\nFramework source reference.',
    ));
    assertEqual(result.proceed, true, 'should allow README.md in .aicodepath/ source directories');
  });

  // 6. Edit tool: README.md write in aicodepath-docs/ → BLOCKED
  await test('blocks Edit tool write of README.md in aicodepath-docs/', async () => {
    const result = await hook({
      tool_name: 'Edit',
      tool_input: {
        file_path: '/home/faizal/workspace/project/aicodepath-docs/design/README.md',
        new_string: '# Design Reference\n\nStatic content.',
      },
      project_path: FAKE_PROJECT,
    });
    assertEqual(result.proceed, false, 'should block Edit of README.md in aicodepath-docs/');
    assertContains(result.message, 'ADR-013', 'message should cite ADR-013');
  });

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
