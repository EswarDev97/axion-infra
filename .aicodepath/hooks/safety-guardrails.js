#!/usr/bin/env node
/**
 * AICodePath Safety Guardrails Hook
 *
 * PreToolUse hook that enforces 6 declarative safety rules (R01-R06)
 * against dangerous commands and protected file paths.
 *
 * Rules are evaluated sequentially; first match short-circuits evaluation.
 * Default action on no match: allow (approve).
 * R06 (force-push) is NEVER bypassable.
 *
 * @module hooks/safety-guardrails
 */

const ErrorHandler = require('../lib/error-handler');
const logger = require('../lib/logger');

// Protected file/path patterns — never write to these
const PROTECTED_PATH_PATTERN = /(?:^|[\\/])(?:\.git[\\/]|\.env(?:\.[^/\\]*)?$|id_rsa|id_ed25519|authorized_keys|known_hosts|.*\.pem$|.*\.key$|.*\.p12$|.*\.pfx$)/i;

// Shell redirects targeting protected paths (e.g., `echo x > .env`, `tee .git/config`)
const SHELL_REDIRECT_TO_PROTECTED = /(?:>>?\s*|tee\s+)(?:\.env(?:\.[^\s]*)?|\.git[\\/]|id_rsa|id_ed25519|.*\.pem|.*\.key|.*\.p12|.*\.pfx)/i;

/**
 * Declarative guard rules — evaluated in order, first match wins.
 *
 * @type {Array<{id: string, tools: string[], test: Function, decision: 'block'|'warn', message: string}>}
 */
const GUARD_RULES = [
  {
    id: 'R01',
    tools: ['Bash'],
    test: (input) => /(?:^|\s)sudo\s/.test(input),
    decision: 'block',
    message: '[R01] sudo commands are blocked. Use project-scoped permissions instead.',
  },
  {
    id: 'R02',
    tools: ['Write', 'Edit'],
    test: (input) => PROTECTED_PATH_PATTERN.test(input),
    decision: 'block',
    message: '[R02] Writing to protected path blocked (.git/, .env, SSH keys, certificates).',
  },
  {
    id: 'R03',
    tools: ['Bash'],
    test: (input) => SHELL_REDIRECT_TO_PROTECTED.test(input),
    decision: 'block',
    message: '[R03] Shell redirect to protected file blocked. Do not write to .env, .git, or key files via shell.',
  },
  {
    id: 'R04',
    tools: ['Bash'],
    test: (input) => /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*|--recursive\s+--force|--force\s+--recursive)\s+(?:\/|~|\.\.\/|\/home|\/usr|\/var|\/etc|\/opt)/.test(input),
    decision: 'block',
    message: '[R04] Destructive rm targeting system/home directories is blocked.',
  },
  {
    id: 'R05',
    tools: ['Bash'],
    test: (input) => /\brm\s+(?:-[a-zA-Z]*[rf][a-zA-Z]*\s+.*|--recursive|--force)/.test(input),
    decision: 'warn',
    message: '[R05] Recursive/force rm detected. Verify target path is correct before proceeding.',
  },
  {
    id: 'R06',
    tools: ['Bash'],
    test: (input) => /\bgit\s+push\b.*(?:--force(?!-with-lease)|-f\b)/.test(input),
    decision: 'block',
    message: '[R06] git push --force is permanently blocked. Use --force-with-lease for safe force pushes, or use a new commit/branch.',
  },
];

/**
 * Evaluate guard rules against hook input.
 * Sequential evaluation — first matching rule short-circuits.
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object} Hook result
 */
function evaluateGuardRules(hookData) {
  if (!hookData || !hookData.tool_name) {
    return { decision: 'allow' };
  }

  const toolName = hookData.tool_name;
  const input = toolName === 'Bash'
    ? (hookData.tool_input?.command || '')
    : (hookData.tool_input?.file_path || '');

  if (!input) {
    return { decision: 'allow' };
  }

  for (const rule of GUARD_RULES) {
    if (!rule.tools.includes(toolName)) continue;

    if (rule.test(input)) {
      logger.info(`Safety rule triggered: ${rule.id}`, {
        context: 'safety-guardrails',
        rule: rule.id,
        tool: toolName,
        decision: rule.decision,
      });

      if (rule.decision === 'block') {
        return {
          decision: 'block',
          reason: rule.message,
        };
      }

      if (rule.decision === 'warn') {
        return {
          decision: 'allow',
          reason: rule.message,
          hookSpecificOutput: { additionalContext: `⚠️ ${rule.message}` },
        };
      }
    }
  }

  return { decision: 'allow' };
}

module.exports = {
  hook: ErrorHandler.wrapHook('safety-guardrails', evaluateGuardRules),
  evaluateGuardRules,
  GUARD_RULES,
  PROTECTED_PATH_PATTERN,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(evaluateGuardRules, { name: 'safety-guardrails' });
}
