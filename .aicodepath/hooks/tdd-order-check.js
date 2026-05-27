#!/usr/bin/env node
/**
 * AICodePath TDD Order Check Hook
 *
 * PostToolUse Write|Edit hook that warns when production code is written
 * before a test file in the current session.
 *
 * Tracks file writes in-session state. If a source file is written without
 * a corresponding test file being written first in the same session, emits
 * a TDD violation warning.
 *
 * Warn-only — does NOT block. TDD enforcement is advisory.
 *
 * Detection heuristic:
 *   - Production file: NOT a test file AND NOT a docs/config/migration file
 *   - Test file: matches TEST_FILE_PATTERN
 *   - Violation: production file written AND session has no preceding test write
 *
 * @module hooks/tdd-order-check
 */

const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');
const ErrorHandler = require('../lib/error-handler');

/** Matches test files */
const TEST_FILE_PATTERN = /(?:\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$|__tests__[\\/]|[\\/]tests?[\\/].*\.(js|ts|jsx|tsx|py|go)$|_test\.go$|test_.*\.py$)/i;

/** Matches non-production files (docs, config, migrations, assets, styles) */
const NON_PRODUCTION_PATTERN = /(?:\.md$|\.json$|\.yaml$|\.yml$|\.sql$|\.css$|\.scss$|\.less$|\.svg$|\.png$|\.jpg$|\.ico$|SKILL\.md$|CLAUDE\.md$|README|CHANGELOG|\.env\.example$|aicodepath-docs[\\/]|\.aicodepath[\\/]docs[\\/])/i;

/** Matches vendor/generated files that should be excluded */
const EXCLUDED_PATTERN = /(?:node_modules[\\/]|dist[\\/]|build[\\/]|\.git[\\/]|coverage[\\/]|\.next[\\/]|__pycache__)/i;

/** In-memory session state: tracks files written in this process session */
const _sessionState = {
  testFilesWritten: new Set(),
  productionFilesWritten: [],
};

/**
 * Determine if a file path is a production source file.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function isProductionFile(filePath) {
  if (!filePath) return false;
  if (EXCLUDED_PATTERN.test(filePath)) return false;
  if (TEST_FILE_PATTERN.test(filePath)) return false;
  if (NON_PRODUCTION_PATTERN.test(filePath)) return false;

  // Must have a source file extension
  return /\.(js|ts|jsx|tsx|mjs|cjs|py|go|rb|java|cs|php|rs|swift|kt)$/.test(filePath);
}

/**
 * Derive the expected test file path pattern for a production file.
 * Returns a simplified base name to check for related test writes.
 *
 * @param {string} filePath
 * @returns {string} Base name without extension
 */
function getBaseNameForMatch(filePath) {
  const basename = path.basename(filePath);
  return basename.replace(/\.(js|ts|jsx|tsx|mjs|cjs|py|go|rb|java|cs|php|rs|swift|kt)$/, '');
}

/**
 * Check if a test was written for a given production file base name.
 *
 * @param {string} baseName
 * @returns {boolean}
 */
function hasTestForFile(baseName) {
  for (const testFile of _sessionState.testFilesWritten) {
    const testBase = path.basename(testFile).replace(/\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/, '').replace(/^test_/, '');
    if (testBase.includes(baseName) || baseName.includes(testBase)) return true;
  }
  return false;
}

/**
 * Check TDD order: warn if production code written before test.
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result
 */
function checkTddOrder(hookData) {
  if (!hookData?.tool_name) return { proceed: true };

  const toolName = hookData.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') return { proceed: true };

  const filePath = hookData.tool_input?.file_path || '';
  if (!filePath) return { proceed: true };

  // Track test file writes
  if (TEST_FILE_PATTERN.test(filePath)) {
    _sessionState.testFilesWritten.add(filePath);
    logger.info('Test file recorded', { context: 'tdd-order-check', file: filePath });
    return { proceed: true };
  }

  // Check production file writes
  if (!isProductionFile(filePath)) return { proceed: true };

  _sessionState.productionFilesWritten.push(filePath);

  const baseName = getBaseNameForMatch(filePath);
  const testExistsFirst = hasTestForFile(baseName);

  if (!testExistsFirst) {
    const message = `[TDD] Production code written before test: ${path.basename(filePath)}\n  Write a failing test for this file first, then implement.`;

    logger.info('TDD order violation detected', {
      context: 'tdd-order-check',
      file: filePath,
      testFilesInSession: _sessionState.testFilesWritten.size,
    });

    return {
      proceed: true,
      success: false,
      warnings: [message],
      message,
    };
  }

  return { proceed: true };
}

/**
 * Reset session state (for testing).
 */
function resetSessionState() {
  _sessionState.testFilesWritten.clear();
  _sessionState.productionFilesWritten.length = 0;
}

module.exports = {
  hook: ErrorHandler.wrapHook('tdd-order-check', checkTddOrder),
  checkTddOrder,
  isProductionFile,
  getBaseNameForMatch,
  hasTestForFile,
  resetSessionState,
  TEST_FILE_PATTERN,
  NON_PRODUCTION_PATTERN,
  _sessionState,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(checkTddOrder, { name: 'tdd-order-check' });
}
