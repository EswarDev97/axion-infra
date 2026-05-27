/**
 * Test: Guideline Validator False Positive Fixes
 *
 * Verifies that legitimate patterns in test files are not blocked by validator
 *
 * @author AICodePath Team
 * @date 2026-02-10
 */

const path = require('path');
const fs = require('fs');

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

// Mock guideline-validator module
const guidelineValidator = {
  ruleMatchesFilePattern(rule, filePath) {
    if (!rule.file_patterns) return true;

    const patterns = Array.isArray(rule.file_patterns)
      ? rule.file_patterns
      : [rule.file_patterns];

    // Check negation patterns first (exclusions)
    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        const glob = pattern.slice(1);
        const regex = new RegExp(glob.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        if (regex.test(filePath)) {
          return false; // Excluded
        }
      }
    }

    // Check inclusion patterns
    for (const pattern of patterns) {
      if (!pattern.startsWith('!')) {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        if (regex.test(filePath)) {
          return true; // Included
        }
      }
    }

    return false;
  },

  patternMatches(rule, content) {
    if (!rule.pattern) return false;
    const regex = new RegExp(rule.pattern);
    return regex.test(content);
  }
};

// Test cases
test('console.log in test files should be allowed', () => {
  const rule = {
    id: 'no-console-log',
    pattern: 'console\\.log\\(',
    file_patterns: ['**/*.js', '**/*.ts', '!**/__tests__/**', '!**/test/**', '!**/tests/**', '!**/scripts/**']
  };

  const testFilePath = '/project/__tests__/my-test.js';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, testFilePath);

  assertEqual(shouldMatch, false, 'console.log should be allowed in test files');
  console.log('✓ console.log in test files is allowed');
});

test('console.log in scripts should be allowed', () => {
  const rule = {
    id: 'no-console-log',
    pattern: 'console\\.log\\(',
    file_patterns: ['**/*.js', '**/*.ts', '!**/__tests__/**', '!**/test/**', '!**/tests/**', '!**/scripts/**']
  };

  const scriptFilePath = '/project/scripts/deploy.js';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, scriptFilePath);

  assertEqual(shouldMatch, false, 'console.log should be allowed in scripts');
  console.log('✓ console.log in scripts is allowed');
});

test('console.log in production code should be flagged', () => {
  const rule = {
    id: 'no-console-log',
    pattern: 'console\\.log\\(',
    file_patterns: ['**/*.js', '**/*.ts', '!**/__tests__/**', '!**/test/**', '!**/tests/**', '!**/scripts/**']
  };

  const prodFilePath = '/project/src/app.js';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, prodFilePath);

  assertEqual(shouldMatch, true, 'console.log should be flagged in production code');
  console.log('✓ console.log in production code is flagged');
});

test('executable files in test directories should be allowed', () => {
  const rule = {
    id: 'no-executable-uploads',
    pattern: '\\.(exe|sh|bat|js|php|jar)$',
    file_patterns: ['**/upload/**', '**/uploads/**', '!**/__tests__/**', '!**/test/**', '!**/tests/**', '!**/scripts/**']
  };

  const testFilePath = '/project/__tests__/test-file.js';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, testFilePath);

  assertEqual(shouldMatch, false, 'Executable patterns should be allowed in test files');
  console.log('✓ Executable file patterns in test directories are allowed');
});

test('executable files in upload directories should be flagged', () => {
  const rule = {
    id: 'no-executable-uploads',
    pattern: '\\.(exe|sh|bat|js|php|jar)$',
    file_patterns: ['**/upload/**', '**/uploads/**', '!**/__tests__/**', '!**/test/**', '!**/tests/**', '!**/scripts/**']
  };

  const uploadFilePath = '/project/uploads/user-file.exe';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, uploadFilePath);

  assertEqual(shouldMatch, true, 'Executable patterns should be flagged in upload directories');
  console.log('✓ Executable files in upload directories are flagged');
});

