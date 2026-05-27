#!/usr/bin/env node
/**
 * Pre-Compact Hook
 *
 * Handle context compaction (conversation summarization).
 * Called before Claude compacts the conversation history.
 *
 * Input:
 *   - current_tokens: number
 *   - max_tokens: number
 *   - messages_count: number
 *   - oldest_message_age_minutes: number
 *
 * Output:
 *   - preserve_messages: number[] (message indices to preserve)
 *   - custom_summary: string (optional, custom summary to use)
 *
 * @module hooks/pre-compact-hook
 */

const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const { exitWithResult, exitSuccess, exitWarning, createResult } = require('./lib/exit-codes');
const wsEmitter = require('./lib/ws-emitter');
const logger = require('../lib/logger');

// Import CheckpointManager if available
let saveCheckpoint = null;
try {
    saveCheckpoint = require('../lib/checkpoint-manager').saveCheckpoint;
} catch (e) {
    // CheckpointManager not available - non-fatal
}

// Import SessionStateManager if available
let SessionStateManager = null;
try {
    SessionStateManager = require('../lib/session-state-manager').SessionStateManager;
} catch (e) {
    // SessionStateManager not available - non-fatal
}

/**
 * Create checkpoint before context compaction
 * @param {Object} hookData - Hook data
 * @param {number} usagePercent - Context usage percentage
 */
async function createPreCompactCheckpoint(hookData, usagePercent) {
    if (!saveCheckpoint) return null;

    try {
        const projectRoot = findProjectRoot(process.cwd());

        // Get current state from session manager
        let currentPhase = 'UNKNOWN';
        let currentStage = 'pre-compact';
        let currentUnit = '';

        if (SessionStateManager) {
            try {
                const manager = new SessionStateManager(projectRoot);
                currentPhase = manager.getState('current_phase') || 'UNKNOWN';
                currentUnit = manager.getState('current_unit') || '';
                manager.close();
            } catch (e) {
                logger.debug('[PreCompact] Could not get session state:', e.message);
            }
        }

        const checkpoint = saveCheckpoint(
            currentPhase,
            currentStage,
            currentUnit,
            {
                context_usage: usagePercent,
                tokens: hookData.current_tokens,
                max_tokens: hookData.max_tokens,
                messages_count: hookData.messages_count,
            },
            {
                trigger: 'pre-compact',
                message: `Auto-checkpoint before context compaction (${usagePercent}%)`,
            },
            projectRoot
        );

        logger.info('[PreCompact] Checkpoint created before compaction:', checkpoint.id);

        wsEmitter.emitCheckpoint({
            checkpointId: checkpoint.id,
            phase: currentPhase,
            stage: currentStage,
            message: `Pre-compaction checkpoint (${usagePercent}% context usage)`,
        });

        return checkpoint.id;

    } catch (e) {
        logger.warn('[PreCompact] Failed to create checkpoint:', e.message);
        return null;
    }
}

/**
 * Determine which messages are critical to preserve
 * @param {number} messagesCount - Total number of messages
 * @param {Object} hookData - Additional hook data
 * @returns {number[]} Message indices to preserve
 */
function identifyCriticalMessages(messagesCount, hookData) {
    const preserveMessages = [];

    // Always preserve the most recent messages (last 5)
    const recentCount = Math.min(5, messagesCount);
    for (let i = messagesCount - recentCount; i < messagesCount; i++) {
        if (i >= 0) preserveMessages.push(i);
    }

    // Always preserve the first message (system context)
    if (messagesCount > 0 && !preserveMessages.includes(0)) {
        preserveMessages.unshift(0);
    }

    // Note: In a real implementation, this would analyze message content
    // to identify important context like:
    // - Architectural decisions
    // - TODO items and next steps
    // - Error resolutions
    // - User preferences expressed

    return preserveMessages.sort((a, b) => a - b);
}

/**
 * Main hook implementation
 * @param {Object} hookData - Hook input data
 * @returns {Object} Pre-compact handling result
 */
async function execute(hookData) {
    const {
        current_tokens,
        max_tokens,
        messages_count,
        oldest_message_age_minutes,
        session_id
    } = hookData;

    const usagePercent = Math.round((current_tokens / max_tokens) * 100);

    logger.info(`[PreCompact] Context: ${usagePercent}% (${current_tokens}/${max_tokens} tokens, ${messages_count} messages)`);

    // Emit warning to dashboard
    wsEmitter.emitLog(`Context compaction starting (${usagePercent}% full)`, {
        level: 'warn',
        source: 'pre-compact',
    });

    // Create checkpoint before compaction
    const checkpointId = await createPreCompactCheckpoint(hookData, usagePercent);

    // Determine which messages to preserve
    const preserveMessages = identifyCriticalMessages(messages_count, hookData);

    const result = {
        success: true,
        preserve_messages: preserveMessages,
        context_usage: usagePercent,
        tokens: current_tokens,
        max_tokens: max_tokens,
        messages_preserved: preserveMessages.length,
        messages_total: messages_count,
    };

    if (checkpointId) {
        result.checkpoint_id = checkpointId;
    }

    result.systemMessage = "⚡ Context compaction imminent. If you haven't run /aicodepath-learn yet this session, do so now to preserve any durable preferences. Then /aicodepath-checkpoint if not already done.";

    // Provide summary info
    logger.info(`[PreCompact] Preserving ${preserveMessages.length}/${messages_count} messages`);

    return result;
}

// Export for Claude Code hooks system
module.exports = { execute };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'pre-compact-hook' });
}
