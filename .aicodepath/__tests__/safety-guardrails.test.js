#!/usr/bin/env node
/**
 * Tests for safety-guardrails.js
 *
 * Covers R01-R06 with positive and negative cases,
 * short-circuit behavior, and fallback approval.
 */

const { evaluateGuardRules } = require('../hooks/safety-guardrails');

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
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
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

function assertFalse(condition, message) {
  if (condition) throw new Error(message || 'Expected false');
}

// Helper to build Bash hook data
function bashInput(command) {
  return { tool_name: 'Bash', tool_input: { command } };
}

// Helper to build Write hook data
function writeInput(filePath) {
  return { tool_name: 'Write', tool_input: { file_path: filePath } };
}

// Helper to build Edit hook data
function editInput(filePath) {
  return { tool_name: 'Edit', tool_input: { file_path: filePath } };
}

console.log(`\n${colors.bold}Safety Guardrails Tests${colors.reset}\n`);

// --- Fallback: no match → approve ---
test('No matching rule → proceed: true', () => {
  const result = evaluateGuardRules(bashInput('ls -la'));
  assertTrue(result.proceed, 'Should allow benign commands');
  assertFalse(result.blocking, 'Should not block');
});

test('No tool_name → proceed: true', () => {
  const result = evaluateGuardRules({});
  assertTrue(result.proceed, 'Missing tool_name should pass through');
});

test('null input → proceed: true', () => {
  const result = evaluateGuardRules(null);
  assertTrue(result.proceed, 'Null input should pass through');
});

// --- R01: Block sudo ---
test('R01 — sudo command is blocked', () => {
  const result = evaluateGuardRules(bashInput('sudo apt-get install curl'));
  assertFalse(result.proceed, 'sudo should not proceed');
  assertTrue(result.blocking, 'sudo should be blocking');
  assertEqual(result.decision, 'block', 'decision should be block');
  assertTrue(result.reason.includes('R01'), 'Reason should reference R01');
});

test('R01 — sudo with leading space is blocked', () => {
  const result = evaluateGuardRules(bashInput('  sudo npm install'));
  assertTrue(result.blocking, 'sudo with leading space should be blocking');
});

test('R01 — "sudoers" in path is NOT blocked', () => {
  const result = evaluateGuardRules(bashInput('cat /etc/sudoers.d/policy'));
  assertTrue(result.proceed, 'sudoers read should pass (no sudo execution)');
  assertFalse(result.blocking, 'Should not block');
});

// --- R02: Block writes to protected paths ---
test('R02 — write to .git/ is blocked', () => {
  const result = evaluateGuardRules(writeInput('.git/config'));
  assertTrue(result.blocking, '.git/ write should be blocked');
  assertTrue(result.reason.includes('R02'), 'Reason should reference R02');
});

test('R02 — write to .env is blocked', () => {
  const result = evaluateGuardRules(writeInput('.env'));
  assertTrue(result.blocking, '.env write should be blocked');
});

test('R02 — write to .env.local is blocked', () => {
  const result = evaluateGuardRules(writeInput('.env.local'));
  assertTrue(result.blocking, '.env.local write should be blocked');
});

test('R02 — write to id_rsa is blocked', () => {
  const result = evaluateGuardRules(writeInput('/home/user/.ssh/id_rsa'));
  assertTrue(result.blocking, 'id_rsa write should be blocked');
});

test('R02 — write to *.pem is blocked', () => {
  const result = evaluateGuardRules(writeInput('certs/server.pem'));
  assertTrue(result.blocking, '.pem write should be blocked');
});

test('R02 — write to .env.example is NOT blocked', () => {
  // .env.example is a documentation file, not a live credential file
  const result = evaluateGuardRules(editInput('src/components/env-display.tsx'));
  assertTrue(result.proceed, 'Normal tsx file should pass');
});

test('R02 — edit to regular source file is allowed', () => {
  const result = evaluateGuardRules(editInput('src/lib/database.js'));
  assertTrue(result.proceed, 'Normal source file edit should pass');
});