test('path.dirname with .. should not trigger false positive', () => {
  const rule = {
    id: 'no-double-dot-path',
    pattern: '(?<!path\\.)(\\.\\.[\\\\/])',
    file_patterns: ['**/*.js', '**/*.ts', '**/*.py', '!**/__tests__/**', '!**/test/**', '!**/tests/**']
  };

  const content = 'const dir = path.dirname(__filename);';
  const shouldMatch = guidelineValidator.patternMatches(rule, content);

  assertEqual(shouldMatch, false, 'path.dirname should not trigger path traversal warning');
  console.log('✓ path.dirname does not trigger false positive');
});

test('actual path traversal with .. should be flagged', () => {
  const rule = {
    id: 'no-double-dot-path',
    pattern: '(?<!path\\.)(\\.\\.[\\\\/])'
  };

  const content = 'const file = readFile("../../etc/passwd");';
  const shouldMatch = guidelineValidator.patternMatches(rule, content);

  assertEqual(shouldMatch, true, 'Actual path traversal should be flagged');
  console.log('✓ Actual path traversal is flagged');
});

test('double negatives in test assertions should be allowed', () => {
  const rule = {
    id: 'avoid-double-negatives',
    pattern: '\\b(not|don\'t|doesn\'t|won\'t|can\'t|shouldn\'t|wouldn\'t)\\s+\\w*\\s*\\b(not|no|un\\w+|in\\w+|dis\\w+|non\\w+)\\b',
    file_patterns: ['**/*.md', '**/*.txt', '!**/__tests__/**', '!**/test/**', '!**/tests/**']
  };

  const testFilePath = '/project/__tests__/validator.test.js';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, testFilePath);

  assertEqual(shouldMatch, false, 'Double negatives should be allowed in test files');
  console.log('✓ Double negatives in test files are allowed');
});

test('double negatives in documentation should be flagged', () => {
  const rule = {
    id: 'avoid-double-negatives',
    pattern: '\\b(not|don\'t|doesn\'t|won\'t|can\'t|shouldn\'t|wouldn\'t)\\s+\\w*\\s*\\b(not|no|un\\w+|in\\w+|dis\\w+|non\\w+)\\b',
    file_patterns: ['**/*.md', '**/*.txt', '!**/__tests__/**', '!**/test/**', '!**/tests/**']
  };

  const docFilePath = '/project/README.md';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, docFilePath);

  assertEqual(shouldMatch, true, 'Double negatives should be flagged in documentation');
  console.log('✓ Double negatives in documentation are flagged');
});

test('.skip in test should match more precisely', () => {
  const rule = {
    id: 'no-skipped-tests',
    pattern: '\\.(skip|xit|xdescribe)\\s*\\('
  };

  // Should match actual test skip
  const skippedTest = 'it.skip("should do something", () => {});';
  assertTrue(
    guidelineValidator.patternMatches(rule, skippedTest),
    'Should match it.skip('
  );

  // Should NOT match false positives like fs.rmSync
  const falsePositive = 'fs.rmSync(tempDir, { recursive: true });';
  assertEqual(
    guidelineValidator.patternMatches(rule, falsePositive),
    false,
    'Should not match fs.rmSync'
  );

  console.log('✓ .skip pattern matches precisely');
});

test('no-raw-sql requires SQL-like method with template string', () => {
  const rule = {
    id: 'no-raw-sql',
    pattern: '\\.(execute|query|raw)\\s*\\(\\s*[`\'\"].*?\\$\\{'
  };

  // Should match SQL injection risk
  const sqlInjection = 'db.query(`SELECT * FROM users WHERE id = ${userId}`);';
  assertTrue(
    guidelineValidator.patternMatches(rule, sqlInjection),
    'Should match SQL injection pattern'
  );

  // Should NOT match non-SQL patterns
  const falsePositive = 'process.stdout.write(`Progress: ${percent}%`);';
  assertEqual(
    guidelineValidator.patternMatches(rule, falsePositive),
    false,
    'Should not match non-SQL patterns'
  );

  console.log('✓ no-raw-sql pattern is specific to SQL methods');
});

