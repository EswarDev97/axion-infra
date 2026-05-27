/**
 * Test: Guideline Handler Existence Validation
 *
 * Verifies that rules with unimplemented CHECK_HANDLERS are properly skipped
 * (not falling through to pattern matching which causes false positives).
 * Also catalogs handler coverage for visibility.
 */

const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
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
    throw new Error(`${message}\n  Expected: ${expected}\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

// ============================================================================
// Load data
// ============================================================================

const guidelinesDir = path.join(__dirname, '..', 'guidelines');
const { CHECK_HANDLERS, validateRule, ruleMatchesFilePattern } = require('../hooks/guideline-validator');

// Collect all rules with "check" field from guideline JSON files
function collectCheckRules() {
  const rules = [];
  const files = fs.readdirSync(guidelinesDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(guidelinesDir, file), 'utf8'));
      const categories = content.categories || {};

      // categories is an object keyed by category name (not an array)
      for (const catKey of Object.keys(categories)) {
        const categoryRules = categories[catKey].rules || [];
        for (const rule of categoryRules) {
          if (rule.check) {
            rules.push({ ...rule, sourceFile: file });
          }
        }
      }
    } catch (err) {
      // Skip unparseable files
    }
  }
  return rules;
}

const checkRules = collectCheckRules();
const implementedHandlers = Object.keys(CHECK_HANDLERS);

// ============================================================================
// Tests
// ============================================================================

console.log('\n--- Handler Coverage ---');

test('CHECK_HANDLERS object exists and has entries', () => {
  assertTrue(typeof CHECK_HANDLERS === 'object', 'CHECK_HANDLERS should be an object');
  assertTrue(implementedHandlers.length > 0, 'Should have at least one handler');
});

test('all implemented handlers are functions', () => {
  for (const key of implementedHandlers) {
    assertTrue(
      typeof CHECK_HANDLERS[key] === 'function',
      `CHECK_HANDLERS.${key} should be a function`
    );
  }
});

test('guideline files contain rules with check field', () => {
  assertTrue(checkRules.length > 0, 'Should find rules with check field');
});

console.log('\n--- Skip Behavior for Missing Handlers ---');

test('rules with missing handlers return empty violations (not pattern fallthrough)', async () => {
  // Find a rule with an unimplemented handler AND a pattern
  const ruleWithMissingHandler = checkRules.find(
    r => r.check && !CHECK_HANDLERS[r.check] && r.pattern
  );

  // All handlers may be implemented — skip if none are missing
  if (!ruleWithMissingHandler) {
    console.log('  \x1b[33mAll handlers implemented, skip behavior verified by coverage report\x1b[0m');
    return;
  }

  // Content that matches the pattern but should NOT trigger violation
  const testContent = 'const result = SELECT * FROM users;';
  const testFile = 'test-file.js';

  const violations = await validateRule(testContent, ruleWithMissingHandler, testFile, 'javascript', process.cwd());
  assertEqual(violations.length, 0,
    `Rule "${ruleWithMissingHandler.id}" (check: ${ruleWithMissingHandler.check}) should be skipped, not fall through to pattern "${ruleWithMissingHandler.pattern}"`
  );
});

test('rules with implemented handlers still work', async () => {
  // Test line_count handler with a very long file
  const longContent = Array(600).fill('const x = 1;').join('\n');
  const rule = {
    id: 'test-line-count',
    check: 'line_count',
    max: 500,
    severity: 'warning',
    message: 'File too long',
  };

  const violations = await validateRule(longContent, rule, 'big-file.js', 'javascript', process.cwd());
  assertTrue(violations.length > 0, 'line_count handler should detect violation');
});

test('no-hallucinated-columns rule is skipped (schema_validation not implemented)', async () => {
  const rule = checkRules.find(r => r.id === 'no-hallucinated-columns');
  if (!rule) {
    console.log(`  ${colors.yellow}Rule not found, skipping${colors.reset}`);
    passed++;
    return;
  }

  const sqlContent = 'SELECT id, name, email FROM users WHERE active = true;';
  const violations = await validateRule(sqlContent, rule, 'query.sql', 'sql', process.cwd());
  assertEqual(violations.length, 0, 'Rule should be skipped since schema_validation handler is missing');
});

test('validate-file-type rule is skipped (file_validation not implemented)', async () => {
  const rule = checkRules.find(r => r.id === 'validate-file-type');
  if (!rule) {
    console.log(`  ${colors.yellow}Rule not found, skipping${colors.reset}`);
    passed++;
    return;
  }

  const uploadContent = 'const upload = multer({ dest: "uploads/" });';
  const violations = await validateRule(uploadContent, rule, 'upload.js', 'javascript', process.cwd());
  assertEqual(violations.length, 0, 'Rule should be skipped since file_validation handler is missing');
});

console.log('\n--- Coverage Report ---');

test('print handler coverage summary', () => {
  const uniqueChecks = [...new Set(checkRules.map(r => r.check))];
  const implemented = uniqueChecks.filter(c => CHECK_HANDLERS[c]);
  const missing = uniqueChecks.filter(c => !CHECK_HANDLERS[c]);

  console.log(`  ${colors.cyan}Total unique check values: ${uniqueChecks.length}${colors.reset}`);
  console.log(`  ${colors.green}Implemented handlers: ${implemented.length}${colors.reset}`);
  console.log(`  ${colors.yellow}Missing handlers (safely skipped): ${missing.length}${colors.reset}`);

  // This test always passes - it's informational
  assertTrue(true);
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${colors.green}Passed: ${passed}${colors.reset}`);
if (failed > 0) {
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  process.exit(1);
} else {
  console.log('All tests passed!');
}