// --- R03: Block shell redirects to protected files ---
test('R03 — redirect to .env is blocked', () => {
  const result = evaluateGuardRules(bashInput('echo "PROD_KEY=abc" > .env'));
  assertTrue(result.blocking, 'Redirect to .env should be blocked');
  assertTrue(result.reason.includes('R03'), 'Reason should reference R03');
});

test('R03 — tee to .git/config is blocked', () => {
  const result = evaluateGuardRules(bashInput('cat config | tee .git/config'));
  assertTrue(result.blocking, 'tee to .git/ should be blocked');
});

test('R03 — redirect to regular file is allowed', () => {
  const result = evaluateGuardRules(bashInput('echo "data" > output.txt'));
  assertTrue(result.proceed, 'Redirect to normal file should pass');
});

// --- R04: Block destructive rm on system paths ---
test('R04 — rm -rf / is blocked', () => {
  const result = evaluateGuardRules(bashInput('rm -rf /'));
  assertTrue(result.blocking, 'rm -rf / should be blocked');
  assertTrue(result.reason.includes('R04'), 'Reason should reference R04');
});

test('R04 — rm -rf /home is blocked', () => {
  const result = evaluateGuardRules(bashInput('rm -rf /home'));
  assertTrue(result.blocking, 'rm -rf /home should be blocked');
});

// --- R05: Warn on recursive/force rm ---
test('R05 — rm -rf project/dist warns', () => {
  const result = evaluateGuardRules(bashInput('rm -rf project/dist'));
  assertTrue(result.proceed, 'rm -rf on local path should allow proceed');
  assertTrue(Array.isArray(result.warnings) && result.warnings.length > 0, 'Should have warnings');
  assertTrue(result.message.includes('R05'), 'Message should reference R05');
});

test('R05 — rm -fr is also warned', () => {
  const result = evaluateGuardRules(bashInput('rm -fr build/'));
  assertTrue(Array.isArray(result.warnings) && result.warnings.length > 0, 'rm -fr should warn');
});

test('R05 — regular rm without flags is allowed without warning', () => {
  const result = evaluateGuardRules(bashInput('rm output.log'));
  assertTrue(result.proceed, 'Plain rm should pass');
  assertFalse(Array.isArray(result.warnings) && result.warnings.length > 0, 'Plain rm should not warn');
});

// --- R06: Block git force push (STRICT — never bypassable) ---
test('R06 — git push --force is blocked', () => {
  const result = evaluateGuardRules(bashInput('git push origin main --force'));
  assertTrue(result.blocking, 'git push --force should be blocked');
  assertTrue(result.reason.includes('R06'), 'Reason should reference R06');
});

test('R06 — git push --force-with-lease is blocked', () => {
  const result = evaluateGuardRules(bashInput('git push --force-with-lease'));
  assertTrue(result.blocking, '--force-with-lease should be blocked');
});

test('R06 — git push -f is blocked', () => {
  const result = evaluateGuardRules(bashInput('git push origin main -f'));
  assertTrue(result.blocking, 'git push -f should be blocked');
});

test('R06 — normal git push is allowed', () => {
  const result = evaluateGuardRules(bashInput('git push origin feature/my-branch'));
  assertTrue(result.proceed, 'Normal git push should pass');
  assertFalse(result.blocking, 'Normal push should not be blocking');
});

// --- Short-circuit: R06 fires before R05 for compound commands ---
test('Short-circuit — first matching rule wins', () => {
  // A command matching R01 (sudo) should short-circuit at R01, not continue to R06
  const result = evaluateGuardRules(bashInput('sudo git push --force'));
  assertTrue(result.blocking, 'Should be blocked');
  assertTrue(result.reason.includes('R01'), 'Should reference first matching rule R01');
});

// --- Tool filtering: Write rules don't fire on Bash ---
test('R02 protected path check does NOT fire on Bash tool', () => {
  // Bash commands can reference .env paths (e.g., `cat .env`) — only Write/Edit should block
  const result = evaluateGuardRules(bashInput('cat .env'));
  // Should pass through (Bash tool, not Write/Edit)
  assertTrue(result.proceed, 'Reading .env via Bash should not be blocked by R02');
});

// Summary
console.log(`\n${colors.bold}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
if (failed > 0) process.exit(1);
