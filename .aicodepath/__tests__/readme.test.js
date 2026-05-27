/**
 * Test: .aicodepath README Documentation
 *
 * Tests that the .aicodepath/README.md file:
 * - Exists and is readable
 * - Contains all required sections
 * - Documents the directory structure
 * - Explains path resolution and version detection
 * - Provides usage examples
 * - References key configuration files
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

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value, got ${condition}`);
  }
}

function assertContains(content, substring, message = '') {
  if (!content.includes(substring)) {
    throw new Error(`${message}\n  Expected content to contain: ${substring}`);
  }
}

function assertMatchesPattern(content, pattern, message = '') {
  if (!pattern.test(content)) {
    throw new Error(`${message}\n  Expected content to match pattern: ${pattern}`);
  }
}

// Test setup
const aicodePathRoot = path.join(__dirname, '..');
const readmePath = path.join(aicodePathRoot, 'README.md');

// Run tests
console.log('\n=== .aicodepath README Tests ===\n');

// Test 1: README.md exists
test('README.md exists', () => {
  assertTrue(
    fs.existsSync(readmePath),
    'README.md should exist at .aicodepath/README.md'
  );
});

// Load README content for subsequent tests
let readmeContent = '';
test('README.md is readable', () => {
  try {
    readmeContent = fs.readFileSync(readmePath, 'utf8');
    assertTrue(readmeContent.length > 0, 'README.md should not be empty');
  } catch (error) {
    throw new Error(`Could not read README.md: ${error.message}`);
  }
});

// Test 3: Has title and introduction
test('has title and introduction', () => {
  assertContains(readmeContent, '# AICodePath', 'Should have main title');
  assertMatchesPattern(
    readmeContent,
    /AICodePath.*v2\.\d/i,
    'Should mention AICodePath version'
  );
});

// Test 4: Documents directory structure
test('documents directory structure', () => {
  const requiredDirs = [
    'config.json',
    'lib/',
    'hooks/',
    'rules/',
    'guidelines/',
    'scripts/',
    'db/',
    'templates/',
    'skills/',
    'agents/'
  ];

  requiredDirs.forEach(dir => {
    assertContains(
      readmeContent,
      dir,
      `Should document ${dir} in directory structure`
    );
  });
});

// Test 5: Has version information
test('explains version file purpose', () => {
  assertContains(
    readmeContent,
    'version',
    'Should reference version'
  );
  assertMatchesPattern(
    readmeContent,
    /v2\.\d\.\d/i,
    'Should mention a version number'
  );
});

// Test 6: Documents path resolution
test('documents path resolution', () => {
  assertContains(
    readmeContent,
    'path-resolver',
    'Should mention path-resolver module'
  );
  assertMatchesPattern(
    readmeContent,
    /path.*resolv|CRITICAL|findProjectRoot/i,
    'Should explain path handling'
  );
});

// Test 7: Has required sections
test('has all required sections', () => {
  const requiredSections = [
    /##\s+.*[Dd]irectory.*[Ss]tructure/,
    /##\s+.*[Oo]verview/,
    /##\s+.*[Ii]nstallation|[Hh]ook.*[Ss]ystem/,
    /##\s+.*[Pp]ath.*[Hh]andling|[Aa]rchitecture/,
  ];

  requiredSections.forEach((pattern, index) => {
    assertMatchesPattern(
      readmeContent,
      pattern,
      `Should have section matching pattern ${index + 1}`
    );
  });
});

// Test 8: Documents lib modules
test('documents lib modules', () => {
  const libModules = [
    'path-resolver',
    'knowledge-base',
    'lib/'
  ];

  libModules.forEach(mod => {
    assertContains(
      readmeContent,
      mod,
      `Should document ${mod}`
    );
  });
});

// Test 9: Explains config.json
test('explains config.json', () => {
  assertContains(
    readmeContent,
    'config.json',
    'Should reference config.json'
  );
  assertMatchesPattern(
    readmeContent,
    /configuration|settings|options/i,
    'Should explain configuration purpose'
  );
});

// Test 10: Documents hooks directory
test('documents hooks directory', () => {
  assertContains(
    readmeContent,
    'hooks',
    'Should document hooks directory'
  );
  assertMatchesPattern(
    readmeContent,
    /hook|validation|pre-tool/i,
    'Should explain hooks purpose'
  );
});

// Test 11: Documents rules directory
test('documents rules directory', () => {
  assertContains(
    readmeContent,
    'rules',
    'Should document rules directory'
  );
  assertMatchesPattern(
    readmeContent,
    /workflow|phase|rule/i,
    'Should explain rules purpose'
  );
});

// Test 12: Documents guidelines directory
test('documents guidelines directory', () => {
  assertContains(
    readmeContent,
    'guidelines',
    'Should document guidelines directory'
  );
  assertMatchesPattern(
    readmeContent,
    /validation|standard|JSON/i,
    'Should explain guidelines purpose'
  );
});

// Test 13: Documents database schemas
test('documents database schemas', () => {
  assertContains(
    readmeContent,
    'db',
    'Should document db directory'
  );
  assertMatchesPattern(
    readmeContent,
    /schema|database|SQLite/i,
    'Should explain database purpose'
  );
});

// Test 14: Provides usage examples
test('provides usage examples', () => {
  assertMatchesPattern(
    readmeContent,
    /```|example|usage/i,
    'Should include usage examples or code blocks'
  );
});

// Test 15: References path-resolver module
test('references path-resolver module', () => {
  assertContains(
    readmeContent,
    'path-resolver',
    'Should reference path-resolver module'
  );
});

// Test 16: Explains v1 to v2 migration
test('explains v1 to v2 migration', () => {
  assertMatchesPattern(
    readmeContent,
    /migration|v1.*v2|upgrade/i,
    'Should mention migration from v1 to v2'
  );
});

// Test 17: Documents scripts directory
test('documents scripts directory', () => {
  assertContains(
    readmeContent,
    'scripts',
    'Should document scripts directory'
  );
  assertMatchesPattern(
    readmeContent,
    /utility|installation|initialization/i,
    'Should explain scripts purpose'
  );
});

// Test 18: Documents templates
test('documents templates', () => {
  assertContains(
    readmeContent,
    'templates',
    'Should document templates directory'
  );
});

// Test 19: Documents skills and agents
test('documents skills and agents', () => {
  assertContains(
    readmeContent,
    'skills',
    'Should document skills directory'
  );
  assertContains(
    readmeContent,
    'agents',
    'Should document agents directory'
  );
});

// Test 20: Has proper markdown formatting
test('has proper markdown formatting', () => {
  // Check for headers
  assertMatchesPattern(
    readmeContent,
    /^#\s+/m,
    'Should have markdown headers'
  );

  // Check for code blocks
  assertTrue(
    readmeContent.includes('```') || readmeContent.includes('    '),
    'Should have code blocks or indented code'
  );
});

// Test 21: References .claude directory
test('references .claude directory', () => {
  assertContains(
    readmeContent,
    '.claude',
    'Should reference .claude directory'
  );
  assertMatchesPattern(
    readmeContent,
    /Claude Code|integration|bridge/i,
    'Should explain .claude integration'
  );
});

// Test 22: Includes version information
test('includes version information', () => {
  assertMatchesPattern(
    readmeContent,
    /v2\.\d\.\d/i,
    'Should include a version number'
  );
});

// Test 23: Has links or references to other docs
test('has links or references to other documentation', () => {
  assertMatchesPattern(
    readmeContent,
    /README|USER_GUIDE|CLAUDE\.md|documentation|docs\//i,
    'Should reference other documentation files'
  );
});

// Test 24: Explains purpose of .aicodepath directory
test('explains purpose of .aicodepath directory', () => {
  assertMatchesPattern(
    readmeContent,
    /purpose|consolidated|centralized|single.*directory/i,
    'Should explain why .aicodepath exists'
  );
});

// Test 25: Documents key configuration files
test('documents key configuration files', () => {
  const keyFiles = ['config.json', 'version'];

  keyFiles.forEach(file => {
    assertContains(
      readmeContent,
      file,
      `Should document ${file}`
    );
  });
});

// Summary
console.log(`\n${colors.green}${passed}${colors.reset} passed, ${colors.red}${failed}${colors.reset} failed\n`);

// Throw error if any tests failed (Jest compatible)
if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