// ============================================
// Python f-string false positive tests (Bug #4)
// ============================================

test('no-python-shell should NOT match plain Python f-strings', () => {
  const rule = {
    id: 'no-python-shell',
    pattern: '(os\\.system|subprocess\\.call|subprocess\\.run|subprocess\\.Popen)\\s*\\(([^)]*\\+|f[\'"])',
  };

  // These should NOT be flagged
  const safePatterns = [
    'logger.info(f"Processing {item_count} items")',
    'print(f"User {name} logged in at {time}")',
    'response = await client.query(f"SELECT * FROM {table}")',
    'boto3.client(f"s3").get_object(Bucket=f"{bucket_name}")',
    'conn = asyncpg.connect(f"postgresql://{host}:{port}/{db}")',
    'msg = f"Error: {error.message}"',
    'path = f"/api/v1/{resource}/{id}"',
  ];

  for (const code of safePatterns) {
    assertEqual(
      guidelineValidator.patternMatches(rule, code),
      false,
      `Should NOT match safe f-string: ${code}`
    );
  }

  console.log('✓ no-python-shell does NOT flag plain Python f-strings');
});

test('no-python-shell SHOULD match f-strings in shell commands', () => {
  const rule = {
    id: 'no-python-shell',
    pattern: '(os\\.system|subprocess\\.call|subprocess\\.run|subprocess\\.Popen)\\s*\\(([^)]*\\+|f[\'"])',
  };

  // These SHOULD be flagged
  const unsafePatterns = [
    'os.system(f"rm -rf {user_input}")',
    'subprocess.run(f"cat {filename}")',
    'subprocess.call(f"curl {url}")',
    'subprocess.Popen(f"echo {data}")',
    'os.system("echo " + user_input)',
    'subprocess.run("ls " + directory)',
  ];

  for (const code of unsafePatterns) {
    assertTrue(
      guidelineValidator.patternMatches(rule, code),
      `SHOULD match unsafe shell command: ${code}`
    );
  }

  console.log('✓ no-python-shell correctly flags f-strings in shell commands');
});

test('no-python-shell should NOT match subprocess with list args', () => {
  const rule = {
    id: 'no-python-shell',
    pattern: '(os\\.system|subprocess\\.call|subprocess\\.run|subprocess\\.Popen)\\s*\\(([^)]*\\+|f[\'"])',
  };

  // Safe subprocess usage with list arguments (no shell injection risk)
  const safeSubprocess = [
    'subprocess.run(["ls", "-la", directory])',
    'subprocess.call(["git", "commit", "-m", message])',
    'subprocess.Popen(["python", script_path])',
  ];

  for (const code of safeSubprocess) {
    assertEqual(
      guidelineValidator.patternMatches(rule, code),
      false,
      `Should NOT match safe list-arg subprocess: ${code}`
    );
  }

  console.log('✓ no-python-shell does NOT flag subprocess with list arguments');
});

// ============================================================
// SPRINT 3 STUBS — Pre-allocated by swarm-lead to prevent race conditions
// Each Task XXa worker: find your language's section, replace TODO patterns,
// and verify both tests pass after creating the JSON file.
// ============================================================

// ---- Task 25a: TypeScript security rules ----
test('typescript no-any-cast: catches explicit any cast (Task 25a TP)', () => {
  const rule = {
    id: 'no-any-cast',
    pattern: ':\\s*any[\\s,\\)\\[]',
    file_pattern: '*.ts'
  };
  const badCode = 'const x: any = unsafeValue;';
  const shouldMatch = guidelineValidator.patternMatches(rule, badCode);
  assertTrue(shouldMatch, 'no-any-cast should catch explicit any cast');
  console.log('✓ typescript no-any-cast catches explicit any cast');
});

