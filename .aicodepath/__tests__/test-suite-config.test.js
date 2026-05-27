/**
 * Test: Test Suite Configuration
 *
 * Tests the unified test suite configuration:
 * - Jest configuration file exists and is valid
 * - All test files are discoverable
 * - NPM scripts are configured
 * - Test coverage thresholds are set
 * - Test documentation exists
 */

const path = require('path');
const fs = require('fs');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
    if (error.stack) {
      console.log(`  ${colors.yellow}${error.stack.split('\n').slice(1, 3).join('\n')}${colors.reset}`);
    }
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value, got ${condition}`);
  }
}

function assertContains(haystack, needle, message = '') {
  if (!haystack.includes(needle)) {
    throw new Error(`${message}\n  Expected to contain: ${needle}\n  In: ${haystack}`);
  }
}

function assertFileExists(filePath, message = '') {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${message}\n  File not found: ${filePath}`);
  }
}

// Determine .aicodepath root (go up one level from __tests__)
const aicodePathRoot = path.resolve(__dirname, '..');

console.log('\n=== Testing Test Suite Configuration ===\n');

// Test 1: Jest configuration file exists
test('Jest configuration file exists', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  assertFileExists(jestConfigPath, 'Jest configuration file should exist');
});

// Test 2: Jest configuration is valid JavaScript
test('Jest configuration is valid JavaScript', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(typeof jestConfig === 'object', 'Jest config should export an object');
});

// Test 3: Jest config has testMatch pattern
test('Jest config has testMatch pattern', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(
    jestConfig.testMatch || jestConfig.testRegex,
    'Jest config should have testMatch or testRegex'
  );
});

// Test 4: Jest config has coverage configuration
test('Jest config has coverage configuration', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(jestConfig.collectCoverage !== undefined, 'Jest config should have collectCoverage');
  assertTrue(Array.isArray(jestConfig.collectCoverageFrom), 'Jest config should have collectCoverageFrom array');
});

// Test 5: Jest config has coverage thresholds
test('Jest config has coverage thresholds', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(jestConfig.coverageThreshold, 'Jest config should have coverage thresholds');
  assertTrue(jestConfig.coverageThreshold.global, 'Jest config should have global coverage thresholds');
});

// Test 6: package.json exists
test('package.json exists in .aicodepath', () => {
  const packagePath = path.join(aicodePathRoot, 'package.json');
  assertFileExists(packagePath, 'package.json should exist in .aicodepath');
});

// Test 7: package.json is valid JSON
test('package.json is valid JSON', () => {
  const packagePath = path.join(aicodePathRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  assertTrue(typeof packageJson === 'object', 'package.json should be a valid JSON object');
});

// Test 8: package.json has test script
test('package.json has test script', () => {
  const packagePath = path.join(aicodePathRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  assertTrue(packageJson.scripts, 'package.json should have scripts section');
  assertTrue(packageJson.scripts.test, 'package.json should have test script');
});

// Test 9: package.json has test:watch script
test('package.json has test:watch script', () => {
  const packagePath = path.join(aicodePathRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  assertTrue(packageJson.scripts['test:watch'], 'package.json should have test:watch script');
});

// Test 10: package.json has test:coverage script
test('package.json has test:coverage script', () => {
  const packagePath = path.join(aicodePathRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  assertTrue(packageJson.scripts['test:coverage'], 'package.json should have test:coverage script');
});

// Test 11: Test documentation exists
test('Test documentation exists', () => {
  const testsReadmePath = path.join(aicodePathRoot, 'tests', 'README.md');
  assertFileExists(testsReadmePath, 'tests/README.md should exist');
});

// Test 12: Test documentation has overview section
test('Test documentation has overview section', () => {
  const testsReadmePath = path.join(aicodePathRoot, 'tests', 'README.md');
  const content = fs.readFileSync(testsReadmePath, 'utf8');
  assertContains(content, '# Test Suite', 'README should have Test Suite heading');
  assertContains(content, 'Overview', 'README should have Overview section');
});

// Test 13: Test documentation has running tests section
test('Test documentation has running tests section', () => {
  const testsReadmePath = path.join(aicodePathRoot, 'tests', 'README.md');
  const content = fs.readFileSync(testsReadmePath, 'utf8');
  assertContains(content, 'Running Tests', 'README should have Running Tests section');
});

// Test 14: Test documentation lists all test files
test('Test documentation lists all test files', () => {
  const testsReadmePath = path.join(aicodePathRoot, 'tests', 'README.md');
  const content = fs.readFileSync(testsReadmePath, 'utf8');
  assertContains(content, 'path-resolver.test.js', 'README should mention path-resolver tests');
  assertContains(content, 'config.test.js', 'README should mention config tests');
});

// Test 15: All test files can be discovered
test('All test files can be discovered', () => {
  const testFiles = [
    'lib/__tests__/path-resolver.test.js',
    '__tests__/config.test.js',
    '__tests__/readme.test.js',
    '__tests__/readme-v2-update.test.js',
  ];

  testFiles.forEach(testFile => {
    const fullPath = path.join(aicodePathRoot, testFile);
    assertFileExists(fullPath, `Test file should exist: ${testFile}`);
  });
});

// Test 16: Jest config excludes node_modules
test('Jest config excludes node_modules', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(
    jestConfig.testPathIgnorePatterns && jestConfig.testPathIgnorePatterns.includes('/node_modules/'),
    'Jest config should ignore node_modules'
  );
});

// Test 17: Jest config has test environment set
test('Jest config has test environment set', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(jestConfig.testEnvironment, 'Jest config should specify test environment');
  assertEqual(jestConfig.testEnvironment, 'node', 'Test environment should be node');
});

// Test 18: Jest config has root directory configured
test('Jest config has root directory configured', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(jestConfig.rootDir !== undefined, 'Jest config should have rootDir');
});

// Test 19: Coverage directory is configured
test('Coverage directory is configured', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(jestConfig.coverageDirectory, 'Jest config should have coverageDirectory');
});

// Test 20: Coverage reporters are configured
test('Coverage reporters are configured', () => {
  const jestConfigPath = path.join(aicodePathRoot, 'jest.config.js');
  const jestConfig = require(jestConfigPath);
  assertTrue(Array.isArray(jestConfig.coverageReporters), 'Jest config should have coverageReporters array');
  assertTrue(
    jestConfig.coverageReporters.includes('text') || jestConfig.coverageReporters.includes('lcov'),
    'Coverage reporters should include text or lcov'
  );
});

// Print summary
console.log('\n=== Test Summary ===');
console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
console.log(`Total: ${passed + failed}`);

// Throw error if any tests failed (Jest compatible)
if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
