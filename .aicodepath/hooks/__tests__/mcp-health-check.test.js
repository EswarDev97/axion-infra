#!/usr/bin/env node
/**
 * Tests for mcp-health-check.js
 *
 * Covers: non-MCP passthrough, MCP server name extraction,
 * unreachable simulation, and Bash passthrough.
 */

let passed = 0;
let failed = 0;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) throw new Error(message || 'Expected true');
}

function assertFalse(condition, message) {
  if (condition) throw new Error(message || 'Expected false');
}

// Stub profile-resolver so shouldRunHook always returns { run: true }
// This avoids needing config.json or env vars during testing.
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === './lib/profile-resolver' || request.endsWith('lib/profile-resolver')) {
    return 'profile-resolver-stub';
  }
  return originalResolveFilename.call(this, request, parent, ...rest);
};
require.cache['profile-resolver-stub'] = {
  id: 'profile-resolver-stub',
  filename: 'profile-resolver-stub',
  loaded: true,
  exports: {
    shouldRunHook: () => ({ run: true }),
    resolveProfile: () => 'standard',
  },
};

const { execute } = require('../mcp-health-check');

console.log(`\n${colors.bold}MCP Health Check Tests${colors.reset}\n`);

// --- Test 1: Non-MCP tool (Read) passes through ---
test('Non-MCP tool "Read" returns success with no context', () => {
  const result = execute({ tool_name: 'Read' });
  // Should return a simple success (no hookSpecificOutput)
  assertTrue(!result || !result.hookSpecificOutput,
    'Non-MCP tool should not get MCP context');
});

// --- Test 2: MCP tool extracts server name ---
test('MCP tool extracts server name "context7" and returns context', () => {
  const result = execute({ tool_name: 'mcp__plugin_context7_context7__query-docs' });
  assertTrue(!!result, 'Should return a result object');
  assertTrue(!!result.hookSpecificOutput, 'Should have hookSpecificOutput');
  assertTrue(!!result.hookSpecificOutput.additionalContext, 'Should have additionalContext');
  assertTrue(
    result.hookSpecificOutput.additionalContext.includes('context7'),
    `Context should mention "context7", got: ${result.hookSpecificOutput.additionalContext}`
  );
});

// --- Test 3: Simulated unreachable MCP returns warning, not block ---
test('MCP hook never blocks — returns context/warning only', () => {
  const result = execute({ tool_name: 'mcp__some_server__some-tool' });
  // Must NOT have decision: 'block'
  assertTrue(!result || result.decision !== 'block',
    'MCP health check must never block');
  // Should still provide context
  assertTrue(!!result && !!result.hookSpecificOutput,
    'Should provide informational context for MCP tools');
});

// --- Test 4: Bash tool passes through ---
test('Non-MCP tool "Bash" returns success with no context', () => {
  const result = execute({ tool_name: 'Bash' });
  assertTrue(!result || !result.hookSpecificOutput,
    'Bash tool should not get MCP context');
});

// --- Test 5: Missing tool_name passes through ---
test('Missing tool_name returns success', () => {
  const result = execute({});
  assertTrue(!result || !result.hookSpecificOutput,
    'Missing tool_name should pass through');
});

// --- Test 6: Null hookData passes through ---
test('Null hookData returns success', () => {
  const result = execute(null);
  assertTrue(!result || !result.hookSpecificOutput,
    'Null hookData should pass through');
});

// Summary
console.log(`\n${colors.bold}Results: ${passed} passed, ${failed} failed${colors.reset}\n`);
process.exit(failed > 0 ? 1 : 0);