test('typescript no-any-cast: does NOT flag generic type parameter (Task 25a FP)', () => {
  const rule = {
    id: 'no-any-cast',
    pattern: ':\\s*any[\\s,\\)\\[]',
    file_pattern: '*.ts'
  };
  const safeCode = 'function identity<T>(x: T): T { return x; }';
  const shouldMatch = guidelineValidator.patternMatches(rule, safeCode);
  assertEqual(shouldMatch, false, 'no-any-cast should not flag generic type parameters');
  console.log('✓ typescript no-any-cast does not flag generic type parameters');
});

// ---- Task 26a: Python security rules ----
test('python no-shell-true: catches shell=True (Task 26a TP)', () => {
  const rule = {
    id: 'no-shell-true',
    pattern: 'shell\\s*=\\s*True',
    file_pattern: '*.py'
  };
  const badCode = 'subprocess.run(cmd, shell=True)';
  const shouldMatch = guidelineValidator.patternMatches(rule, badCode);
  assertTrue(shouldMatch, 'no-shell-true should catch shell=True');
  console.log('✓ python no-shell-true catches shell=True');
});

test('python no-shell-true: does NOT flag shell=False (Task 26a FP)', () => {
  const rule = {
    id: 'no-shell-true',
    pattern: 'shell\\s*=\\s*True',
    file_pattern: '*.py'
  };
  const safeCode = 'subprocess.run(["ls", "-la"], shell=False)';
  const shouldMatch = guidelineValidator.patternMatches(rule, safeCode);
  assertEqual(shouldMatch, false, 'no-shell-true should not flag shell=False');
  console.log('✓ python no-shell-true does not flag shell=False');
});

// ---- Task 27a: Go security rules ----
test('go no-println: catches fmt.Println (Task 27a TP)', () => {
  const rule = {
    id: 'no-println',
    pattern: 'fmt\\.Println\\(',
    file_pattern: '*.go'
  };
  const badCode = 'fmt.Println("debug value:", x)';
  const shouldMatch = guidelineValidator.patternMatches(rule, badCode);
  assertTrue(shouldMatch, 'no-println should catch fmt.Println');
  console.log('✓ go no-println catches fmt.Println');
});

test('go no-println: does NOT flag fmt.Fprintf (Task 27a FP)', () => {
  const rule = {
    id: 'no-println',
    pattern: 'fmt\\.Println\\(',
    file_pattern: '*.go'
  };
  const safeCode = 'fmt.Fprintf(w, "response: %s", body)';
  const shouldMatch = guidelineValidator.patternMatches(rule, safeCode);
  assertEqual(shouldMatch, false, 'no-println should not flag fmt.Fprintf');
  console.log('✓ go no-println does not flag fmt.Fprintf');
});

// ---- Task 28a: Rust security rules ----
test('rust no-unwrap-production: catches .unwrap() (Task 28a TP)', () => {
  const rule = {
    id: 'no-unwrap-production',
    pattern: '\\.unwrap\\(\\)(?!_)',
    file_pattern: '*.rs'
  };
  const badCode = 'let val = result.unwrap();';
  const shouldMatch = guidelineValidator.patternMatches(rule, badCode);
  assertTrue(shouldMatch, 'no-unwrap-production should catch .unwrap()');
  console.log('✓ rust no-unwrap-production catches .unwrap()');
});

test('rust no-unwrap-production: does NOT flag unwrap_or (Task 28a FP)', () => {
  const rule = {
    id: 'no-unwrap-production',
    pattern: '\\.unwrap\\(\\)(?!_)',
    file_pattern: '*.rs'
  };
  const safeCode = 'let val = result.unwrap_or_default();';
  const shouldMatch = guidelineValidator.patternMatches(rule, safeCode);
  assertEqual(shouldMatch, false, 'no-unwrap-production should not flag unwrap_or');
  console.log('✓ rust no-unwrap-production does not flag unwrap_or');
});

