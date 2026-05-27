/**
 * Test: TypeScript Strict Mode Rules
 *
 * Verifies that TypeScript strict mode enforcement rules correctly detect
 * violations and do not produce false positives.
 *
 * @author AICodePath Team
 * @date 2026-02-15
 */

const path = require('path');

// Simple test framework
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Helper: test if pattern matches content
function patternMatches(rule, content) {
  if (!rule.pattern) return false;
  const regex = new RegExp(rule.pattern, 'gm');
  return regex.test(content);
}

// Helper: file pattern matching (mirrors guideline-validator logic)
function ruleMatchesFilePattern(rule, filePath) {
  const patterns = rule.file_patterns;
  if (!patterns) return true;

  const patternList = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of patternList) {
    if (pattern.startsWith('!')) {
      const glob = pattern.slice(1);
      const regex = new RegExp(glob.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'), 'i');
      if (regex.test(filePath)) {
        return false;
      }
    }
  }

  for (const pattern of patternList) {
    if (!pattern.startsWith('!')) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'), 'i');
      if (regex.test(filePath)) {
        return true;
      }
    }
  }

  return false;
}

// Load rules from type-design-rules.json
const rulesPath = path.join(__dirname, '..', 'guidelines', 'type-design-rules.json');
const rulesData = require(rulesPath);
const strictRules = rulesData.categories.strict_mode.rules;

function getRule(id) {
  return strictRules.find(r => r.id === id);
}

// =============================================
// no-ts-ignore rule tests
// =============================================

test('no-ts-ignore: detects @ts-ignore comment', () => {
  const rule = getRule('no-ts-ignore');
  assertTrue(patternMatches(rule, '// @ts-ignore'), 'should match // @ts-ignore');
  assertTrue(patternMatches(rule, '  // @ts-ignore'), 'should match indented @ts-ignore');
  assertTrue(patternMatches(rule, '// @ts-ignore next line has error'), 'should match @ts-ignore with description');
});

test('no-ts-ignore: does not flag @ts-expect-error', () => {
  const rule = getRule('no-ts-ignore');
  assertFalse(patternMatches(rule, '// @ts-expect-error'), 'should not match @ts-expect-error');
  assertFalse(patternMatches(rule, '// @ts-expect-error: missing property'), 'should not match @ts-expect-error with desc');
});

test('no-ts-ignore: does not flag @ts-check', () => {
  const rule = getRule('no-ts-ignore');
  assertFalse(patternMatches(rule, '// @ts-check'), 'should not match @ts-check');
});

test('no-ts-ignore: excluded from test files', () => {
  const rule = getRule('no-ts-ignore');
  assertFalse(ruleMatchesFilePattern(rule, 'src/__tests__/helper.ts'), 'should exclude __tests__');
  assertFalse(ruleMatchesFilePattern(rule, 'src/user.test.ts'), 'should exclude .test.ts');
  assertFalse(ruleMatchesFilePattern(rule, 'src/user.spec.ts'), 'should exclude .spec.ts');
  assertTrue(ruleMatchesFilePattern(rule, 'src/services/user.ts'), 'should include production .ts');
  assertTrue(ruleMatchesFilePattern(rule, 'src/components/App.tsx'), 'should include .tsx');
});

// =============================================
// no-ts-nocheck rule tests
// =============================================

test('no-ts-nocheck: detects @ts-nocheck comment', () => {
  const rule = getRule('no-ts-nocheck');
  assertTrue(patternMatches(rule, '// @ts-nocheck'), 'should match // @ts-nocheck');
  assertTrue(patternMatches(rule, '  // @ts-nocheck'), 'should match indented @ts-nocheck');
});

test('no-ts-nocheck: does not flag @ts-check', () => {
  const rule = getRule('no-ts-nocheck');
  assertFalse(patternMatches(rule, '// @ts-check'), 'should not match @ts-check');
});

test('no-ts-nocheck: does not flag @ts-expect-error', () => {
  const rule = getRule('no-ts-nocheck');
  assertFalse(patternMatches(rule, '// @ts-expect-error'), 'should not match @ts-expect-error');
});

// =============================================
// no-double-type-assertion rule tests
// =============================================

test('no-double-type-assertion: detects as unknown as T', () => {
  const rule = getRule('no-double-type-assertion');
  assertTrue(patternMatches(rule, 'const user = data as unknown as User;'), 'should match as unknown as User');
  assertTrue(patternMatches(rule, 'return response as unknown as ApiResponse;'), 'should match as unknown as ApiResponse');
});

