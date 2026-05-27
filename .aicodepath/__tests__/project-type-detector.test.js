/**
 * Tests for project-type-detector.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { detectProjectType, hasReverseEngineeringArtifacts, determineStartingPhase } = require('../lib/project-type-detector');

// Simple test runner
function test(name, fn) {
  try {
    fn();
    process.stdout.write(`✓ ${name}\n`);
  } catch (err) {
    process.stderr.write(`✗ ${name}\n`);
    process.stderr.write(`  ${err.message}\n`);
    process.exit(1);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Helper to create temporary test directory
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aicodepath-test-'));
}

// Helper to create test files
function createTestFiles(tempDir, files) {
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, '// test file', 'utf-8');
  });
}

// Tests
process.stdout.write('Running project-type-detector tests...\n\n');

test('detectProjectType: empty directory returns greenfield', () => {
  const tempDir = createTempDir();
  const result = detectProjectType(tempDir);

  assertEqual(result.type, 'greenfield', 'Should detect greenfield');
  assertTrue(result.confidence >= 80, 'Should have high confidence');
  assertEqual(result.sourceFiles, 0, 'Should have no source files');

  fs.rmSync(tempDir, { recursive: true });
});

test('detectProjectType: directory with many source files returns brownfield', () => {
  const tempDir = createTempDir();
  createTestFiles(tempDir, [
    'src/index.js',
    'src/app.js',
    'src/utils.js',
    'src/config.js',
    'src/db.js',
    'src/routes.js',
    'src/middleware.js'
  ]);

  const result = detectProjectType(tempDir);

  assertEqual(result.type, 'brownfield', 'Should detect brownfield');
  assertTrue(result.sourceFiles > 5, 'Should have more than 5 source files');
  assertTrue(result.languages.includes('js'), 'Should detect JavaScript');

  fs.rmSync(tempDir, { recursive: true });
});

test('detectProjectType: directory with few files returns greenfield', () => {
  const tempDir = createTempDir();
  createTestFiles(tempDir, [
    'src/index.js',
    'src/app.js'
  ]);

  const result = detectProjectType(tempDir);

  assertEqual(result.type, 'greenfield', 'Should detect greenfield');
  assertEqual(result.confidence, 70, 'Should have medium confidence');

  fs.rmSync(tempDir, { recursive: true });
});

test('hasReverseEngineeringArtifacts: returns false for absent directory', () => {
  const tempDir = createTempDir();
  const result = hasReverseEngineeringArtifacts(tempDir);

  assertEqual(result, false, 'Should return false when directory absent');

  fs.rmSync(tempDir, { recursive: true });
});

test('hasReverseEngineeringArtifacts: returns true when artifacts exist', () => {
  const tempDir = createTempDir();
  const reverseEngDir = path.join(tempDir, 'aicodepath-docs', 'inception', 'reverse-engineering');
  fs.mkdirSync(reverseEngDir, { recursive: true });
  fs.writeFileSync(path.join(reverseEngDir, 'architecture.md'), '# Architecture', 'utf-8');

  const result = hasReverseEngineeringArtifacts(tempDir);

  assertEqual(result, true, 'Should return true when artifacts exist');

  fs.rmSync(tempDir, { recursive: true });
});

test('determineStartingPhase: greenfield starts at PRE-FLIGHT', () => {
  const tempDir = createTempDir();
  const detection = { type: 'greenfield', confidence: 90, sourceFiles: 0, languages: [], buildSystems: [] };

  const result = determineStartingPhase(tempDir, detection);

  assertEqual(result.phase, 'PRE-FLIGHT', 'Should start at PRE-FLIGHT');
  assertTrue(result.reason.includes('requirements'), 'Reason should mention requirements');

  fs.rmSync(tempDir, { recursive: true });
});

test('determineStartingPhase: brownfield starts at INCEPTION with reverse engineering', () => {
  const tempDir = createTempDir();
  const detection = { type: 'brownfield', confidence: 80, sourceFiles: 10, languages: ['js'], buildSystems: ['package.json'] };

  const result = determineStartingPhase(tempDir, detection);

  assertEqual(result.phase, 'INCEPTION', 'Should start at INCEPTION');
  assertEqual(result.skipTo, 'reverse-engineering', 'Should skip to reverse engineering');
  assertTrue(result.reason.includes('reverse engineering'), 'Reason should mention reverse engineering');

  fs.rmSync(tempDir, { recursive: true });
});

process.stdout.write('\n✓ All project-type-detector tests passed!\n');
