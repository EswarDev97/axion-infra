#!/usr/bin/env node
/**
 * Agent Audit On Write Hook (F1)
 *
 * PostToolUse:Write|Edit hook — fires after an agent .md file is written.
 * Runs quickWiringCheck() and emits a systemMessage warning if the agent
 * is not fully wired. Non-blocking (exit 1 = warning, not block).
 *
 * Only activates when the written file matches:
 *   .aicodepath/agents/<name>.md
 *
 * @module hooks/agent-audit-on-write
 */

'use strict';

const path = require('path');
const { quickWiringCheck } = require('./lib/agent-wiring-check');
const logger = require('../lib/logger');

const AGENT_DIR_SEGMENT = path.join('.aicodepath', 'agents') + path.sep;

/**
 * Determine if the written file is an agent definition file.
 * @param {string} filePath - Absolute or project-relative path
 * @returns {string|null} Agent name (without .md) or null if not an agent file
 */
function extractAgentName(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const segment = '.aicodepath/agents/';
  const idx = normalized.indexOf(segment);
  if (idx === -1) return null;

  const rest = normalized.slice(idx + segment.length);
  // Must be a direct child .md (no subdirectory)
  if (!rest.endsWith('.md') || rest.includes('/')) return null;

  return rest.slice(0, -3); // strip .md
}

/**
 * Hook implementation.
 * @param {object} context - Claude Code PostToolUse stdin context
 * @returns {object} Hook result
 */
async function agentAuditOnWriteImpl(context) {
  const filePath = context.tool_input?.file_path || context.tool_result?.file_path || '';
  const agentName = extractAgentName(filePath);

  // Not an agent file — pass through silently
  if (!agentName) {
    return {};
  }

  logger.info(`Agent write detected: ${agentName}`, { context: 'agent-audit-on-write' });

  let result;
  try {
    result = quickWiringCheck(agentName);
  } catch (err) {
    // Unknown agent or filesystem error — warn but don't block
    logger.warn(`Wiring check failed for ${agentName}: ${err.message}`, { context: 'agent-audit-on-write' });
    return {
      hookSpecificOutput: {
        additionalContext: `⚠️  Agent wiring check failed for \`${agentName}\`: ${err.message}`
      }
    };
  }

  if (result.score === result.max) {
    // Fully wired — no message needed
    return {};
  }

  const missing = result.missing.join(', ');
  const message =
    `⚠️  Agent \`${agentName}\` is not fully wired (${result.score}/${result.max}).\n` +
    `Missing: ${missing}\n` +
    `Run \`acp agent audit ${agentName} --check-wiring\` for details.`;

  return {
    hookSpecificOutput: {
      additionalContext: message
    }
  };
}

module.exports = {
  hook: agentAuditOnWriteImpl,
  extractAgentName,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(agentAuditOnWriteImpl, { name: 'agent-audit-on-write' });
}
