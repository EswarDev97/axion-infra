#!/usr/bin/env node
/**
 * Notification Hook
 *
 * Intercept and potentially customize Claude notifications.
 * Can suppress verbose notifications or enhance important ones.
 *
 * Input:
 *   - notification_type: 'info' | 'warning' | 'error' | 'success'
 *   - message: string
 *   - context: object
 *
 * Output:
 *   - suppress: boolean (don't show to user)
 *   - modified_message: string (optional, show this instead)
 *
 * @module hooks/notification-hook
 */

const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const { exitWithResult, exitSuccess, exitWarning, createResult } = require('./lib/exit-codes');
const wsEmitter = require('./lib/ws-emitter');
const logger = require('../lib/logger');

/**
 * Patterns for notifications that should be suppressed (too verbose)
 */
const SUPPRESS_PATTERNS = [
    /^Reading file/,
    /^Searching/,
    /^Found \d+ matches/,
    /^Globbing/,
    /^Checking/,
    /^Loading/,
    /^Processing/,
];

/**
 * Patterns for notifications that should be enhanced
 */
const ENHANCE_PATTERNS = [
    {
        pattern: /permission/i,
        prefix: '⚠️ ',
        suffix: '\n\nTip: Configure auto-permissions in .claude/settings.json',
    },
    {
        pattern: /error/i,
        prefix: '❌ ',
        suffix: '',
    },
    {
        pattern: /success/i,
        prefix: '✅ ',
        suffix: '',
    },
    {
        pattern: /warning/i,
        prefix: '⚠️ ',
        suffix: '',
    },
    {
        pattern: /(created|wrote|saved)/i,
        prefix: '📝 ',
        suffix: '',
    },
    {
        pattern: /(deleted|removed)/i,
        prefix: '🗑️ ',
        suffix: '',
    },
];

/**
 * Check if notification should be suppressed
 * @param {string} message - Notification message
 * @returns {boolean} Whether to suppress
 */
function shouldSuppress(message) {
    return SUPPRESS_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Enhance notification message
 * @param {string} message - Original message
 * @param {string} type - Notification type
 * @returns {string|null} Enhanced message or null if no enhancement
 */
function enhanceMessage(message, type) {
    for (const enhancement of ENHANCE_PATTERNS) {
        if (enhancement.pattern.test(message)) {
            return `${enhancement.prefix}${message}${enhancement.suffix}`;
        }
    }

    // Default enhancements by type
    const typeEmojis = {
        error: '❌ ',
        warning: '⚠️ ',
        success: '✅ ',
        info: 'ℹ️ ',
    };

    const emoji = typeEmojis[type] || '';
    if (emoji && !message.startsWith(emoji.trim())) {
        return `${emoji}${message}`;
    }

    return null;
}

/**
 * Map notification_type to log level
 * @param {string} notificationType - Notification type
 * @returns {string} Log level
 */
function mapToLogLevel(notificationType) {
    const mapping = {
        success: 'info',
        info: 'info',
        warning: 'warn',
        error: 'error',
    };
    return mapping[notificationType] || 'info';
}

/**
 * Main hook implementation
 * @param {Object} hookData - Hook input data
 * @returns {Object} Notification handling result
 */
async function execute(hookData) {
    const { notification_type, message, context } = hookData;

    logger.debug(`[Notification] ${notification_type}: ${message}`);

    // Forward to dashboard WebSocket
    wsEmitter.emitLog(message, {
        level: mapToLogLevel(notification_type),
        source: 'notification',
    });

    // Check if should suppress
    if (shouldSuppress(message)) {
        logger.debug('[Notification] Suppressing verbose notification');
        return {
            suppress: true,
            reason: 'verbose_notification',
        };
    }

    // Check if should enhance
    const enhanced = enhanceMessage(message, notification_type);

    if (enhanced) {
        return {
            suppress: false,
            modified_message: enhanced,
        };
    }

    // Pass through unchanged
    return { suppress: false };
}

// Export for Claude Code hooks system
module.exports = { execute };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'notification-hook' });
}
