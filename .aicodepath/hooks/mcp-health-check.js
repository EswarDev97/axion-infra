#!/usr/bin/env node
/**
 * AICodePath MCP Health Check Hook
 *
 * PreToolUse hook that detects MCP tool invocations and provides
 * informational context about which MCP server is being called.
 *
 * Since MCP servers are managed by the Claude Code runtime, this hook
 * cannot directly ping them. Instead it:
 *   1. Detects MCP tools (tool_name starts with 'mcp__')
 *   2. Extracts the server name from the tool_name
 *   3. Returns additionalContext so the model is aware of the MCP dependency
 *
 * This hook NEVER blocks (exit 2). At most it warns (exit 1).
 * It can be extended when MCP health APIs become available.
 *
 * @module hooks/mcp-health-check
 */

const logger = require('../lib/logger');

/**
 * Extract the MCP server name from a tool_name.
 *
 * Tool name format: mcp__<plugin_prefix>__<method>
 * Examples:
 *   mcp__plugin_context7_context7__query-docs   → context7
 *   mcp__some_server__some-tool                 → some_server
 *
 * Strategy: split on '__', take the middle segment, then extract
 * the last underscore-delimited token (the human-readable name).
 *
 * @param {string} toolName - The full MCP tool name
 * @returns {string} Extracted server name
 */
function extractServerName(toolName) {
  const parts = toolName.split('__');
  if (parts.length < 2) return 'unknown';

  const middle = parts[1] || 'unknown';

  // For patterns like "plugin_context7_context7", extract the last segment
  const segments = middle.split('_');
  return segments[segments.length - 1] || middle;
}

/**
 * Evaluate hook logic for MCP tool invocations.
 *
 * @param {Object} hookData - Claude Code hook payload
 * @returns {Object|null} Hook result with additionalContext for MCP tools, or null for non-MCP
 */
function execute(hookData) {
  const { shouldRunHook } = require('./lib/profile-resolver');
  const check = shouldRunHook('mcp-health-check', 'standard');
  if (!check.run) return null;

  const toolName = (hookData && hookData.tool_name) || '';

  // Only check MCP tools (tool_name starts with 'mcp__')
  if (!toolName.startsWith('mcp__')) return null;

  const serverName = extractServerName(toolName);

  logger.info(`MCP tool detected: ${toolName} (server: ${serverName})`, {
    context: 'mcp-health-check',
    server: serverName,
  });

  return {
    hookSpecificOutput: {
      additionalContext: `MCP server: ${serverName} — ensure server is running. If the tool call fails, check MCP server connectivity.`,
    },
  };
}

module.exports = {
  execute,
  extractServerName,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'mcp-health-check' });
}
