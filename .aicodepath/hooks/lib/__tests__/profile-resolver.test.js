/**
 * Test: Profile Resolver
 *
 * Tests the hook profile system that controls which hooks run
 * based on tiered profiles (minimal, standard, strict).
 *
 * @module hooks/lib/__tests__/profile-resolver.test.js
 */

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

// Helper: create a temp project with optional config.json
function makeTmpProject(configContent = null) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-profile-test-'));
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

// Save original env vars to restore after each test
const originalEnv = { ...process.env };

function resetEnv() {
  delete process.env.AICODEPATH_HOOK_PROFILE;
  delete process.env.AICODEPATH_DISABLED_HOOKS;
  delete process.env.AICODEPATH_PROJECT_ROOT;
}

// Load the module under test
const { shouldRunHook, resolveProfile, TIER_ORDER } = require('../profile-resolver');

// ---- Tests ----

console.log('\nProfile Resolver Tests\n');

// Test 1: Default profile is standard; standard-tier hook should run
test('shouldRunHook returns {run: true} for standard hook when no env vars set (default=standard)', () => {
  resetEnv();
  const result = shouldRunHook('guideline-validator', 'standard');
  assertEqual(result.run, true, 'standard hook should run under default standard profile');
});

// Test 2: When profile=minimal, standard-tier hook should NOT run
test('shouldRunHook returns {run: false} for standard hook when AICODEPATH_HOOK_PROFILE=minimal', () => {
  resetEnv();
  process.env.AICODEPATH_HOOK_PROFILE = 'minimal';
  const result = shouldRunHook('guideline-validator', 'standard');
  assertEqual(result.run, false, 'standard hook should not run under minimal profile');
});

// Test 3: Minimal-tier hook runs under all profiles
test('shouldRunHook returns {run: true} for minimal hook under all profiles', () => {
  resetEnv();

  // Under minimal profile
  process.env.AICODEPATH_HOOK_PROFILE = 'minimal';
  let result = shouldRunHook('session-start-hook', 'minimal');
  assertEqual(result.run, true, 'minimal hook should run under minimal profile');

  // Under standard profile
  process.env.AICODEPATH_HOOK_PROFILE = 'standard';
  result = shouldRunHook('session-start-hook', 'minimal');
  assertEqual(result.run, true, 'minimal hook should run under standard profile');

  // Under strict profile
  process.env.AICODEPATH_HOOK_PROFILE = 'strict';
  result = shouldRunHook('session-start-hook', 'minimal');
  assertEqual(result.run, true, 'minimal hook should run under strict profile');
});

// Test 4: Strict-tier hook does NOT run under standard profile
test('shouldRunHook returns {run: false} for strict hook when profile=standard', () => {
  resetEnv();
  process.env.AICODEPATH_HOOK_PROFILE = 'standard';
  const result = shouldRunHook('agent-inbox', 'strict');
  assertEqual(result.run, false, 'strict hook should not run under standard profile');
});

// Test 5: Disabled hooks via AICODEPATH_DISABLED_HOOKS
test('shouldRunHook returns {run: false} when hook is in AICODEPATH_DISABLED_HOOKS', () => {
  resetEnv();
  process.env.AICODEPATH_DISABLED_HOOKS = 'guideline-validator';
  const result = shouldRunHook('guideline-validator', 'standard');
  assertEqual(result.run, false, 'disabled hook should not run');
  assertTrue(result.reason && result.reason.includes('Disabled'), 'reason should mention disabled');
});

// Test 6: Config.json fallback when env var not set
test('resolveProfile reads hookProfile from config.json when env var not set', () => {
  resetEnv();
  const tmpDir = makeTmpProject({ hookProfile: 'strict' });
  process.env.AICODEPATH_PROJECT_ROOT = tmpDir;

  // Clear any cached pathResolver state
  const pathResolver = require('../../../lib/path-resolver');
  if (typeof pathResolver.clearCache === 'function') {
    pathResolver.clearCache();
  }

  const profile = resolveProfile();
  assertEqual(profile, 'strict', 'should read hookProfile from config.json');

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---- Summary ----

resetEnv();
// Restore original env
Object.keys(process.env).forEach(key => {
  if (!(key in originalEnv)) delete process.env[key];
});
Object.assign(process.env, originalEnv);

console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`);
process.exit(failed > 0 ? 1 : 0);
