/**
 * Test: Feature Flags
 *
 * Tests the three-tier priority system (CLI override > config > env var > default),
 * persistence, and the list/info API.
 */

const { FeatureFlags } = require('../lib/feature-flags');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

// Helper to create a temp project dir with optional config
function makeTmpProject(configContent = null) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-ff-test-'));
  const aicodePathDir = path.join(dir, '.aicodepath');
  fs.mkdirSync(aicodePathDir, { recursive: true });
  if (configContent !== null) {
    fs.writeFileSync(
      path.join(aicodePathDir, 'config.json'),
      JSON.stringify(configContent)
    );
  }
  return dir;
}

function cleanTmpProject(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
}

// ============================================================================
// Tests
// ============================================================================

test('returns default values when no config exists', () => {
  const dir = makeTmpProject(); // no config.json
  const flags = new FeatureFlags(dir);
  assertEqual(flags.isEnabled('gicl'), true, 'gicl default should be true');
  assertEqual(flags.isEnabled('swarm'), false, 'swarm default should be false');
  cleanTmpProject(dir);
});

test('config file overrides default', () => {
  const dir = makeTmpProject({ features: { flags: { gicl: false } } });
  const flags = new FeatureFlags(dir);
  assertEqual(flags.isEnabled('gicl'), false, 'config false should override default true');
  cleanTmpProject(dir);
});

test('CLI override beats config and default', () => {
  const dir = makeTmpProject({ features: { flags: { gicl: true } } });
  const flags = new FeatureFlags(dir);
  flags.setOverride('gicl', false);
  assertEqual(flags.isEnabled('gicl'), false, 'CLI override false should win');

  flags.clearOverride('gicl');
  assertEqual(flags.isEnabled('gicl'), true, 'After clearing override, config value should be used');
  cleanTmpProject(dir);
});

test('env var fallback works (AICODEPATH_GICL_DISABLED=true → gicl disabled)', () => {
  const dir = makeTmpProject(); // no config
  const orig = process.env.AICODEPATH_GICL_DISABLED;
  process.env.AICODEPATH_GICL_DISABLED = 'true';

  const flags = new FeatureFlags(dir);
  assertEqual(flags.isEnabled('gicl'), false, 'Env var inverse: disabled=true → enabled=false');

  if (orig === undefined) delete process.env.AICODEPATH_GICL_DISABLED;
  else process.env.AICODEPATH_GICL_DISABLED = orig;
  cleanTmpProject(dir);
});

test('inverse env var logic: AICODEPATH_GICL_DISABLED=false → gicl enabled', () => {
  const dir = makeTmpProject();
  const orig = process.env.AICODEPATH_GICL_DISABLED;
  process.env.AICODEPATH_GICL_DISABLED = 'false';

  const flags = new FeatureFlags(dir);
  assertEqual(flags.isEnabled('gicl'), true, 'Env var inverse: disabled=false → enabled=true');

  if (orig === undefined) delete process.env.AICODEPATH_GICL_DISABLED;
  else process.env.AICODEPATH_GICL_DISABLED = orig;
  cleanTmpProject(dir);
});

test('list() returns all features with metadata', () => {
  const dir = makeTmpProject();
  const flags = new FeatureFlags(dir);
  const list = flags.list();

  assertTrue(Array.isArray(list), 'list() should return array');
  assertTrue(list.length >= 10, `Should have >= 10 features, got ${list.length}`);

  const gicl = list.find(f => f.name === 'gicl');
  assertTrue(Boolean(gicl), 'gicl should be in list');
  assertEqual(gicl.default, true, 'gicl default should be true');
  assertTrue(gicl.description.includes('Iterative'), 'gicl description should mention Iterative');
  assertEqual(gicl.source, 'default', 'gicl source should be default when no config/env');
  cleanTmpProject(dir);
});

test('setEnabled() persists to config file', () => {
  const dir = makeTmpProject({ features: {} });
  const flags = new FeatureFlags(dir);

  flags.setEnabled('swarm', true);

  // Reload from disk
  const flags2 = new FeatureFlags(dir);
  assertEqual(flags2.isEnabled('swarm'), true, 'swarm should be enabled after setEnabled');
  cleanTmpProject(dir);
});

test('unknown features return false and isKnownFeature returns false', () => {
  const dir = makeTmpProject();
  const flags = new FeatureFlags(dir);
  assertEqual(flags.isEnabled('nonexistent_feature_xyz'), false, 'Unknown feature should be false');
  assertEqual(flags.isKnownFeature('nonexistent_feature_xyz'), false, 'isKnownFeature should be false');
  cleanTmpProject(dir);
});

test('getFeature() returns metadata for known feature', () => {
  const dir = makeTmpProject();
  const flags = new FeatureFlags(dir);
  const gicl = flags.getFeature('gicl');

  assertTrue(Boolean(gicl), 'getFeature should return object for known feature');
  assertEqual(gicl.name, 'gicl', 'name should match');
  assertEqual(gicl.default, true, 'default should be true');
  assertTrue(gicl.description.includes('Iterative'), 'description should be present');
  assertEqual(gicl.envVar, 'AICODEPATH_GICL_DISABLED', 'envVar should be set');
  assertEqual(gicl.envInverse, true, 'envInverse should be true');
  cleanTmpProject(dir);
});

test('getFeature() returns null for unknown feature', () => {
  const dir = makeTmpProject();
  const flags = new FeatureFlags(dir);
  assertEqual(flags.getFeature('does_not_exist'), null, 'Should return null for unknown');
  cleanTmpProject(dir);
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
