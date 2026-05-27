#!/usr/bin/env node
/**
 * Permission Request Hook
 *
 * Intercept permission dialogs before they're shown to user.
 * Can auto-approve, auto-deny, or modify the request based on configured rules.
 *
 * Input:
 *   - tool: string (tool being requested)
 *   - params: object (tool parameters)
 *   - reason: string (why permission is needed)
 *
 * Output:
 *   - decision: 'approve' | 'deny' | 'ask' (default: ask)
 *   - reason: string (reason for decision, shown to user if denied)
 *
 * @module hooks/permission-request-hook
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const { exitWithResult, exitSuccess, exitBlock, createResult } = require('./lib/exit-codes');
const wsEmitter = require('./lib/ws-emitter');
const logger = require('../lib/logger');

/**
 * Load permission rules from config
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Permission rules
 */
function loadPermissionRules(projectRoot) {
    const configPath = path.join(projectRoot, '.aicodepath', 'config', 'permissions.json');

    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (err) {
            logger.warn('[PermissionRequest] Failed to load permissions config:', err.message);
        }
    }

    // Default rules
    return {
        deny: [
            'Bash(rm -rf /)',
            'Bash(sudo rm *)',
            'Write(.env)',
            'Write(*.pem)',
            'Write(*.key)',
        ],
        allow: [
            'Read(*)',
            'Glob(*)',
            'Bash(ls *)',
            'Bash(cat *)',
            'Bash(npm test*)',
            'Bash(npm run *)',
        ],
        ask: [
            'Bash(npm install*)',
            'Bash(git *)',
            'Write(package.json)',
        ],
    };
}

/**
 * Match tool and params against a pattern
 * Pattern format: "Tool(glob)" e.g., "Bash(rm *)", "Write(.env*)"
 *
 * @param {string} tool - Tool name
 * @param {Object} params - Tool parameters
 * @param {string} pattern - Pattern to match
 * @returns {boolean} Whether pattern matches
 */
function matchesPattern(tool, params, pattern) {
    const match = pattern.match(/^(\w+)\((.+)\)$/);
    if (!match) return false;

    const [, patternTool, glob] = match;

    if (patternTool !== tool && patternTool !== '*') return false;

    // Get target param based on tool type
    const targetParam = params.command || params.file_path || params.path || params.content || '';

    // Simple glob matching
    const regexPattern = glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

    try {
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(targetParam);
    } catch (e) {
        return false;
    }
}

/**
 * Main hook implementation
 * @param {Object} hookData - Hook input data
 * @returns {Object} Permission decision
 */
async function execute(hookData) {
    const { tool, params, reason } = hookData;
    const projectRoot = findProjectRoot(process.cwd());

    logger.debug('[PermissionRequest]', { tool, params: JSON.stringify(params).substring(0, 100), reason });

    // Load permission rules
    const rules = loadPermissionRules(projectRoot);

    // Check auto-deny list first (security)
    if (rules.deny) {
        for (const pattern of rules.deny) {
            if (matchesPattern(tool, params, pattern)) {
                logger.warn(`[PermissionRequest] Denied by security policy: ${pattern}`);

                wsEmitter.emitLog(`Permission denied: ${tool} blocked by security policy`, {
                    level: 'warn',
                    source: 'permission-request-hook',
                });

                return {
                    decision: 'deny',
                    reason: `Blocked by security policy: ${pattern}`,
                    blocking: true,
                };
            }
        }
    }

    // Check auto-allow list
    if (rules.allow) {
        for (const pattern of rules.allow) {
            if (matchesPattern(tool, params, pattern)) {
                logger.debug(`[PermissionRequest] Auto-approved: ${pattern}`);

                return {
                    decision: 'approve',
                    reason: 'Auto-approved by policy',
                };
            }
        }
    }

    // Check ask list (explicit confirmation required)
    if (rules.ask) {
        for (const pattern of rules.ask) {
            if (matchesPattern(tool, params, pattern)) {
                wsEmitter.emitLog(`Permission requested: ${tool} requires confirmation`, {
                    level: 'info',
                    source: 'permission-request-hook',
                });

                return {
                    decision: 'ask',
                    reason: 'Requires explicit user confirmation',
                };
            }
        }
    }

    // Default: ask user
    return { decision: 'ask' };
}

// Export for Claude Code hooks system
module.exports = { execute };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'permission-request-hook' });
}