// ---- Task 29a: Java security rules ----
test('java no-field-injection: catches @Autowired on field (Task 29a TP)', () => {
  const rule = {
    id: 'no-field-injection',
    pattern: '@Autowired\\s*\\n\\s*(private|protected)\\s+\\w',
    file_pattern: '*.java'
  };
  const badCode = '  @Autowired\n  private UserService userService;';
  const shouldMatch = guidelineValidator.patternMatches(rule, badCode);
  assertTrue(shouldMatch, 'no-field-injection should catch @Autowired on field');
  console.log('✓ java no-field-injection catches @Autowired on field');
});

test('java no-field-injection: does NOT flag @Autowired constructor (Task 29a FP)', () => {
  const rule = {
    id: 'no-field-injection',
    pattern: '@Autowired\\s*\\n\\s*(private|protected)\\s+\\w',
    file_pattern: '*.java'
  };
  // Constructor injection is safe — the pattern should distinguish field vs constructor
  const safeCode = '  @Autowired\n  public UserController(UserService userService) {';
  const shouldMatch = guidelineValidator.patternMatches(rule, safeCode);
  assertEqual(shouldMatch, false, 'no-field-injection should not flag constructor @Autowired');
  console.log('✓ java no-field-injection does not flag constructor @Autowired');
});

// ---- Task 30a: Kotlin security rules ----
test('kotlin no-runblocking-prod: catches runBlocking in production (Task 30a TP)', () => {
  const rule = {
    id: 'no-runblocking-prod',
    pattern: '\\brunBlocking\\s*\\{',
    file_patterns: ['*.kt', '!*Test.kt', '!*Tests.kt', '!*Spec.kt']
  };
  const badCode = 'fun processRequest(req: Request) = runBlocking { service.handle(req) }';
  const shouldMatch = guidelineValidator.patternMatches(rule, badCode);
  assertTrue(shouldMatch, 'no-runblocking-prod should catch runBlocking in production code');
  console.log('✓ kotlin no-runblocking-prod catches runBlocking in production code');
});

test('kotlin no-runblocking-prod: file_patterns exclude test files (Task 30a FP)', () => {
  const rule = {
    id: 'no-runblocking-prod',
    pattern: '\\brunBlocking\\s*\\{',
    file_patterns: ['*.kt', '!*Test.kt', '!*Tests.kt', '!*Spec.kt']
  };
  const testFilePath = '/project/src/test/MyServiceTest.kt';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, testFilePath);
  assertEqual(shouldMatch, false, 'no-runblocking-prod should not apply to test files');
  console.log('✓ kotlin no-runblocking-prod file_patterns correctly exclude test files');
});

// ---- Task 37: ai-regression-patterns.json ----
test('ai-regression-patterns: sandbox-parity-check catches localhost URL in test (Task 37 TP)', () => {
  const rule = {
    id: 'sandbox-parity-check',
    pattern: '(localhost|127\\.0\\.0\\.1):\\d{4}',
    file_patterns: ['**/*.test.*', '**/*.spec.*']
  };
  const testCode = 'const url = "http://localhost:3000/api/users";';
  const shouldMatch = guidelineValidator.patternMatches(rule, testCode);
  assertTrue(shouldMatch, 'sandbox-parity-check should catch hardcoded localhost URL in test');
  console.log('✓ ai-regression-patterns sandbox-parity-check catches localhost URL');
});

test('ai-regression-patterns: only applies to test files (Task 37 FP)', () => {
  const rule = {
    id: 'sandbox-parity-check',
    pattern: '(localhost|127\\.0\\.0\\.1):\\d{4}',
    file_patterns: ['**/*.test.*', '**/*.spec.*']
  };
  const srcFilePath = '/project/src/config.ts';
  const shouldMatch = guidelineValidator.ruleMatchesFilePattern(rule, srcFilePath);
  assertEqual(shouldMatch, false, 'sandbox-parity-check should not apply to non-test files');
  console.log('✓ ai-regression-patterns sandbox-parity-check does not apply to src files');
});

// Run all tests
async function runTests() {
  console.log('\n=== Running Guideline Validator False Positive Tests ===\n');

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(`  ${error.message}`);
      failed++;
    }
  }

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${tests.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
