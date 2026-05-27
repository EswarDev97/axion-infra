#!/usr/bin/env node

/**
 * AICodePath Damage Control Hook
 *
 * Security gate that runs on PreToolUse events to prevent destructive operations.
 * Blocks dangerous commands, protects sensitive paths, and enforces security policies.
 *
 * Fixes applied:
 * - Issue 4: Added fallback input handling for environment variables
 * - Added execution logging for debugging
 * - Improved error handling
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('yaml');
const logger = require('../../lib/logger');

// Logging utility for debugging hook execution
function log(level, message, data = {}) {
  if (process.env.DAMAGE_CONTROL_DEBUG === 'true') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...data };
    console.error(`[damage-control] ${JSON.stringify(logEntry)}`);
  }
}

function isGlobPattern(pattern) {
  return pattern.includes('*') || pattern.includes('?') || pattern.includes('[');
}

function globToRegex(globPattern) {
  let result = '';
  for (const char of globPattern) {
    if (char === '*') {
      result += '[^\\s/]*';
    } else if (char === '?') {
      result += '[^\\s/]';
    } else if ('\\.^$+{}[]|()'.includes(char)) {
      result += `\\${char}`;
    } else {
      result += char;
    }
  }
  return result;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
}

function expandHome(value) {
  if (value === '~') {
    return os.homedir();
  }
  if (value.startsWith('~/')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function normalizePathValue(value) {
  return path.normalize(expandHome(value));
}

function matchPath(filePath, pattern) {
  const normalizedPath = normalizePathValue(filePath);
  const normalizedPattern = normalizePathValue(pattern);

  if (isGlobPattern(pattern)) {
    const basename = path.basename(normalizedPath).toLowerCase();
    const patternLower = expandHome(pattern).toLowerCase();
    const normalizedPatternLower = normalizedPattern.toLowerCase();
    const normalizedPathLower = normalizedPath.toLowerCase();

    const patternRegex = new RegExp(`^${globToRegex(patternLower)}$`, 'i');
    const normalizedPatternRegex = new RegExp(`^${globToRegex(normalizedPatternLower)}$`, 'i');

    return (
      patternRegex.test(basename) ||
      normalizedPatternRegex.test(basename) ||
      patternRegex.test(normalizedPathLower) ||
      normalizedPatternRegex.test(normalizedPathLower)
    );
  }

  if (normalizedPath === normalizedPattern) {
    return true;
  }

  const prefix = normalizedPattern.endsWith(path.sep)
    ? normalizedPattern
    : `${normalizedPattern}${path.sep}`;

  return normalizedPath.startsWith(prefix);
}

const WRITE_PATTERNS = [
  ['>\\s*{path}', 'write'],
  ['\\btee\\s+(?!.*-a).*{path}', 'write'],
];

const APPEND_PATTERNS = [
  ['>>\\s*{path}', 'append'],
  ['\\btee\\s+-a\\s+.*{path}', 'append'],
  ['\\btee\\s+.*-a.*{path}', 'append'],
];

const EDIT_PATTERNS = [
  ['\\bsed\\s+-i.*{path}', 'edit'],
  ['\\bperl\\s+-[^\\s]*i.*{path}', 'edit'],
  ['\\bawk\\s+-i\\s+inplace.*{path}', 'edit'],
];

const MOVE_COPY_PATTERNS = [
  ['\\bmv\\s+.*\\s+{path}', 'move'],
  ['\\bcp\\s+.*\\s+{path}', 'copy'],
];

const DELETE_PATTERNS = [
  ['\\brm\\s+.*{path}', 'delete'],
  ['\\bunlink\\s+.*{path}', 'delete'],
  ['\\brmdir\\s+.*{path}', 'delete'],
  ['\\bshred\\s+.*{path}', 'delete'],
];

const PERMISSION_PATTERNS = [
  ['\\bchmod\\s+.*{path}', 'chmod'],
  ['\\bchown\\s+.*{path}', 'chown'],
  ['\\bchgrp\\s+.*{path}', 'chgrp'],
];

const TRUNCATE_PATTERNS = [
  ['\\btruncate\\s+.*{path}', 'truncate'],
  [':\\s*>\\s*{path}', 'truncate'],
];

const READ_ONLY_BLOCKED = [
  ...WRITE_PATTERNS,
  ...APPEND_PATTERNS,
  ...EDIT_PATTERNS,
  ...MOVE_COPY_PATTERNS,
  ...DELETE_PATTERNS,
  ...PERMISSION_PATTERNS,
  ...TRUNCATE_PATTERNS,
];

const NO_DELETE_BLOCKED = [...DELETE_PATTERNS];

function getConfigPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;

  // First try project-level patterns.yaml (hooks/damage-control/)
  if (projectDir) {
    const projectHooksConfig = path.join(projectDir, 'hooks', 'damage-control', 'patterns.yaml');
    if (fs.existsSync(projectHooksConfig)) {
      log('debug', 'Using project hooks config', { path: projectHooksConfig });
      return projectHooksConfig;
    }

    // Legacy location: .claude/hooks/damage-control/
    const legacyConfig = path.join(
      projectDir,
      '.claude',
      'hooks',
      'damage-control',
      'patterns.yaml'
    );
    if (fs.existsSync(legacyConfig)) {
      log('debug', 'Using legacy .claude config', { path: legacyConfig });
      return legacyConfig;
    }
  }

  // Fallback to same directory as this script
  const localConfig = path.join(__dirname, 'patterns.yaml');
  if (fs.existsSync(localConfig)) {
    log('debug', 'Using local config', { path: localConfig });
    return localConfig;
  }

  log('warn', 'No patterns.yaml found, using defaults');
  return localConfig;
}

function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    log('warn', 'Config file not found', { path: configPath });
    return {
      bashToolPatterns: [],
      zeroAccessPaths: [],
      readOnlyPaths: [],
      noDeletePaths: [],
    };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(content) || {};
    log('info', 'Config loaded', {
      path: configPath,
      patterns: config.bashToolPatterns?.length || 0,
    });

    return {
      bashToolPatterns: config.bashToolPatterns || [],
      zeroAccessPaths: config.zeroAccessPaths || [],
      readOnlyPaths: config.readOnlyPaths || [],
      noDeletePaths: config.noDeletePaths || [],
    };
  } catch (error) {
    log('error', 'Failed to load config', { path: configPath, error: error.message });
    return {
      bashToolPatterns: [],
      zeroAccessPaths: [],
      readOnlyPaths: [],
      noDeletePaths: [],
    };
  }
}

function checkPathPatterns(command, pathPattern, templates, pathType) {
  if (isGlobPattern(pathPattern)) {
    const globRegex = globToRegex(pathPattern);
    for (const [template, operation] of templates) {
      const pattern = template.replace('{path}', globRegex);
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(command)) {
          return {
            blocked: true,
            reason: `Blocked: ${operation} operation on ${pathType} ${pathPattern}`,
          };
        }
      } catch (error) {
        continue;
      }
    }
  } else {
    const expanded = normalizePathValue(pathPattern);
    const escapedExpanded = escapeRegExp(expanded);
    const escapedOriginal = escapeRegExp(pathPattern);

    for (const [template, operation] of templates) {
      const patternExpanded = template.replace('{path}', escapedExpanded);
      const patternOriginal = template.replace('{path}', escapedOriginal);
      try {
        if (
          new RegExp(patternExpanded, 'i').test(command) ||
          new RegExp(patternOriginal, 'i').test(command)
        ) {
          return {
            blocked: true,
            reason: `Blocked: ${operation} operation on ${pathType} ${pathPattern}`,
          };
        }
      } catch (error) {
        continue;
      }
    }
  }

  return { blocked: false, reason: '' };
}

function checkCommand(command, config) {
  let askReason = '';

  for (const item of config.bashToolPatterns) {
    const pattern = item.pattern || '';
    const reason = item.reason || 'Blocked by pattern';
    const shouldAsk = item.ask === true;

    try {
      if (new RegExp(pattern, 'i').test(command)) {
        if (shouldAsk) {
          if (!askReason) {
            askReason = reason;
          }
        } else {
          log('warn', 'Command blocked by pattern', {
            pattern,
            reason,
            command: command.slice(0, 100),
          });
          return { blocked: true, ask: false, reason: `Blocked: ${reason}` };
        }
      }
    } catch (error) {
      continue;
    }
  }

  for (const zeroPath of config.zeroAccessPaths) {
    if (isGlobPattern(zeroPath)) {
      try {
        const regex = new RegExp(globToRegex(zeroPath), 'i');
        if (regex.test(command)) {
          log('warn', 'Command blocked by zero-access path', {
            path: zeroPath,
            command: command.slice(0, 100),
          });
          return {
            blocked: true,
            ask: false,
            reason: `Blocked: zero-access pattern ${zeroPath} (no operations allowed)`,
          };
        }
      } catch (error) {
        continue;
      }
    } else {
      const expanded = escapeRegExp(normalizePathValue(zeroPath));
      const original = escapeRegExp(zeroPath);
      try {
        if (new RegExp(expanded, 'i').test(command) || new RegExp(original, 'i').test(command)) {
          log('warn', 'Command blocked by zero-access path', {
            path: zeroPath,
            command: command.slice(0, 100),
          });
          return {
            blocked: true,
            ask: false,
            reason: `Blocked: zero-access path ${zeroPath} (no operations allowed)`,
          };
        }
      } catch (error) {
        continue;
      }
    }
  }

  for (const readonly of config.readOnlyPaths) {
    const result = checkPathPatterns(command, readonly, READ_ONLY_BLOCKED, 'read-only path');
    if (result.blocked) {
      log('warn', 'Command blocked by read-only path', {
        path: readonly,
        command: command.slice(0, 100),
      });
      return { blocked: true, ask: false, reason: result.reason };
    }
  }

  for (const noDelete of config.noDeletePaths) {
    const result = checkPathPatterns(command, noDelete, NO_DELETE_BLOCKED, 'no-delete path');
    if (result.blocked) {
      log('warn', 'Command blocked by no-delete path', {
        path: noDelete,
        command: command.slice(0, 100),
      });
      return { blocked: true, ask: false, reason: result.reason };
    }
  }

  if (askReason) {
    log('info', 'Command requires confirmation', { reason: askReason });
    return { blocked: false, ask: true, reason: askReason };
  }

  return { blocked: false, ask: false, reason: '' };
}

function checkFilePath(filePath, config) {
  for (const zeroPath of config.zeroAccessPaths) {
    if (matchPath(filePath, zeroPath)) {
      log('warn', 'File path blocked by zero-access', { path: zeroPath, filePath });
      return { blocked: true, reason: `zero-access path ${zeroPath} (no operations allowed)` };
    }
  }

  for (const readonly of config.readOnlyPaths) {
    if (matchPath(filePath, readonly)) {
      log('warn', 'File path blocked by read-only', { path: readonly, filePath });
      return { blocked: true, reason: `read-only path ${readonly}` };
    }
  }

  return { blocked: false, reason: '' };
}

/**
 * Read hook input from stdin (primary method)
 * Claude Code sends JSON via stdin for hook execution
 */
