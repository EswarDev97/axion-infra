#!/usr/bin/env node
/**
 * Framework Asset Quality Hook
 *
 * PostToolUse:Write|Edit hook — fires after a framework asset file is written.
 * Emits a mandatory additionalContext directive instructing Claude to invoke
 * the appropriate meta-skill (skill-audit, agent-audit, hook-audit).
 *
 * Detects:
 *   .aicodepath/skills/<name>/SKILL.md → directive for /aicodepath-skill-audit
 *   .aicodepath/agents/<name>.md       → directive for /aicodepath-agent-audit
 *   .aicodepath/hooks/<name>.js        → directive for /aicodepath-hook-audit
 *
 * Complements agent-audit-on-write.js (wiring check) — this hook handles
 * quality audit invocation; the wiring hook handles structural registration.
 *
 * @module hooks/framework-asset-quality-hook
 */

'use strict';

const logger = require('../lib/logger');

/**
 * Classify the written file as a framework asset and extract metadata.
 * @param {string} filePath
 * @returns {{ type: 'skill'|'agent'|'hook', name: string } | null}
 */
function classifyAsset(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');

  // .aicodepath/skills/<name>/SKILL.md
  const skillMatch = normalized.match(/\.aicodepath\/skills\/([^/]+)\/SKILL\.md$/);
  if (skillMatch) return { type: 'skill', name: skillMatch[1] };

  // .aicodepath/agents/<name>.md (direct child only, not subdirectory)
  const agentMatch = normalized.match(/\.aicodepath\/agents\/([^/]+)\.md$/);
  if (agentMatch) return { type: 'agent', name: agentMatch[1] };

  // .aicodepath/hooks/<name>.js (direct child only, not lib/)
  const hookMatch = normalized.match(/\.aicodepath\/hooks\/([^/]+)\.js$/);
  if (hookMatch) return { type: 'hook', name: hookMatch[1] };

  return null;
}

const DIRECTIVES = {
  skill: (name) =>
    `MANDATORY: Framework skill \`${name}\` (SKILL.md) was just written.\n` +
    `Invoke \`/aicodepath-skill-audit ${name}\` now to score across all 8 quality dimensions.\n` +
    `If audit score < 90 (not Grade A), immediately invoke \`/aicodepath-skill-improver ${name}\` ` +
    `to run the autonomous improvement loop.\n` +
    `Do NOT return control to the user until the audit is complete.`,

  agent: (name) =>
    `MANDATORY: Framework agent \`${name}\` was just written.\n` +
    `Invoke \`/aicodepath-agent-audit ${name}\` now to score across all 6 quality dimensions.\n` +
    `If audit score < 70 (Grade D/F), automatically transition to improve mode.\n` +
    `Do NOT return control to the user until the audit is complete.`,

  hook: (name) =>
    `MANDATORY: Framework hook \`${name}\` was just written.\n` +
    `Invoke \`/aicodepath-hook-audit ${name}\` now to score across all 6 quality dimensions.\n` +
    `If audit score < 70 (Grade D/F), automatically transition to improve mode.\n` +
    `Do NOT return control to the user until the audit is complete.`,
};

/**
 * Hook implementation.
 * @param {object} context - Claude Code PostToolUse stdin context
 * @returns {object} Hook result
 */
async function frameworkAssetQualityImpl(context) {
  const filePath = context.tool_input?.file_path || context.tool_result?.file_path || '';
  const asset = classifyAsset(filePath);

  // Not a framework asset file — pass through silently
  if (!asset) return {};

  logger.info(`Framework asset write detected: ${asset.type} → ${asset.name}`, {
    context: 'framework-asset-quality-hook',
  });

  return {
    hookSpecificOutput: {
      additionalContext: DIRECTIVES[asset.type](asset.name),
    },
  };
}

module.exports = {
  hook: frameworkAssetQualityImpl,
  classifyAsset,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(frameworkAssetQualityImpl, { name: 'framework-asset-quality-hook' });
}
