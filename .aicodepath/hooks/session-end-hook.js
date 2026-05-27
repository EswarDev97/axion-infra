#!/usr/bin/env node
/**
 * Session End Hook
 *
 * Handle session termination.
 * Called when the session is ending (user quit, timeout, etc.)
 *
 * Input:
 *   - reason: 'user_quit' | 'timeout' | 'error' | 'complete'
 *   - session_duration_ms: number
 *   - total_tokens_used: number
 *   - tools_called_count: number
 *
 * Output:
 *   - cleanup_performed: boolean
 *
 * @module hooks/session-end-hook
 */

const fs = require('fs').promises;
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
 * Create final checkpoint before session ends
 * @param {Object} hookData - Hook data
 */
async function createFinalCheckpoint(hookData) {
    if (!saveCheckpoint) return null;

    try {
        const projectRoot = findProjectRoot(process.cwd());

        // Get current state from session manager
        let currentPhase = 'END';
        let currentStage = 'session-end';
        let currentUnit = '';

        if (SessionStateManager) {
            try {
                const manager = new SessionStateManager(projectRoot);
                currentPhase = manager.getState('current_phase') || 'END';
                currentUnit = manager.getState('current_unit') || '';
                manager.close();
            } catch (e) {
                logger.debug('[SessionEnd] Could not get session state:', e.message);
            }
        }

        const checkpoint = saveCheckpoint(
            currentPhase,
            currentStage,
            currentUnit,
            {
                session_end_reason: hookData.reason,
                duration_ms: hookData.session_duration_ms,
                tokens_used: hookData.total_tokens_used,
                tools_called: hookData.tools_called_count,
            },
            {
                trigger: 'session-end',
                message: `Session ended: ${hookData.reason}`,
            },
            projectRoot
        );

        logger.info('[SessionEnd] Final checkpoint created:', checkpoint.id);
        return checkpoint.id;

    } catch (e) {
        logger.warn('[SessionEnd] Failed to create final checkpoint:', e.message);
        return null;
    }
}

/**
 * Update session record in database
 * @param {Object} hookData - Hook data
 */
async function updateSessionRecord(hookData) {
    if (!SessionStateManager) return;

    try {
        const projectRoot = findProjectRoot(process.cwd());
        const manager = new SessionStateManager(projectRoot);

        // Update session end time
        manager.setState('last_session_end', new Date().toISOString());
        manager.setState('last_session_reason', hookData.reason);
        manager.setState('last_session_duration_ms', hookData.session_duration_ms);
        manager.setState('last_session_tokens', hookData.total_tokens_used);

        // Archive the session
        try {
            const archiveResult = manager.archiveSession();
            const archiveRef = archiveResult.session_id;
            logger.info('[SessionEnd] Session archived:', archiveRef);
        } catch (e) {
            logger.debug('[SessionEnd] Session archive failed:', e.message);
        }

        manager.close();
    } catch (e) {
        logger.debug('[SessionEnd] Could not update session record:', e.message);
    }
}

/**
 * Cleanup temporary files created during session
 * @param {string} sessionId - Session ID
 * @returns {boolean} Whether cleanup was performed
 */
async function cleanupTemporaryFiles(sessionId) {
    const projectRoot = findProjectRoot(process.cwd());
    const tempDir = path.join(projectRoot, '.aicodepath', 'tmp');

    try {
        // Check if temp directory exists
        await fs.access(tempDir);

        // Get all files in temp directory
        const files = await fs.readdir(tempDir);

        // Remove files older than 24 hours or matching session ID
        let cleanedCount = 0;
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            try {
                const stats = await fs.stat(filePath);
                const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

                // Remove if older than 24 hours or matches session
                if (ageHours > 24 || (sessionId && file.includes(sessionId))) {
                    await fs.rm(filePath, { recursive: true, force: true });
                    cleanedCount++;
                }
            } catch (e) {
                // Skip files that can't be accessed
            }
        }

        if (cleanedCount > 0) {
            logger.info(`[SessionEnd] Cleaned up ${cleanedCount} temporary files`);
        }

        return cleanedCount > 0;
    } catch (e) {
        // Temp directory doesn't exist or other error - that's OK
        logger.debug('[SessionEnd] No temp files to clean up');
        return false;
    }
}

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
    if (ms < 60000) {
        return `${Math.round(ms / 1000)} seconds`;
    } else if (ms < 3600000) {
        return `${Math.round(ms / 60000)} minutes`;
    } else {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.round((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }
}

/**
 * Main hook implementation
 * @param {Object} hookData - Hook input data
 * @returns {Object} Session end handling result
 */
async function execute(hookData) {
    const {
        reason,
        session_duration_ms,
        total_tokens_used,
        tools_called_count,
        session_id
    } = hookData;

    const durationFormatted = formatDuration(session_duration_ms);

    logger.info(`[SessionEnd] Session ending: ${reason} (${durationFormatted}, ${total_tokens_used} tokens, ${tools_called_count} tools)`);

    // Create final checkpoint
    const checkpointId = await createFinalCheckpoint(hookData);

    // Update session record
    await updateSessionRecord(hookData);

    // Emit final status
    wsEmitter.emitLog(`Session ended: ${reason} (${durationFormatted})`, {
        level: reason === 'error' ? 'error' : 'info',
        source: 'session-end',
    });

    // Cleanup temporary files
    const cleanedUp = await cleanupTemporaryFiles(session_id);

    const result = {
        success: true,
        reason,
        duration: durationFormatted,
        duration_ms: session_duration_ms,
        tokens_used: total_tokens_used,
        tools_called: tools_called_count,
        cleanup_performed: cleanedUp,
        final_checkpoint: checkpointId || false,
    };

    result.systemMessage = "Session ending. If tasks are in-progress or work is incomplete, run /aicodepath-pause to create a handoff document for seamless resumption next session.";

    return result;
}

// Export for Claude Code hooks system
module.exports = { execute };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'session-end-hook' });
}
