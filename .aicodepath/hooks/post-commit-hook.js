#!/usr/bin/env node
/**
 * Post-Commit Hook
 *
 * Fires after a Bash tool call. The learn suggestion has been moved to
 * the acceptance skill, which is the correct location (sprint close).
 * This hook no longer emits any systemMessage.
 *
 * Event: PostToolUse (matcher: Bash)
 *
 * @module hooks/post-commit-hook
 */

/**
 * Main hook implementation.
 * @param {Object} hookData - Hook input data
 * @returns {Object} Hook result
 */
async function execute(_hookData) {
    return {};
}

// Export for Claude Code hooks system
module.exports = { execute };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
    const { wrapHook } = require('./lib/hook-wrapper');
    wrapHook(execute, { name: 'post-commit-hook' });
}
