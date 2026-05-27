/**
 * Validate Command
 *
 * Runs the guideline validator against specified files (or staged git files
 * when no pattern is given) and prints a human-readable report.
 *
 * @module commands/validate
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pathResolver = require('../lib/path-resolver');
const logger = require('../lib/logger');

/**
 * Collect files to validate.
 * @param {string|undefined} filePatterns - Comma-separated glob patterns
 * @returns {string[]} Absolute file paths
 */
function collectFiles(filePatterns) {
  if (filePatterns) {
    const patterns = filePatterns.split(',').map(p => p.trim()).filter(Boolean);
    const files = [];
    for (const pattern of patterns) {
      try {
        const output = execSync(`find . -path "./.git" -prune -o -name "${pattern}" -print`, {
          encoding: 'utf8',
          cwd: pathResolver.findProjectRoot(),
        });
        files.push(...output.trim().split('\n').filter(Boolean));
      } catch {
        // pattern may yield no results
      }
    }
    return [...new Set(files)];
  }

  // Default: staged files from git
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
      cwd: pathResolver.findProjectRoot(),
    });
    return output.trim().split('\n').filter(f => f.endsWith('.js') || f.endsWith('.ts'));
  } catch {
    return [];
  }
}

/**
 * Run validate command.
 * @param {Object} options
 * @param {string} [options.files] - Comma-separated file patterns
 */
async function validateCommand(options = {}) {
  const files = collectFiles(options.files);

  if (files.length === 0) {
    console.log('ℹ️  No files to validate (no staged JS/TS files and no --files pattern given).\n');
    return;
  }

  let GuidelineValidator;
  try {
    GuidelineValidator = require('../hooks/guideline-validator');
  } catch (err) {
    console.error('❌ Could not load guideline-validator:', err.message);
    process.exit(1);
  }

  const projectRoot = pathResolver.findProjectRoot();
  let totalViolations = 0;
  let filesWithViolations = 0;

  console.log(`\n🔍 Validating ${files.length} file(s)...\n`);

  for (const relFile of files) {
    const absFile = path.isAbsolute(relFile) ? relFile : path.join(projectRoot, relFile);
    if (!fs.existsSync(absFile)) continue;

    let content;
    try {
      content = fs.readFileSync(absFile, 'utf8');
    } catch {
      continue;
    }

    let violations = [];
    try {
      const result = await GuidelineValidator.validateContent(content, absFile, projectRoot);
      violations = result.violations || [];
    } catch (err) {
      logger.warn('Validation failed for file', { file: relFile, error: err.message });
      continue;
    }

    if (violations.length > 0) {
      filesWithViolations++;
      totalViolations += violations.length;
      console.log(`❌ ${relFile} (${violations.length} violation${violations.length === 1 ? '' : 's'})`);
      for (const v of violations) {
        console.log(`   [${v.severity || 'warning'}] ${v.message || v.description || JSON.stringify(v)}`);
      }
      console.log('');
    } else {
      console.log(`✅ ${relFile}`);
    }
  }

  console.log('');
  if (totalViolations === 0) {
    console.log(`✅ All ${files.length} file(s) passed validation.\n`);
  } else {
    console.log(`❌ Found ${totalViolations} violation(s) in ${filesWithViolations} file(s).\n`);
    process.exit(1);
  }
}

module.exports = validateCommand;