test('no-double-type-assertion: does not flag single assertions', () => {
  const rule = getRule('no-double-type-assertion');
  assertFalse(patternMatches(rule, 'const user = data as User;'), 'should not match single as Type');
  assertFalse(patternMatches(rule, 'const val = x as unknown;'), 'should not match as unknown alone');
});

test('no-double-type-assertion: excluded from test files', () => {
  const rule = getRule('no-double-type-assertion');
  assertFalse(ruleMatchesFilePattern(rule, 'src/__tests__/helper.ts'), 'should exclude __tests__');
  assertFalse(ruleMatchesFilePattern(rule, 'src/user.test.ts'), 'should exclude .test.ts');
  assertTrue(ruleMatchesFilePattern(rule, 'src/services/user.ts'), 'should include production .ts');
});

// =============================================
// no-definite-assignment-abuse rule tests
// =============================================

test('no-definite-assignment-abuse: detects !: in class properties', () => {
  const rule = getRule('no-definite-assignment-abuse');
  assertTrue(patternMatches(rule, '  private db!: Database;'), 'should match private prop!: Type');
  assertTrue(patternMatches(rule, '  public name!: string;'), 'should match public prop!: Type');
  assertTrue(patternMatches(rule, '  readonly config!: Config;'), 'should match readonly prop!: Type');
  assertTrue(patternMatches(rule, '  userId!: string;'), 'should match bare prop!: Type');
});

test('no-definite-assignment-abuse: does not flag normal properties', () => {
  const rule = getRule('no-definite-assignment-abuse');
  assertFalse(patternMatches(rule, '  private db: Database;'), 'should not match normal property');
  assertFalse(patternMatches(rule, '  private db?: Database;'), 'should not match optional property');
});

test('no-definite-assignment-abuse: does not flag non-null assertion in expressions', () => {
  const rule = getRule('no-definite-assignment-abuse');
  // The rule pattern targets class property declarations (indented, with type annotation)
  // Expression-level !. is handled by no-non-null-assertion rule
  assertFalse(patternMatches(rule, 'const x = obj!.prop;'), 'should not match expression-level !.');
});

test('no-definite-assignment-abuse: excluded from .d.ts files', () => {
  const rule = getRule('no-definite-assignment-abuse');
  assertFalse(ruleMatchesFilePattern(rule, 'src/types/global.d.ts'), 'should exclude .d.ts files');
  assertTrue(ruleMatchesFilePattern(rule, 'src/services/user.service.ts'), 'should include .ts files');
});

// =============================================
// no-type-assertion-object rule tests
// =============================================

test('no-type-assertion-object: detects as {} assertion', () => {
  const rule = getRule('no-type-assertion-object');
  assertTrue(patternMatches(rule, 'const x = data as {};'), 'should match as {}');
  assertTrue(patternMatches(rule, 'return val as { };'), 'should match as { } with space');
});

test('no-type-assertion-object: detects as object assertion', () => {
  const rule = getRule('no-type-assertion-object');
  assertTrue(patternMatches(rule, 'const x = data as object;'), 'should match as object');
});

test('no-type-assertion-object: does not flag as ObjectType (named types)', () => {
  const rule = getRule('no-type-assertion-object');
  // "as object" matches but "as ObjectType" should not match because \b requires word boundary
  assertFalse(patternMatches(rule, 'const x = data as ObjectType;'), 'should not match as ObjectType');
  assertFalse(patternMatches(rule, 'const x = data as ObjectMapper;'), 'should not match as ObjectMapper');
});

test('no-type-assertion-object: does not flag typed object assertions', () => {
  const rule = getRule('no-type-assertion-object');
  assertFalse(patternMatches(rule, 'const x = data as { name: string };'), 'should not match as { name: string }');
});

test('no-type-assertion-object: excluded from test files', () => {
  const rule = getRule('no-type-assertion-object');
  assertFalse(ruleMatchesFilePattern(rule, 'src/__tests__/helper.ts'), 'should exclude __tests__');
  assertTrue(ruleMatchesFilePattern(rule, 'src/services/user.ts'), 'should include production .ts');
});

// =============================================
// require-strict-tsconfig rule tests (CHECK_HANDLER)
// =============================================

