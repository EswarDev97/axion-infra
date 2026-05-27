/**
 * Verification Test: Patterns that should now pass
 *
 * This file contains patterns that were previously blocked by false positives
 * and should now be allowed by the guideline validator.
 *
 * @author AICodePath Team
 * @date 2026-02-10
 */

const path = require('path');
const fs = require('fs');

// Test 1: console.log in test files (should be allowed)
function testConsoleLog() {
  console.log('This console.log should be allowed in test files');
  console.log('Test output is legitimate');
  console.log('Debugging information for tests');
}

// Test 2: Path operations with .. (should be allowed via path.* APIs)
function testPathOperations() {
  const parentDir = path.dirname(__dirname);
  const resolvedPath = path.resolve('..', 'someDir');
  const joined = path.join(__dirname, '..', 'parentFolder');

  return { parentDir, resolvedPath, joined };
}

// Test 3: Test assertions with negatives (should be allowed in tests)
function testAssertions() {
  const result = {
    isNotInvalid: true,
    doesNotFail: true,
    isNotUncommon: false
  };

  // These descriptions are fine in test context
  return result;
}

// Test 4: Using .js extension (should be allowed in test directories)
function testJavaScriptFile() {
  return 'This .js file should not trigger executable-upload warning in tests';
}

// Test 5: String operations that look like SQL but aren't
function testStringOperations() {
  const percent = 75;
  process.stdout.write(`Progress: ${percent}%\n`);

  const output = `Results: ${JSON.stringify({ status: 'ok' })}`;
  return output;
}

// Test 6: Using fs.rmSync (should not match .skip pattern)
function testFileOperations() {
  const tempDir = '/tmp/test-cleanup';

  // This should NOT match the .skip pattern for skipped tests
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
}

// Test 7: Test descriptions with "returns false when absent"
function testDescriptions() {
  // These descriptions are common in tests and should be allowed
  const testCases = [
    'should return false when user is not found',
    'returns null when input is invalid',
    'doesn\'t throw when file is absent'
  ];

  return testCases;
}

// Export for testing
module.exports = {
  testConsoleLog,
  testPathOperations,
  testAssertions,
  testJavaScriptFile,
  testStringOperations,
  testFileOperations,
  testDescriptions
};

console.log('✓ All verification patterns loaded successfully');
console.log('✓ This test file should not be blocked by guideline validator');