function readStdinInput() {
  try {
    const input = fs.readFileSync(0, 'utf8').trim();
    if (!input) {
      return null;
    }
    return JSON.parse(input);
  } catch (error) {
    log('debug', 'No stdin input or parse error', { error: error.message });
    return null;
  }
}

/**
 * Read hook input from environment variables (fallback method - Issue 4 fix)
 * If stdin is not available, try environment variables
 */
function readEnvInput() {
  const toolName = process.env.HOOK_TOOL_NAME || process.env.TOOL_NAME;
  const toolInputStr = process.env.HOOK_TOOL_INPUT || process.env.TOOL_INPUT;

  if (!toolName) {
    return null;
  }

  let toolInput = {};
  if (toolInputStr) {
    try {
      toolInput = JSON.parse(toolInputStr);
    } catch (error) {
      log('warn', 'Failed to parse HOOK_TOOL_INPUT', { error: error.message });
    }
  }

  log('info', 'Using environment variable input', { toolName });
  return { tool_name: toolName, tool_input: toolInput };
}

/**
 * Read hook input from command line arguments (additional fallback)
 */
function readArgvInput() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return null;
  }

  try {
    // Try to parse first argument as JSON
    const input = JSON.parse(args[0]);
    log('info', 'Using command line argument input');
    return input;
  } catch (error) {
    return null;
  }
}

