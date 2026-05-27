#!/usr/bin/env node
/**
 * AICodePath Test Tampering Detector Hook
 *
 * PostToolUse hook that detects test tampering patterns in test and CI config files.
 * Catches: test skips, commented-out assertions, hardcoded test values, CI bypasses.
 *
 * Warn-only — does NOT block. Tampering detection is advisory.
 * Applies only to test files (*.test.*, *.spec.*, __tests__/) and CI config files.
 *
 * Patterns T01-T12 modeled after harness tampering detection.
 *
 * @module hooks/test-tampering-detector
 */

const ErrorHandler = require('../lib/error-handler');
const logger = require('../lib/logger');

// Matches test files across JS/TS, Python, Go
const TEST_FILE_PATTERN = /(?:\.(test|spec)\.(js|ts|jsx|tsx|mjs)$|__tests__[\\/]|[\\/]tests?[\\/].*\.(js|ts|jsx|tsx|py|go)$|_test\.go$|test_.*\.py$)/i;

// Matches CI config and linting config files
const CONFIG_FILE_PATTERN = /(?:\.eslintrc(?:\.js|\.json|\.yml|\.yaml)?$|jest\.config\.(js|ts|mjs|json)$|vitest\.config\.(js|ts|mjs)$|\.github[\\/]workflows[\\/].*\.ya?ml$|Jenkinsfile$|\.gitlab-ci\.yml$)/i;

/**
 * Tampering detection patterns (T01-T12).
 * testOnly: true  → only fires on test files (not CI configs)
 * testOnly: false → fires on both test files and CI config files
 */
const TAMPERING_PATTERNS = [
  // --- Test skips: JavaScript / TypeScript ---
  {
    id: 'T01',
    pattern: /(?:it|test|describe)\.skip\s*\(/,
    message: '[T01] .skip() on test/describe — test intentionally excluded',
    testOnly: true,
  },
  {
    id: 'T02',
    pattern: /\b(?:xit|xtest|xdescribe)\s*\(/,
    message: '[T02] Jasmine-style skip (xit/xtest/xdescribe) detected',
    testOnly: true,
  },
  // --- Test skips: Python ---
  {
    id: 'T03',
    pattern: /@pytest\.mark\.(?:skip|xfail)/,
    message: '[T03] pytest.mark.skip/xfail detected',
    testOnly: true,
  },
  // --- Test skips: Go ---
  {
    id: 'T04',
    pattern: /\bt\.(?:Skip|Skipf|SkipNow)\(\)/,
    message: '[T04] Go t.Skip() detected',
    testOnly: true,
  },
  // --- Commented-out assertions ---
  {
    id: 'T05',
    pattern: /\/\/\s*expect\s*\(/,
    message: '[T05] Commented-out expect() assertion',
    testOnly: true,
  },
  {
    id: 'T06',
    pattern: /\/\/\s*assert\w*/,
    message: '[T06] Commented-out assertion',
    testOnly: true,
  },
  {
    id: 'T07',
    pattern: /\/\/\s*TODO\s+(?:assert|expect)/i,
    message: '[T07] Assertion deferred as TODO',
    testOnly: true,
  },
  // --- Config tampering ---
  {
    id: 'T08',
    pattern: /eslint-disable(?:-next-line|-line)?/,
    message: '[T08] ESLint rule suppression detected',
    testOnly: false,
  },
  {
    id: 'T09',
    pattern: /continue-on-error:\s*true/,
    message: '[T09] CI continue-on-error:true bypasses failure detection',
    testOnly: false,
  },
  {
    id: 'T10',
    pattern: /if:\s*always\(\)/,
    message: '[T10] CI if:always() forces step to run regardless of failures',
    testOnly: false,
  },
  // --- Hardcoded test values ---
  {
    id: 'T11',
    pattern: /answers?_for_tests?\s*=/,
    message: '[T11] Hardcoded test answer dictionary detected',
    testOnly: true,
  },
  {
    id: 'T12',
    pattern: /return\s+["'`]\w+["'`]\s*;\s*\/\/.*(?:test|spec|expect)/i,
    message: '[T12] Hardcoded return value for test detected',
    testOnly: true,
  },
];

/**
 * Detect test tampering in written/edited content.
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result
 */
function detectTampering(hookData) {
  if (!hookData?.tool_name) return { proceed: true };

  const toolName = hookData.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') return { proceed: true };

  const filePath = hookData.tool_input?.file_path || '';
  const isTestFile = TEST_FILE_PATTERN.test(filePath);
  const isConfigFile = CONFIG_FILE_PATTERN.test(filePath);

  if (!isTestFile && !isConfigFile) return { proceed: true };

  const content = hookData.tool_input?.content || hookData.tool_input?.new_string || '';
  if (!content) return { proceed: true };

  const violations = TAMPERING_PATTERNS
    .filter((p) => (p.testOnly ? isTestFile : true))
    .filter((p) => p.pattern.test(content))
    .map((p) => p.message);

  if (violations.length === 0) return { proceed: true };

  const message = `Test tampering detected in ${filePath}:\n${violations.map((v) => `  • ${v}`).join('\n')}`;

  logger.info('Test tampering patterns detected', {
    context: 'test-tampering-detector',
    file: filePath,
    count: violations.length,
  });

  return { proceed: true, success: false, warnings: violations, message };
}

module.exports = {
  hook: ErrorHandler.wrapHook('test-tampering-detector', detectTampering),
  detectTampering,
  TAMPERING_PATTERNS,
  TEST_FILE_PATTERN,
  CONFIG_FILE_PATTERN,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(detectTampering, { name: 'test-tampering-detector' });
}
