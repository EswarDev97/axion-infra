#!/usr/bin/env node
/**
 * AICodePath Pre-Commit Validator Hook
 *
 * Validates staged files against guidelines before git commit.
 * Blocks commits that contain error-level violations.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const ErrorHandler = require('../lib/error-handler');
const { ValidationError, FileSystemError } = require('../lib/errors');

// Import guideline validator
const guidelineValidator = require('./guideline-validator');

/**
 * Get list of staged files
 */
function getStagedFiles(projectPath) {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: projectPath,
      encoding: 'utf8',
    });

    return output
      .trim()
      .split('\n')
      .filter((f) => f.length > 0);
  } catch (e) {
    return [];
  }
}

/**
 * Check for secrets in content
 */
function checkForSecrets(content, filePath) {
  const secretPatterns = [
    {
      id: 'hardcoded-password',
      pattern: /(password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i,
      message: 'Hardcoded password detected',
    },
    {
      id: 'api-key',
      pattern: /(api[_-]?key|apikey)\s*[:=]\s*["'][^"']{16,}["']/i,
      message: 'Hardcoded API key detected',
    },
    {
      id: 'secret-key',
      pattern: /(secret[_-]?key|secretkey)\s*[:=]\s*["'][^"']{16,}["']/i,
      message: 'Hardcoded secret key detected',
    },
    {
      id: 'private-key',
      pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
      message: 'Private key detected in code',
    },
    {
      id: 'aws-access-key',
      pattern: /AKIA[0-9A-Z]{16}/,
      message: 'AWS access key detected',
    },
    {
      id: 'jwt-token',
      pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/,
      message: 'JWT token detected in code',
    },
  ];

  const violations = [];
  const lines = content.split('\n');

  for (const pattern of secretPatterns) {
    lines.forEach((line, index) => {
      if (pattern.pattern.test(line)) {
        violations.push({
          rule: pattern.id,
          severity: 'error',
          message: pattern.message,
          file: filePath,
          line: index + 1,
        });
      }
    });
  }

  return violations;
}

/**
 * Check for debug statements
 */
function checkForDebugStatements(content, filePath) {
  const debugPatterns = [
    {
      id: 'console-log',
      pattern: /console\.(log|debug|info|warn|error)\s*\(/,
      message: 'Console statement found - use logger instead',
      severity: 'warning',
    },
    {
      id: 'debugger',
      pattern: /\bdebugger\b/,
      message: 'Debugger statement found',
      severity: 'error',
    },
    {
      id: 'print-statement',
      pattern: /\bprint\s*\(/,
      message: 'Print statement found',
      severity: 'warning',
    },
  ];

  const violations = [];
  const lines = content.split('\n');

  for (const pattern of debugPatterns) {
    lines.forEach((line, index) => {
      // Skip if in comment
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
        return;
      }

      if (pattern.pattern.test(line)) {
        violations.push({
          rule: pattern.id,
          severity: pattern.severity,
          message: pattern.message,
          file: filePath,
          line: index + 1,
        });
      }
    });
  }

  return violations;
}

/**
 * Check for TODO without ticket reference
 */
function checkTodos(content, filePath) {
  const violations = [];
  const lines = content.split('\n');

  // Pattern for TODO without ticket reference (e.g., JIRA-123, #123, etc.)
  const todoPattern = /\bTODO\b(?!:?\s*[\[#]?[A-Z]+-\d+)/i;

  lines.forEach((line, index) => {
    if (todoPattern.test(line)) {
      violations.push({
        rule: 'todo-without-ticket',
        severity: 'warning',
        message: 'TODO without ticket reference',
        file: filePath,
        line: index + 1,
      });
    }
  });

  return violations;
}

/**
 * Validate a single file
 */
async function validateFile(filePath, projectPath) {
  const fullPath = path.join(projectPath, filePath);

  // Skip non-code files
  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs'];
  const ext = path.extname(filePath);
  if (!codeExtensions.includes(ext)) {
    return { file: filePath, violations: [], skipped: true };
  }

  let content;
  try {
    content = await fs.readFile(fullPath, 'utf8');
  } catch (e) {
    return { file: filePath, violations: [], error: 'Could not read file' };
  }

  const violations = [];

  // Run all checks
  violations.push(...checkForSecrets(content, filePath));
  violations.push(...checkForDebugStatements(content, filePath));
  violations.push(...checkTodos(content, filePath));

  // Check if this is a test file (skip authenticity check for tests)
  const isTestFile =
    /\.(test|spec)\./.test(filePath) ||
    filePath.includes('__tests__') ||
    filePath.includes('/test/');

  // Run guideline validator
  const guidelineResults = await guidelineValidator.validateContent(content, filePath, projectPath);
  violations.push(...guidelineResults.violations);

  return {
    file: filePath,
    violations,
    errorCount: violations.filter((v) => v.severity === 'error').length,
    warningCount: violations.filter((v) => v.severity === 'warning').length,
    authenticity: guidelineResults.authenticity,
    isTestFile,
  };
}

/**
 * Validate all staged files
 */
async function validateStagedFiles(projectPath = process.cwd()) {
  const stagedFiles = getStagedFiles(projectPath);

  if (stagedFiles.length === 0) {
    return {
      files: [],
      totalErrors: 0,
      totalWarnings: 0,
      authenticityFails: [],
      commitAllowed: true,
    };
  }

  const results = await Promise.all(stagedFiles.map((file) => validateFile(file, projectPath)));

  const totalErrors = results.reduce((sum, r) => sum + (r.errorCount || 0), 0);
  const totalWarnings = results.reduce((sum, r) => sum + (r.warningCount || 0), 0);

  // Check for authenticity failures (skip test files)
  const authenticityFails = results.filter(
    (r) => !r.isTestFile && r.authenticity?.status === 'FAIL'
  );

  return {
    files: results,
    totalErrors,
    totalWarnings,
    authenticityFails,
    commitAllowed: totalErrors === 0 && authenticityFails.length === 0,
  };
}

/**
 * Format results as markdown with emoji status indicators
 */
function formatResults(results) {
  const lines = [];

  if (!results.commitAllowed) {
    lines.push('## ❌ Commit Blocked\n');
    lines.push('The following violations must be fixed before committing:\n');
  } else if (results.totalWarnings > 0) {
    lines.push('## ⚠️ Commit Allowed with Warnings\n');
  } else {
    lines.push('## ✅ Pre-Commit Validation Passed\n');
  }

  // Group by severity
  const errors = [];
  const warnings = [];

  for (const file of results.files) {
    for (const v of file.violations || []) {
      if (v.severity === 'error') {
        errors.push(v);
      } else {
        warnings.push(v);
      }
    }
  }

  if (errors.length > 0) {
    lines.push('### 🔴 Error-Level Violations (must fix)\n');
    lines.push('| File | Line | Violation |');
    lines.push('|------|------|-----------|');

    for (const v of errors) {
      lines.push(`| ${v.file} | ${v.line} | ${v.message} |`);
    }
    lines.push('');
  }

  // Add authenticity failures section
  if (results.authenticityFails && results.authenticityFails.length > 0) {
    lines.push('### 🔴 Authenticity Failures (must fix)\n');
    lines.push('| File | Score | Issue |');
    lines.push('|------|-------|-------|');

    for (const r of results.authenticityFails) {
      const score = r.authenticity?.score || 0;
      lines.push(`| ${r.file} | ${score}/100 | Contains mock/stub implementations |`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('### 🟡 Warning-Level Violations (should fix)\n');
    lines.push('| File | Line | Violation |');
    lines.push('|------|------|-----------|');

    for (const v of warnings) {
      lines.push(`| ${v.file} | ${v.line} | ${v.message} |`);
    }
    lines.push('');
  }

  lines.push('---\n');
  lines.push("> **WHAT'S NEXT?**");
  lines.push('>');
  lines.push("> 🔧 **Fix Violations** - I'll help fix these issues");
  lines.push('> ⚡ **Override** - Commit anyway (NOT RECOMMENDED for errors)');

  return lines.join('\n');
}

/**
 * Generate audit log entry
 */
function generateAuditEntry(results, commitMessage) {
  const timestamp = new Date().toISOString();

  return `
## Pre-Commit Validation
**Timestamp**: ${timestamp}
**Commit Message**: ${commitMessage || 'N/A'}

**Files Checked**: ${results.files.length}
**Errors Found**: ${results.totalErrors}
**Warnings Found**: ${results.totalWarnings}

**Result**: ${results.commitAllowed ? 'PASSED' : 'BLOCKED'}

---
`;
}

/**
 * Hook implementation
 * Called by Claude Code before git commit operations
 */
async function preCommitValidatorImpl(params) {
  // Defensive: ensure params exist and tool is Bash
  if (!params || !params.tool_input) {
    return { proceed: true };
  }

  // Only run on Bash tool
  if (params.tool_name !== 'Bash') {
    return { proceed: true };
  }

  const { tool_input, project_path } = params;

  // Check if this is a git commit command
  const command = tool_input.command || '';
  if (!command.includes('git commit')) {
    return { proceed: true };
  }

  const results = await validateStagedFiles(project_path);

  // Record validation to database
  try {
    const ValidationRecorder = require('../lib/validation-recorder');
    const recorder = new ValidationRecorder(project_path);
    const score = results.commitAllowed ? 100 : 0;
    const status = results.commitAllowed ? 'passed' : 'failed';

    recorder.recordValidation(
      null,
      'pre-commit-staged-files',
      'guideline',
      score,
      status,
      JSON.stringify(results.violations || [])
    );
    recorder.close();
  } catch (err) {
    throw new FileSystemError(`Failed to record validation: ${err.message}`);
  }

  if (!results.commitAllowed) {
    throw new ValidationError(
      formatResults(results),
      results.violations || []
    );
  }

  if (results.totalWarnings > 0) {
    return {
      proceed: true,
      message: formatResults(results),
      results,
    };
  }

  return {
    proceed: true,
    message: `Pre-commit validation passed: ${results.files.length} files checked, no violations found`,
  };
}

module.exports = {
  hook: ErrorHandler.wrapHook('pre-commit-validator', preCommitValidatorImpl),
  validateStagedFiles,
  validateFile,
  getStagedFiles,
  formatResults,
  generateAuditEntry,
  checkForSecrets,
  checkForDebugStatements,
  checkTodos,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(preCommitValidatorImpl, { name: 'pre-commit-validator' });
}
