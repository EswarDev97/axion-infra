/**
 * Test: PathResolver (v2.0)
 *
 * Tests the PathResolver functionality including:
 * - Project root detection via multiple markers
 * - Path resolution for all helper functions
 * - Generic path resolution
 * - Path integrity checks
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

function assertThrows(fn, message = '') {
  try {
    fn();
    throw new Error(`${message} Expected function to throw`);
  } catch (error) {
    if (error.message.includes('Expected function to throw')) {
      throw error;
    }
    // Expected - function threw an error
  }
}

function assertIncludes(str, substring, message = '') {
  if (!str.includes(substring)) {
    throw new Error(`${message}\n  Expected string to include: ${substring}\n  Got: ${str}`);
  }
}

// Test setup - create temporary test directory
const testRoot = path.join(__dirname, '..', '..', '..', 'test-temp-path-resolver');
const testProjectRoot = path.join(testRoot, 'test-project');

function setupTest() {
  // Clean up any existing test directories
  if (fs.existsSync(testRoot)) {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }

  // Create test structure (.aicodepath/ directory)
  fs.mkdirSync(testProjectRoot, { recursive: true });
  fs.mkdirSync(path.join(testProjectRoot, '.aicodepath'), { recursive: true });
  fs.writeFileSync(path.join(testProjectRoot, 'package.json'), '{}');

  // Create nested directory for root detection tests
  fs.mkdirSync(path.join(testProjectRoot, 'nested', 'deep', 'path'), { recursive: true });
}

function teardownTest() {
  // Clean up test directories
  if (fs.existsSync(testRoot)) {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }

  // Clear module cache to reset state between tests
  delete require.cache[require.resolve('../path-resolver')];
}

// Run tests
console.log('\n=== PathResolver Tests (v2.0) ===\n');

try {
  setupTest();

  // Import the module after setup
  const {
    findProjectRoot,
    getAicodePathRoot,
    resolvePath,
    hooks,
    rules,
    guidelines,
    lib,
    scripts,
    db,
    templates,
    stateTemplates,
    skills,
    agents
  } = require('../path-resolver');

  // Test 1: findProjectRoot() finds package.json
  test('findProjectRoot() finds package.json', () => {
    const root = findProjectRoot(testProjectRoot);
    assertEqual(root, testProjectRoot, 'Should find project root with package.json');
  });

  // Test 2: findProjectRoot() walks up from nested directory
  test('findProjectRoot() walks up from nested directory', () => {
    const nestedPath = path.join(testProjectRoot, 'nested', 'deep', 'path');
    const root = findProjectRoot(nestedPath);
    assertEqual(root, testProjectRoot, 'Should walk up to find project root');
  });

  // Test 3: findProjectRoot() throws when no marker found
  test('findProjectRoot() throws when no marker found', () => {
    // Create isolated directory with no markers
    const isolatedRoot = path.join(testRoot, 'isolated-no-markers');
    fs.mkdirSync(isolatedRoot, { recursive: true });

    // Mock path.parse to simulate we're at filesystem root
    const originalParse = path.parse;
    path.parse = (p) => {
      const parsed = originalParse(p);
      if (p.startsWith(testRoot)) {
        parsed.root = testRoot;
      }
      return parsed;
    };

    try {
      assertThrows(
        () => findProjectRoot(isolatedRoot),
        'Should throw when no root marker found'
      );
    } finally {
      path.parse = originalParse;
    }
  });

  // Test 4: getAicodePathRoot() returns .aicodepath directory
  test('getAicodePathRoot() returns .aicodepath directory', () => {
    const aicodePathRoot = getAicodePathRoot(testProjectRoot);
    assertEqual(
      aicodePathRoot,
      path.join(testProjectRoot, '.aicodepath'),
      'Should return .aicodepath directory'
    );
  });

  // Test 5-14: Helper functions return correct paths
  test('hooks() returns correct path', () => {
    const hooksPath = hooks(testProjectRoot);
    assertEqual(hooksPath, path.join(testProjectRoot, '.aicodepath', 'hooks'));
  });

  test('rules() returns correct path', () => {
    const rulesPath = rules(testProjectRoot);
    assertEqual(rulesPath, path.join(testProjectRoot, '.aicodepath', 'rules'));
  });

  test('guidelines() returns correct path', () => {
    const guidelinesPath = guidelines(testProjectRoot);
    assertEqual(guidelinesPath, path.join(testProjectRoot, '.aicodepath', 'guidelines'));
  });

  test('lib() returns correct path', () => {
    const libPath = lib(testProjectRoot);
    assertEqual(libPath, path.join(testProjectRoot, '.aicodepath', 'lib'));
  });

  test('scripts() returns correct path', () => {
    const scriptsPath = scripts(testProjectRoot);
    assertEqual(scriptsPath, path.join(testProjectRoot, '.aicodepath', 'scripts'));
  });

  test('db() returns correct path', () => {
    const dbPath = db(testProjectRoot);
    assertEqual(dbPath, path.join(testProjectRoot, '.aicodepath', 'db'));
  });

  test('templates() returns correct path', () => {
    const templatesPath = templates(testProjectRoot);
    assertEqual(templatesPath, path.join(testProjectRoot, '.aicodepath', 'templates'));
  });

  test('stateTemplates() returns correct path', () => {
    const stateTemplatesPath = stateTemplates(testProjectRoot);
    assertEqual(stateTemplatesPath, path.join(testProjectRoot, '.aicodepath', 'state-templates'));
  });

  test('skills() returns correct path', () => {
    const skillsPath = skills(testProjectRoot);
    assertEqual(skillsPath, path.join(testProjectRoot, '.aicodepath', 'skills'));
  });

  test('agents() returns correct path', () => {
    const agentsPath = agents(testProjectRoot);
    assertEqual(agentsPath, path.join(testProjectRoot, '.aicodepath', 'agents'));
  });

  // Test 15: resolvePath() handles custom paths
  test('resolvePath() handles custom paths', () => {
    const customPath = resolvePath('custom-dir', testProjectRoot);
    assertEqual(customPath, path.join(testProjectRoot, '.aicodepath', 'custom-dir'));
  });

  // Test 16: resolvePath() preserves absolute paths
  test('resolvePath() preserves absolute paths', () => {
    const absolutePath = '/absolute/test/path';
    const resolved = resolvePath(absolutePath, testProjectRoot);
    assertEqual(resolved, absolutePath, 'Should preserve absolute paths');
  });

  // Test 17: All resolved paths are absolute
  test('All resolved paths are absolute', () => {
    const hooksPath = hooks(testProjectRoot);
    assertTrue(path.isAbsolute(hooksPath), 'Resolved path should be absolute');
  });

  // Test 18: Paths include expected directory names
  test('Paths include expected directory names', () => {
    const hooksPath = hooks(testProjectRoot);
    assertIncludes(hooksPath, 'hooks', 'Path should include "hooks"');
    assertIncludes(hooksPath, '.aicodepath', 'Path should include ".aicodepath"');
  });

  // Test 19: getAicodePathRoot uses current directory when no arg provided
  test('getAicodePathRoot() uses process.cwd() when no arg provided', () => {
    const originalCwd = process.cwd();

    try {
      process.chdir(testProjectRoot);
      const aicodePathRoot = getAicodePathRoot();
      assertEqual(
        aicodePathRoot,
        path.join(testProjectRoot, '.aicodepath'),
        'Should use process.cwd() by default'
      );
    } finally {
      process.chdir(originalCwd);
    }
  });

  // Test 20: Helper functions use process.cwd() when no arg provided
  test('Helper functions use process.cwd() when no arg provided', () => {
    const originalCwd = process.cwd();

    try {
      process.chdir(testProjectRoot);
      const hooksPath = hooks();
      assertEqual(
        hooksPath,
        path.join(testProjectRoot, '.aicodepath', 'hooks'),
        'Should use process.cwd() by default'
      );
    } finally {
      process.chdir(originalCwd);
    }
  });

  // === Monorepo Path Resolution Tests ===

  // Test 21: clearCache() works
  test('clearCache() clears cached resolutions', () => {
    const { clearCache } = require('../path-resolver');
    // Call findProjectRoot to populate cache, then clear it
    findProjectRoot(testProjectRoot);
    clearCache();
    // Should not throw - cache cleared, re-resolves from disk
    const root = findProjectRoot(testProjectRoot);
    assertEqual(root, testProjectRoot, 'Should re-resolve after cache clear');
  });

  // Test 22: Monorepo - .aicodepath at parent beats package.json at service level
  test('findProjectRoot() prefers .aicodepath/ over service-level package.json (monorepo)', () => {
    const { clearCache } = require('../path-resolver');
    clearCache();

    // Create monorepo structure:
    // monorepo-root/
    //   .aicodepath/     <- definitive marker (should win)
    //   package.json     <- monorepo root package.json
    //   services/
    //     auth/
    //       package.json <- service-level (should NOT stop here)
    const monorepoRoot = path.join(testRoot, 'monorepo-root');
    const serviceDir = path.join(monorepoRoot, 'services', 'auth');
    fs.mkdirSync(serviceDir, { recursive: true });
    fs.mkdirSync(path.join(monorepoRoot, '.aicodepath'), { recursive: true });
    fs.writeFileSync(path.join(monorepoRoot, 'package.json'), '{}');
    fs.writeFileSync(path.join(serviceDir, 'package.json'), '{}');

    const root = findProjectRoot(serviceDir);
    assertEqual(root, monorepoRoot, 'Should resolve to monorepo root with .aicodepath/, not service dir');
  });

  // Test 23: Monorepo - deeply nested service still finds .aicodepath at monorepo root
  test('findProjectRoot() from deep nested service dir finds monorepo root', () => {
    const { clearCache } = require('../path-resolver');
    clearCache();

    const monorepoRoot = path.join(testRoot, 'monorepo-root');
    const deepServicePath = path.join(monorepoRoot, 'services', 'auth', 'src', 'controllers');
    fs.mkdirSync(deepServicePath, { recursive: true });
    // .aicodepath/ and package.json already created in test 22

    const root = findProjectRoot(deepServicePath);
    assertEqual(root, monorepoRoot, 'Should walk up from deep path to monorepo root');
  });

  // Test 24: AICODEPATH_PROJECT_ROOT env var overrides everything
  test('AICODEPATH_PROJECT_ROOT env var overrides detection', () => {
    const { clearCache } = require('../path-resolver');
    clearCache();

    const envRoot = path.join(testRoot, 'env-override-root');
    fs.mkdirSync(envRoot, { recursive: true });

    const originalEnv = process.env.AICODEPATH_PROJECT_ROOT;
    try {
      process.env.AICODEPATH_PROJECT_ROOT = envRoot;
      clearCache();
      const root = findProjectRoot(testProjectRoot);
      assertEqual(root, envRoot, 'Env var should override all detection logic');
    } finally {
      if (originalEnv === undefined) {
        delete process.env.AICODEPATH_PROJECT_ROOT;
      } else {
        process.env.AICODEPATH_PROJECT_ROOT = originalEnv;
      }
      clearCache();
    }
  });

  // Test 25: Backward compatibility - no .aicodepath/ above, falls back to package.json
  // Uses /tmp to avoid finding real .aicodepath/ in parent dirs
  test('findProjectRoot() falls back to package.json when no .aicodepath/ exists', () => {
    const { clearCache } = require('../path-resolver');
    clearCache();

    // Create structure in /tmp where no .aicodepath/ exists above
    const fallbackRoot = path.join('/tmp', 'aicodepath-test-fallback-project');
    const subDir = path.join(fallbackRoot, 'src', 'app');
    try {
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(fallbackRoot, 'package.json'), '{}');

      const root = findProjectRoot(subDir);
      assertEqual(root, fallbackRoot, 'Should fall back to package.json when no .aicodepath/ found');
    } finally {
      fs.rmSync(fallbackRoot, { recursive: true, force: true });
    }
  });

  // Test 26: Backward compatibility - .git marker still works as fallback
  // Uses /tmp to avoid finding real .aicodepath/ in parent dirs
  test('findProjectRoot() falls back to .git when no .aicodepath/ or package.json', () => {
    const { clearCache } = require('../path-resolver');
    clearCache();

    // Create structure in /tmp where no .aicodepath/ exists above
    const gitRoot = path.join('/tmp', 'aicodepath-test-git-only-project');
    const subDir = path.join(gitRoot, 'src');
    try {
      fs.mkdirSync(subDir, { recursive: true });
      fs.mkdirSync(path.join(gitRoot, '.git'), { recursive: true });

      const root = findProjectRoot(subDir);
      assertEqual(root, gitRoot, 'Should fall back to .git marker');
    } finally {
      fs.rmSync(gitRoot, { recursive: true, force: true });
    }
  });

  // Test 27: getDbPath resolves correctly in monorepo context
  test('getDbPath() uses monorepo root in monorepo context', () => {
    const { clearCache, getDbPath: testGetDbPath } = require('../path-resolver');
    clearCache();

    const monorepoRoot = path.join(testRoot, 'monorepo-root');
    const serviceDir = path.join(monorepoRoot, 'services', 'auth');
    // .aicodepath/ already exists from test 22

    const dbPath = testGetDbPath(serviceDir);
    assertEqual(
      dbPath,
      path.join(monorepoRoot, 'aicodepath-docs', 'aicodepath.db'),
      'DB path should be relative to monorepo root, not service dir'
    );
  });

  teardownTest();

} catch (error) {
  console.error(`${colors.red}Test suite error:${colors.reset}`, error);
  teardownTest();
  throw error;
}

// Summary
console.log(`\n${colors.green}${passed}${colors.reset} passed, ${colors.red}${failed}${colors.reset} failed\n`);

// Throw error if any tests failed
if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