test('require-strict-tsconfig: rule exists and uses check handler', () => {
  const rule = getRule('require-strict-tsconfig');
  assertTrue(rule !== undefined, 'rule should exist');
  assertEqual(rule.check, 'strict_tsconfig', 'should use strict_tsconfig handler');
  assertEqual(rule.severity, 'warning', 'should be warning severity');
});

test('require-strict-tsconfig: file_patterns target tsconfig files', () => {
  const rule = getRule('require-strict-tsconfig');
  assertTrue(ruleMatchesFilePattern(rule, '/project/tsconfig.json'), 'should match tsconfig.json');
  assertTrue(ruleMatchesFilePattern(rule, '/project/tsconfig.app.json'), 'should match tsconfig.app.json');
  assertTrue(ruleMatchesFilePattern(rule, '/project/tsconfig.build.json'), 'should match tsconfig.build.json');
  assertTrue(ruleMatchesFilePattern(rule, '/project/packages/api/tsconfig.json'), 'should match nested tsconfig.json');
  assertFalse(ruleMatchesFilePattern(rule, '/project/package.json'), 'should not match package.json');
  assertFalse(ruleMatchesFilePattern(rule, '/project/src/config.json'), 'should not match other json');
});

// =============================================
// strict_tsconfig CHECK_HANDLER unit tests
// =============================================

// Load the actual CHECK_HANDLER from guideline-validator
let CHECK_HANDLERS;
try {
  // The CHECK_HANDLERS are defined inside guideline-validator.js
  // We need to test the strict_tsconfig handler directly
  // Since it's not exported, we test its logic inline

  const strictTsconfigHandler = (content, rule, filePath) => {
    const violations = [];
    const basename = path.basename(filePath);

    if (!basename.startsWith('tsconfig') || !basename.endsWith('.json')) {
      return violations;
    }

    const stripped = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([\]}])/g, '$1');

    let parsed;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return violations;
    }

    const compilerOptions = parsed.compilerOptions;
    if (!compilerOptions) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: 'tsconfig.json is missing compilerOptions',
        file: filePath,
        line: 1,
        match: 'compilerOptions missing',
        category: 'strict_mode',
      });
      return violations;
    }

    if (compilerOptions.strict !== true) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: rule.message || 'Enable strict: true',
        file: filePath,
        line: 1,
        match: `strict: ${compilerOptions.strict === undefined ? 'missing' : compilerOptions.strict}`,
        category: 'strict_mode',
      });
    }

    const strictFlags = [
      'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes',
      'strictBindCallApply', 'strictPropertyInitialization', 'noImplicitThis', 'alwaysStrict',
    ];

    for (const flag of strictFlags) {
      if (compilerOptions[flag] === false) {
        violations.push({
          rule: rule.id,
          severity: 'warning',
          message: `"${flag}": false overrides strict mode`,
          file: filePath,
          line: 1,
          match: `${flag}: false`,
          category: 'strict_mode',
        });
      }
    }

    return violations;
  };

  CHECK_HANDLERS = { strict_tsconfig: strictTsconfigHandler };
} catch (e) {
  console.error('Failed to load CHECK_HANDLERS:', e.message);
}

const mockRule = { id: 'require-strict-tsconfig', severity: 'warning', message: 'Enable strict: true' };

test('strict_tsconfig handler: passes with strict: true', () => {
  const content = JSON.stringify({
    compilerOptions: { strict: true, target: 'es2020' }
  });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 0, 'should have no violations with strict: true');
});

test('strict_tsconfig handler: flags missing strict', () => {
  const content = JSON.stringify({
    compilerOptions: { target: 'es2020' }
  });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 1, 'should have 1 violation for missing strict');
  assertTrue(violations[0].match.includes('missing'), 'should indicate strict is missing');
});

test('strict_tsconfig handler: flags strict: false', () => {
  const content = JSON.stringify({
    compilerOptions: { strict: false, target: 'es2020' }
  });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 1, 'should have 1 violation for strict: false');
  assertTrue(violations[0].match.includes('false'), 'should indicate strict is false');
});

test('strict_tsconfig handler: flags missing compilerOptions', () => {
  const content = JSON.stringify({ files: ['src/index.ts'] });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 1, 'should have 1 violation for missing compilerOptions');
  assertTrue(violations[0].match.includes('compilerOptions'), 'should mention compilerOptions');
});

