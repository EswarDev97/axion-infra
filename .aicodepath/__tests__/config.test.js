/**
 * Test: Consolidated Configuration (v2.0)
 *
 * Tests the consolidated configuration files:
 * - config.json exists and is valid JSON
 * - version file exists and contains "2.0.0"
 * - All required configuration sections are present
 * - All required paths are defined
 * - All required features are defined
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

function assertExists(value, message = '') {
  if (value === undefined || value === null) {
    throw new Error(`${message}\n  Expected value to exist, got ${value}`);
  }
}

function assertIsObject(value, message = '') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${message}\n  Expected object, got ${typeof value}`);
  }
}

function assertIsArray(value, message = '') {
  if (!Array.isArray(value)) {
    throw new Error(`${message}\n  Expected array, got ${typeof value}`);
  }
}

function assertHasProperty(obj, property, message = '') {
  if (!obj.hasOwnProperty(property)) {
    throw new Error(`${message}\n  Expected object to have property: ${property}`);
  }
}

// Test setup
const aicodePathRoot = path.join(__dirname, '..');
const configPath = path.join(aicodePathRoot, 'config.json');
const versionPath = path.join(aicodePathRoot, 'version');

// Run tests
console.log('\n=== Consolidated Configuration Tests ===\n');

// Test 1: Version file exists
test('version file exists', () => {
  assertTrue(
    fs.existsSync(versionPath),
    'Version file should exist at .aicodepath/version'
  );
});

// Test 2: Version file contains "2.0.0"
test('version file contains "2.0.0"', () => {
  const versionContent = fs.readFileSync(versionPath, 'utf8').trim();
  assertEqual(versionContent, '2.0.0', 'Version file should contain "2.0.0"');
});

// Test 3: config.json exists
test('config.json exists', () => {
  assertTrue(
    fs.existsSync(configPath),
    'config.json should exist at .aicodepath/config.json'
  );
});

// Test 4: config.json is valid JSON
let config;
test('config.json is valid JSON', () => {
  const configContent = fs.readFileSync(configPath, 'utf8');
  try {
    config = JSON.parse(configContent);
    assertTrue(true, 'Should parse as valid JSON');
  } catch (error) {
    throw new Error(`config.json is not valid JSON: ${error.message}`);
  }
});

// Test 5: config has version "2.0.0"
test('config has version "2.0.0"', () => {
  assertExists(config.version, 'Config should have version property');
  assertEqual(config.version, '2.0.0', 'Version should be "2.0.0"');
});

// Test 6: config has name "aicodepath"
test('config has name "aicodepath"', () => {
  assertExists(config.name, 'Config should have name property');
  assertEqual(config.name, 'aicodepath', 'Name should be "aicodepath"');
});

// Test 7: config has metadata section
test('config has metadata section', () => {
  assertExists(config.metadata, 'Config should have metadata section');
  assertIsObject(config.metadata, 'Metadata should be an object');
  assertHasProperty(config.metadata, 'description', 'Metadata should have description');
  assertHasProperty(config.metadata, 'author', 'Metadata should have author');
  assertHasProperty(config.metadata, 'license', 'Metadata should have license');
  assertHasProperty(config.metadata, 'homepage', 'Metadata should have homepage');
});

// Test 8: config has paths section with all required paths
test('config has paths section with all required paths', () => {
  assertExists(config.paths, 'Config should have paths section');
  assertIsObject(config.paths, 'Paths should be an object');

  const requiredPaths = [
    'hooks',
    'rules',
    'guidelines',
    'lib',
    'scripts',
    'db',
    'templates',
    'stateTemplates',
    'skills',
    'agents',
    'knowledgeBase',
    'docs'
  ];

  requiredPaths.forEach(pathName => {
    assertHasProperty(config.paths, pathName, `Paths should have ${pathName}`);
  });
});

// Test 9: config has features section with all required features
test('config has features section with all required features', () => {
  assertExists(config.features, 'Config should have features section');
  assertIsObject(config.features, 'Features should be an object');

  const requiredFeatures = [
    'adaptiveWorkflow',
    'qualityEnforcement',
    'mockDetection',
    'duplicationDetection',
    'gicl',
    'frontendDesigner',
    'ciIntegration'
  ];

  requiredFeatures.forEach(feature => {
    assertHasProperty(config.features, feature, `Features should have ${feature}`);
  });
});

// Test 10: config has requiredPlugins array
test('config has requiredPlugins array', () => {
  assertExists(config.requiredPlugins, 'Config should have requiredPlugins');
  assertIsArray(config.requiredPlugins, 'requiredPlugins should be an array');

  // Check that plugins have required structure
  if (config.requiredPlugins.length > 0) {
    const firstPlugin = config.requiredPlugins[0];
    assertHasProperty(firstPlugin, 'id', 'Plugin should have id');
    assertHasProperty(firstPlugin, 'minVersion', 'Plugin should have minVersion');
    assertHasProperty(firstPlugin, 'purpose', 'Plugin should have purpose');
  }
});

// Test 11: config has database section (MCP servers are in .mcp.json, not config.json)
test('config has database section', () => {
  assertExists(config.database, 'Config should have database section');
  assertIsObject(config.database, 'database should be an object');
  assertHasProperty(config.database, 'schema', 'database should have schema path');
  assertHasProperty(config.database, 'migrations', 'database should have migrations path');
});

// Test 12: All path values are strings
test('all path values are strings', () => {
  Object.entries(config.paths).forEach(([key, value]) => {
    assertEqual(
      typeof value,
      'string',
      `Path "${key}" should be a string`
    );
  });
});

// Test 13: All feature objects have enabled property (flags map excluded)
test('all feature objects have enabled property', () => {
  Object.entries(config.features).forEach(([key, value]) => {
    // Skip 'flags' — it's a flat boolean map, not a feature object
    if (key === 'flags') return;
    assertIsObject(value, `Feature "${key}" should be an object`);
    assertHasProperty(value, 'enabled', `Feature "${key}" should have enabled property`);
    assertEqual(
      typeof value.enabled,
      'boolean',
      `Feature "${key}" enabled property should be boolean`
    );
  });
});

// Test 14: Version file content matches config version
test('version file content matches config version', () => {
  const versionContent = fs.readFileSync(versionPath, 'utf8').trim();
  assertEqual(
    versionContent,
    config.version,
    'Version file should match config.version'
  );
});

// Test 15: config.json is formatted (not minified)
test('config.json is formatted with proper indentation', () => {
  const configContent = fs.readFileSync(configPath, 'utf8');
  assertTrue(
    configContent.includes('\n'),
    'config.json should be formatted (not minified)'
  );

  // Check for indentation (should have at least 2 spaces for nested objects)
  assertTrue(
    configContent.includes('  "'),
    'config.json should have proper indentation'
  );
});

// Summary
console.log(`\n${colors.green}${passed}${colors.reset} passed, ${colors.red}${failed}${colors.reset} failed\n`);

// Throw error if any tests failed (Jest compatible)
if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
