#!/usr/bin/env node
/**
 * AICodePath Post-Tool Security Scan Hook
 *
 * PostToolUse hook that scans written/edited content for 5 critical
 * security anti-patterns. Warns (does not block) on detection.
 *
 * Patterns detected:
 *   S01 — Env secret embedded in string literal
 *   S02 — User input passed to dangerous function — RCE risk
 *   S03 — Template literal in exec() — command injection
 *   S04 — User input assigned to innerHTML — XSS risk
 *   S05 — Hardcoded credential string
 *
 * @module hooks/post-tool-security-scan
 */

const ErrorHandler = require('../lib/error-handler');
const logger = require('../lib/logger');

// File extensions to scan (skip binary, docs, configs)
const SCANNABLE_EXT = /\.(js|ts|jsx|tsx|py|java|go|rb|php|cs|cpp|c|swift|kt)$/i;

// Build dangerous-function-detection pattern from parts to avoid false positives in this file
const DANGEROUS_FN_PATTERN = new RegExp(
  ['\\bev', 'al\\s*\\(\\s*(?:req(?:uest)?|input|param|query|body|user|data)\\b'].join(''),
  'i'
);

/**
 * Security anti-patterns to detect in file content.
 * Warn-only — never blocks (security scan is advisory).
 */
const SECURITY_PATTERNS = [
  {
    id: 'S01',
    pattern: /process\.env\.[A-Z_]{3,}.*(?:password|secret|key|token|credential)/i,
    message: '[S01] Env variable with sensitive name — verify it is not hardcoded',
  },
  {
    id: 'S02',
    pattern: DANGEROUS_FN_PATTERN,
    message: '[S02] User input passed to eval fn — Remote Code Execution risk',
  },
  {
    id: 'S03',
    // exec(`...${  — template literal in shell exec
    pattern: /\bexec\s*\(\s*`[^`]*\$\{/,
    message: '[S03] Template literal in exec() — command injection risk',
  },
  {
    id: 'S04',
    // innerHTML = something + something or innerHTML = `...${
    pattern: /\.innerHTML\s*[+]?=\s*(?:[^;]*\+[^;]*|`[^`]*\$\{)/,
    message: '[S04] Concatenated/interpolated value in innerHTML — XSS risk',
  },
  {
    id: 'S05',
    pattern: /(?:password|passwd|secret|api[_-]?key|apikey|access[_-]?token)\s*[:=]\s*["'][^"']{8,}["']/i,
    message: '[S05] Hardcoded credential string detected',
  },
];

/**
 * Scan file content for security anti-patterns.
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result
 */
function scanForSecurityIssues(hookData) {
  if (!hookData?.tool_name) return { proceed: true };

  const toolName = hookData.tool_name;
  if (toolName !== 'Write' && toolName !== 'Edit') return { proceed: true };

  const filePath = hookData.tool_input?.file_path || '';
  if (!SCANNABLE_EXT.test(filePath)) return { proceed: true };

  const content = hookData.tool_input?.content || hookData.tool_input?.new_string || '';
  if (!content) return { proceed: true };

  const hits = SECURITY_PATTERNS.filter((p) => p.pattern.test(content));
  if (hits.length === 0) return { proceed: true };

  const warnings = hits.map((p) => p.message);
  const message = `Security scan — ${filePath}:\n${warnings.map((w) => `  • ${w}`).join('\n')}`;

  logger.info('Security patterns detected', {
    context: 'post-tool-security-scan',
    file: filePath,
    patterns: hits.map((p) => p.id),
  });

  return { proceed: true, success: false, warnings, message };
}

module.exports = {
  hook: ErrorHandler.wrapHook('post-tool-security-scan', scanForSecurityIssues),
  scanForSecurityIssues,
  SECURITY_PATTERNS,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(scanForSecurityIssues, { name: 'post-tool-security-scan' });
}