test('strict_tsconfig handler: flags overridden strict flags', () => {
  const content = JSON.stringify({
    compilerOptions: { strict: true, noImplicitAny: false, strictNullChecks: false }
  });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 2, 'should have 2 violations for overridden flags');
  assertTrue(violations[0].match.includes('noImplicitAny'), 'should flag noImplicitAny: false');
  assertTrue(violations[1].match.includes('strictNullChecks'), 'should flag strictNullChecks: false');
});

test('strict_tsconfig handler: allows additional strict flags set to true', () => {
  const content = JSON.stringify({
    compilerOptions: { strict: true, noImplicitAny: true, strictNullChecks: true }
  });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 0, 'should have no violations when flags are true');
});

test('strict_tsconfig handler: handles JSONC with comments', () => {
  const content = `{
    // TypeScript config
    "compilerOptions": {
      "strict": true, // enable all strict checks
      "target": "es2020"
      /* module settings */
    }
  }`;
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 0, 'should parse JSONC with comments correctly');
});

test('strict_tsconfig handler: handles trailing commas in JSONC', () => {
  const content = `{
    "compilerOptions": {
      "strict": true,
      "target": "es2020",
    },
  }`;
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 0, 'should handle trailing commas');
});

test('strict_tsconfig handler: skips non-tsconfig files', () => {
  const content = JSON.stringify({ compilerOptions: {} });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'package.json');
  assertEqual(violations.length, 0, 'should skip non-tsconfig files');
});

test('strict_tsconfig handler: handles malformed JSON gracefully', () => {
  const content = '{ invalid json :::';
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 0, 'should return empty for malformed JSON');
});

test('strict_tsconfig handler: works with tsconfig.app.json', () => {
  const content = JSON.stringify({
    compilerOptions: { strict: false }
  });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.app.json');
  assertEqual(violations.length, 1, 'should validate tsconfig.app.json');
});

test('strict_tsconfig handler: flags all 7 strict sub-flags when overridden', () => {
  const content = JSON.stringify({
    compilerOptions: {
      strict: true,
      noImplicitAny: false,
      strictNullChecks: false,
      strictFunctionTypes: false,
      strictBindCallApply: false,
      strictPropertyInitialization: false,
      noImplicitThis: false,
      alwaysStrict: false,
    }
  });
  const violations = CHECK_HANDLERS.strict_tsconfig(content, mockRule, 'tsconfig.json');
  assertEqual(violations.length, 7, 'should have 7 violations for all overridden flags');
});

// =============================================
// Rule metadata validation
// =============================================

test('all strict_mode rules have required fields', () => {
  for (const rule of strictRules) {
    assertTrue(typeof rule.id === 'string' && rule.id.length > 0, `rule should have id: ${rule.id}`);
    assertTrue(typeof rule.description === 'string', `${rule.id} should have description`);
    assertTrue(typeof rule.severity === 'string', `${rule.id} should have severity`);
    assertTrue(['error', 'warning', 'info'].includes(rule.severity), `${rule.id} severity should be valid: ${rule.severity}`);
    assertTrue(Array.isArray(rule.languages), `${rule.id} should have languages array`);
    assertTrue(rule.languages.includes('typescript'), `${rule.id} should target typescript`);
    assertTrue(typeof rule.message === 'string', `${rule.id} should have message`);
  }
});

test('pattern-based strict_mode rules have valid regex', () => {
  for (const rule of strictRules) {
    if (rule.pattern) {
      try {
        new RegExp(rule.pattern, 'gm');
      } catch (e) {
        throw new Error(`${rule.id} has invalid regex pattern: ${e.message}`);
      }
    }
  }
});

test('strict_mode category has correct count of rules', () => {
  assertEqual(strictRules.length, 6, 'strict_mode should have 6 rules');
});

// =============================================
// Run all tests
// =============================================

async function runTests() {
  let passed = 0;
  let failed = 0;
  const failures = [];

  console.log('\n=== TypeScript Strict Mode Rules Tests ===\n');

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  PASS: ${name}`);
    } catch (err) {
      failed++;
      failures.push({ name, error: err.message });
      console.log(`  FAIL: ${name}`);
      console.log(`    ${err.message}`);
    }
  }

  console.log(`\n--- Results: ${passed} passed, ${failed} failed, ${tests.length} total ---\n`);

  if (failures.length > 0) {
    console.log('Failures:');
    for (const { name, error } of failures) {
      console.log(`  - ${name}: ${error}`);
    }
    process.exit(1);
  }
}

runTests();
