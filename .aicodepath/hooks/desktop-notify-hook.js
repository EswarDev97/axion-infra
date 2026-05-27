#!/usr/bin/env node
/**
 * Desktop Notification Hook (Stop Event)
 *
 * Sends a desktop notification when Claude finishes a response.
 * Best-effort — never blocks or throws. Supports macOS, Linux, and WSL.
 *
 * Input:
 *   - reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'error'
 *   - tokens_used: number
 *   - session_id: string
 *
 * Output:
 *   - Always exitSuccess (observability hook, never blocks)
 *
 * @module hooks/desktop-notify-hook
 */

const fs = require('fs');
const { spawn } = require('child_process');
const { findProjectRoot } = require('../lib/path-resolver');
const { exitSuccess } = require('./lib/exit-codes');
const logger = require('../lib/logger');

/**
 * Detect the current platform.
 * @returns {'darwin'|'linux'|'wsl'|'unsupported'}
 */
function detectPlatform() {
    if (process.platform === 'darwin') return 'darwin';

    if (process.platform === 'linux') {
        // Check for WSL
        try {
            const version = fs.readFileSync('/proc/version', 'utf-8');
            if (/microsoft/i.test(version)) return 'wsl';
        } catch (_) {
            // Not WSL or unreadable — treat as plain Linux
        }
        return 'linux';
    }

    return 'unsupported';
}

/**
 * Build the notification command for the given platform.
 *
 * @param {string} platform - 'darwin' | 'linux' | 'wsl' | 'unsupported'
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @returns {{ bin: string, args: string[] } | null}
 */
function buildNotifyCommand(platform, title, body) {
    switch (platform) {
        case 'darwin':
            return {
                bin: 'osascript',
                args: ['-e', `display notification "${body}" with title "${title}"`],
            };
        case 'linux':
            return {
                bin: 'notify-send',
                args: [title, body],
            };
        case 'wsl':
            return {
                bin: 'powershell.exe',
                args: [
                    '-Command',
                    `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); ` +
                    `[System.Windows.Forms.MessageBox]::Show('${body}', '${title}')`,
                ],
            };
        default:
            return null;
    }
}

/**
 * Send the notification (fire-and-forget).
 *
 * @param {{ bin: string, args: string[] }} cmd - Command descriptor
 */
function sendNotification(cmd) {
    try {
        const child = spawn(cmd.bin, cmd.args, {
            detached: true,
            stdio: 'ignore',
            timeout: 5000,
        });
        child.unref();
    } catch (err) {
        logger.warn('[DesktopNotify] Spawn failed (non-fatal):', { error: err.message });
    }
}

/**
 * Core implementation (testable without spawning processes).
 *
 * @param {Object} hookData - Hook input data
 * @param {Object} [opts] - Options
 * @param {boolean} [opts.skipNotify] - Skip actual notification dispatch (for tests)
 * @returns {Object} Result with success: true
 */
function executeImpl(hookData, opts = {}) {
    const reason = hookData.reason || 'end_turn';
    const tokens = hookData.tokens_used || 0;
    const sessionId = hookData.session_id || 'unknown';

    const title = 'AICodePath';
    const body = `Response complete (${reason}). Tokens: ${tokens}`;

    if (!opts.skipNotify) {
        const platform = detectPlatform();
        const cmd = buildNotifyCommand(platform, title, body);

        if (cmd) {
            sendNotification(cmd);
            logger.debug('[DesktopNotify] Notification sent', { platform, reason });
        } else {
            logger.debug('[DesktopNotify] Unsupported platform, skipping', { platform: process.platform });
        }
    }

    return { success: true, reason, session_id: sessionId };
}

/**
 * Main hook implementation.
 * @param {Object} hookData - Hook input data
 * @returns {Object} Always success
 */
async function execute(hookData) {
    // Profile check — desktop-notify is a strict-tier hook
    try {
        const { shouldRunHook } = require('./lib/profile-resolver');
        if (!shouldRunHook('desktop-notify-hook', 'strict').run) {
            return { success: true, skipped: 'profile' };
        }
    } catch (_) {
        // profile-resolver not available — run anyway
    }

    return executeImpl(hookData);
}

// Export for testing and Claude Code hooks system
module.exports = { execute, executeImpl, buildNotifyCommand, detectPlatform };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
    const { wrapHook } = require('./lib/hook-wrapper');
    wrapHook(execute, { name: 'desktop-notify-hook' });
}
