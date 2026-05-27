/**
 * Tests for auto-workflow-router.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { checkExistingState, createInitialState, loadPhaseContext, generateRoutingSummary } = require('../lib/auto-workflow-router');

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

// Tests
process.stdout.write('Running auto-workflow-router tests...\n\n');

test('checkExistingState: returns exists false when no state file', () => {
  const tempDir = createTempDir();
  const result = checkExistingState(tempDir);

  assertEqual(result.exists, false, 'Should return exists false');
  assertEqual(result.phase, null, 'Phase should be null');

  fs.rmSync(tempDir, { recursive: true });
});

test('checkExistingState: parses existing state file correctly', () => {
  const tempDir = createTempDir();
  const docsDir = path.join(tempDir, 'aicodepath-docs');
  fs.mkdirSync(docsDir, { recursive: true });

  const stateContent = `# AICodePath State
  
- **Project Type**: **Brownfield**
- **Current Phase**: **INCEPTION**
- **Current Stage**: **reverse-engineering**
`;
  
  fs.writeFileSync(path.join(docsDir, 'aicodepath-state.md'), stateContent, 'utf-8');

  const result = checkExistingState(tempDir);

  assertEqual(result.exists, true, 'Should return exists true');
  assertEqual(result.phase, 'INCEPTION', 'Should parse phase correctly');
  assertEqual(result.stage, 'reverse-engineering', 'Should parse stage correctly');
  assertEqual(result.projectType, 'brownfield', 'Should parse project type correctly');

  fs.rmSync(tempDir, { recursive: true });
});

test('createInitialState: creates state file with correct content', () => {
  const tempDir = createTempDir();
  
  const detection = {
    type: 'greenfield',
    confidence: 90,
    sourceFiles: 0,
    languages: [],
    buildSystems: []
  };

  const routing = {
    phase: 'PRE-FLIGHT',
    reason: 'New project - starting with requirements gathering',
    skipTo: null
  };

  const result = createInitialState(tempDir, detection, routing);

  assertEqual(result.success, true, 'Should succeed');
  assertTrue(fs.existsSync(result.path), 'State file should exist');

  const content = fs.readFileSync(result.path, 'utf-8');
  assertTrue(content.includes('PRE-FLIGHT'), 'Should include phase');
  assertTrue(content.includes('Greenfield'), 'Should include project type');
  assertTrue(content.includes('90%'), 'Should include confidence');

  fs.rmSync(tempDir, { recursive: true });
});

test('loadPhaseContext: loads correct context files', () => {
  const projectRoot = path.join(__dirname, '..', '..');
  const result = loadPhaseContext(projectRoot, 'PRE-FLIGHT');

  assertTrue(Array.isArray(result), 'Should return array');
  assertTrue(result.length > 0, 'Should load at least one file');
  assertTrue(result.some(f => f.includes('preamble.md')), 'Should include preamble');
});

test('generateRoutingSummary: creates formatted summary', () => {
  const detection = {
    type: 'brownfield',
    confidence: 80,
    sourceFiles: 15,
    languages: ['js', 'ts'],
    buildSystems: ['package.json']
  };

  const routing = {
    phase: 'INCEPTION',
    reason: 'Existing codebase detected',
    skipTo: 'reverse-engineering'
  };

  const contextFiles = ['rules/core/preamble.md', 'rules/core/inception.md'];

  const result = generateRoutingSummary(detection, routing, contextFiles);

  assertTrue(typeof result === 'string', 'Should return string');
  assertTrue(result.includes('BROWNFIELD'), 'Should include project type');
  assertTrue(result.includes('INCEPTION'), 'Should include phase');
  assertTrue(result.includes('80%'), 'Should include confidence');
  assertTrue(result.includes('15'), 'Should include source file count');
});

process.stdout.write('\n✓ All auto-workflow-router tests passed!\n');