/**
 * Get hook input using multiple methods with fallback chain
 */
function getHookInput() {
  // Try stdin first (primary method)
  let input = readStdinInput();
  if (input) {
    log('debug', 'Input source: stdin');
    return input;
  }

  // Try environment variables (Issue 4 fix)
  input = readEnvInput();
  if (input) {
    log('debug', 'Input source: environment');
    return input;
  }

  // Try command line arguments
  input = readArgvInput();
  if (input) {
    log('debug', 'Input source: argv');
    return input;
  }

  log('debug', 'No input available from any source');
  return null;
}

function emitAsk(reason) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

function main() {
  log('info', 'Damage control hook started');

  const config = loadConfig();
  const input = getHookInput();

  if (!input) {
    log('debug', 'No input, allowing operation');
    process.exit(0);
  }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  log('info', 'Processing tool', { toolName, hasInput: !!toolInput });

  if (toolName === 'Bash') {
    const command = toolInput.command || '';
    if (!command) {
      log('debug', 'Empty command, allowing');
      process.exit(0);
    }

    const result = checkCommand(command, config);
    if (result.blocked) {
      logger.error('Security violation: Command blocked', {
        hook: 'damage-control',
        reason: result.reason,
        command: command.slice(0, 120) + (command.length > 120 ? '...' : '')
      });
      log('warn', 'Command BLOCKED', { reason: result.reason });
      process.exit(2);
    }

    if (result.ask) {
      emitAsk(result.reason);
      process.exit(0);
    }

    log('debug', 'Command ALLOWED');
    process.exit(0);
  }

  if (toolName === 'Edit' || toolName === 'Write') {
    const filePath = toolInput.file_path || '';
    if (!filePath) {
      log('debug', 'Empty file path, allowing');
      process.exit(0);
    }

    const result = checkFilePath(filePath, config);
    if (result.blocked) {
      logger.error('Security violation: File operation blocked', {
        hook: 'damage-control',
        tool: toolName,
        reason: result.reason,
        filePath: filePath
      });
      log('warn', `${toolName} BLOCKED`, { reason: result.reason, filePath });
      process.exit(2);
    }

    log('debug', `${toolName} ALLOWED`, { filePath });
    process.exit(0);
  }

  log('debug', 'Unknown tool, allowing', { toolName });
  process.exit(0);
}

main();
