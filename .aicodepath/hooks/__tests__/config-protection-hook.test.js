#!/usr/bin/env node
/**
 * Tests for config-protection-hook.js
 *
 * Validates that protected configuration files are blocked from Write/Edit
 * and that non-protected files pass through.
 */

const { execute } = require('../config-protection-hook');

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
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
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

// Helper to build Write hook data
function writeInput(filePath) {
  return { tool_name: 'Write', tool_input: { file_path: filePath } };
}

// Helper to build Edit hook data
function editInput(filePath) {
  return { tool_name: 'Edit', tool_input: { file_path: filePath } };
}

// ---------------------------------------------------------------------------
// Test 1: Block edits to guideline JSON files
// ---------------------------------------------------------------------------
test('Blocks Write to .aicodepath/guidelines/security-rules.json', () => {
  const result = execute(writeInput('.aicodepath/guidelines/security-rules.json'));
  assertEqual(result.decision, 'block', 'Should block guideline file edits');
  assertTrue(result.reason.length > 0, 'Should include a reason');
});

// ---------------------------------------------------------------------------
// Test 2: Block edits to hooks.json
// ---------------------------------------------------------------------------
test('Blocks Edit to .aicodepath/hooks/hooks.json', () => {
  const result = execute(editInput('.aicodepath/hooks/hooks.json'));
  assertEqual(result.decision, 'block', 'Should block hooks.json edits');
});

// ---------------------------------------------------------------------------
// Test 3: Block edits to .eslintrc files
// ---------------------------------------------------------------------------
test('Blocks Write to .eslintrc.json', () => {
  const result = execute(writeInput('.eslintrc.json'));
  assertEqual(result.decision, 'block', 'Should block .eslintrc edits');
});

test('Blocks Write to .eslintrc.js', () => {
  const result = execute(writeInput('.eslintrc.js'));
  assertEqual(result.decision, 'block', 'Should block .eslintrc.js edits');
});

// ---------------------------------------------------------------------------
// Test 4: Allow edits to non-protected files
// ---------------------------------------------------------------------------
test('Allows Write to src/utils/helper.js', () => {
  const result = execute(writeInput('src/utils/helper.js'));
  assertEqual(result.decision, 'allow', 'Should allow non-protected files');
});

test('Allows Edit to .aicodepath/hooks/my-new-hook.js', () => {
  const result = execute(editInput('.aicodepath/hooks/my-new-hook.js'));
  assertEqual(result.decision, 'allow', 'Should allow non-lib hook files');
});

// ---------------------------------------------------------------------------
// Test 5: Block edits to hooks/lib/ utility files
// ---------------------------------------------------------------------------
test('Blocks Write to .aicodepath/hooks/lib/exit-codes.js', () => {
  const result = execute(writeInput('.aicodepath/hooks/lib/exit-codes.js'));
  assertEqual(result.decision, 'block', 'Should block hooks/lib/ files');
});

test('Blocks Edit to .aicodepath/hooks/lib/hook-wrapper.js', () => {
  const result = execute(editInput('.aicodepath/hooks/lib/hook-wrapper.js'));
  assertEqual(result.decision, 'block', 'Should block hooks/lib/ files');
});

// ---------------------------------------------------------------------------
// Additional: tsconfig, biome, prettierrc
// ---------------------------------------------------------------------------
test('Blocks Write to tsconfig.json', () => {
  const result = execute(writeInput('tsconfig.json'));
  assertEqual(result.decision, 'block', 'Should block tsconfig.json');
});

test('Blocks Write to biome.json', () => {
  const result = execute(writeInput('biome.json'));
  assertEqual(result.decision, 'block', 'Should block biome.json');
});

test('Blocks Write to .prettierrc', () => {
  const result = execute(writeInput('.prettierrc'));
  assertEqual(result.decision, 'block', 'Should block .prettierrc');
});

test('Blocks Write to .prettierrc.json', () => {
  const result = execute(writeInput('.prettierrc.json'));
  assertEqual(result.decision, 'block', 'Should block .prettierrc.json');
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
test('Allows when tool_input is missing', () => {
  const result = execute({ tool_name: 'Write', tool_input: {} });
  assertEqual(result.decision, 'allow', 'Should allow when no file_path');
});

test('Allows when hookData is null', () => {
  const result = execute(null);
  assertEqual(result.decision, 'allow', 'Should allow null input');
});

test('Handles absolute path with project prefix', () => {
  const result = execute(writeInput('/home/user/project/.aicodepath/guidelines/coding-standards.json'));
  assertEqual(result.decision, 'block', 'Should block absolute paths to protected files');
});

test('Allows other guideline-adjacent paths', () => {
  const result = execute(writeInput('.aicodepath/guidelines-backup/test.json'));
  assertEqual(result.decision, 'allow', 'Should not block non-guideline directories');
});

// Summary
console.log(`\n${colors.bold}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
