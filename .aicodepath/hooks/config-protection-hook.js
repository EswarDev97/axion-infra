#!/usr/bin/env node
/**
 * AICodePath Config Protection Hook
 *
 * PreToolUse hook that blocks Write/Edit operations on protected
 * configuration and infrastructure files.
 *
 * Protected categories:
 * - Guideline JSON files (.aicodepath/guidelines/*.json)
 * - Hook registry (hooks.json)
 * - Hook utility library (.aicodepath/hooks/lib/*.js)
 * - Linter/formatter configs (.eslintrc, .prettierrc, biome.json, tsconfig.json)
 *
 * @module hooks/config-protection-hook
 */

'use strict';

const ErrorHandler = require('../lib/error-handler');
const logger = require('../lib/logger');

/**
 * Patterns for protected files — edits are blocked when matched.
 * Paths are tested after normalization (leading ./ and absolute prefixes removed).
 *
 * @type {RegExp[]}
 */
const PROTECTED_PATTERNS = [
  /^\.aicodepath\/guidelines\/.*\.json$/,
  /^\.aicodepath\/hooks\/hooks\.json$/,
  /^\.aicodepath\/hooks\/lib\/.*\.js$/,
  /^\.eslintrc/,
  /^\.prettierrc/,
  /^tsconfig\.json$/,
  /^biome\.json$/,
];

/**
 * Normalize a file path for matching.
 * Strips leading ./ and any absolute project prefix up to the project-relative path.
 *
 * @param {string} filePath - Raw file path from hook input
 * @returns {string} Normalized relative path
 */
function normalizePath(filePath) {
  let normalized = filePath;

  // Strip absolute prefix: anything before .aicodepath/ or common project roots
  const aicodeIdx = normalized.indexOf('.aicodepath/');
  if (aicodeIdx > 0) {
    normalized = normalized.substring(aicodeIdx);
  } else {
    // For non-.aicodepath paths, strip everything up to the last path segment
    // that starts the relative path (remove /home/user/project/ prefix)
    const segments = ['tsconfig.json', 'biome.json', '.eslintrc', '.prettierrc'];
    for (const seg of segments) {
      const idx = normalized.indexOf(seg);
      if (idx > 0) {
        normalized = normalized.substring(idx);
        break;
      }
    }
  }

  // Strip leading ./
  if (normalized.startsWith('./')) {
    normalized = normalized.substring(2);
  }

  return normalized;
}

/**
 * Detect if we are working on the AICodePath framework itself (not a user project).
 * When developing the framework, edits to hooks/lib and guidelines are expected.
 *
 * @returns {boolean} True if this is the framework source repo
 */
function isFrameworkRepo() {
  try {
    const fs = require('fs');
    const path = require('path');
    // The framework repo has .aicodepath/DEVELOPER-GUIDE.md at its root
    // User projects that install AICodePath do NOT have this file
    const devGuide = path.join(process.cwd(), '.aicodepath', 'DEVELOPER-GUIDE.md');
    return fs.existsSync(devGuide);
  } catch (_) {
    return false;
  }
}

/**
 * Evaluate whether the target file is protected.
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result with decision/reason
 */
function execute(hookData) {
  if (!hookData || !hookData.tool_input) {
    return { decision: 'allow' };
  }

  const filePath = hookData.tool_input.file_path || '';
  if (!filePath) {
    return { decision: 'allow' };
  }

  // Profile check — this hook is minimal tier (always runs)
  try {
    const { shouldRunHook } = require('./lib/profile-resolver');
    const check = shouldRunHook('config-protection-hook', 'minimal');
    if (!check.run) {
      return { decision: 'allow' };
    }
  } catch (_err) {
    // Profile resolver unavailable — proceed with check (fail-closed for protection)
  }

  // Framework developers need to edit hooks/lib and guidelines — allow in framework repo
  if (isFrameworkRepo()) {
    return { decision: 'allow' };
  }

  const normalized = normalizePath(filePath);

  for (const pattern of PROTECTED_PATTERNS) {
    if (pattern.test(normalized)) {
      const reason = `Protected config file: ${normalized} — manual confirmation required. This file affects framework-wide quality rules or tooling configuration.`;

      logger.info('Config protection triggered', {
        context: 'config-protection-hook',
        file: normalized,
        pattern: pattern.toString(),
      });

      return {
        decision: 'block',
        reason,
      };
    }
  }

  return { decision: 'allow' };
}

module.exports = {
  hook: ErrorHandler.wrapHook('config-protection-hook', execute),
  execute,
  PROTECTED_PATTERNS,
  normalizePath,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'config-protection-hook' });
}
