#!/usr/bin/env node
/**
 * Response Stop Hook
 *
 * Handle response completion events.
 * Called when Claude stops generating (end of response).
 *
 * Input:
 *   - reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'error'
 *   - tokens_used: number
 *   - response_time_ms: number
 *   - tools_called: string[]
 *
 * Output:
 *   - continue: boolean (request continuation if max_tokens)
 *
 * @module hooks/response-stop-hook
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
 * Tools that modify files
 */
const FILE_MODIFYING_TOOLS = ['Write', 'Edit', 'MultiEdit', 'Bash'];

/**
 * Check if any file-modifying tools were called
 * @param {string[]} toolsCalled - List of tools called in response
 * @returns {boolean} True if files may have been modified
 */
function hasFileModifications(toolsCalled) {
    if (!toolsCalled || !Array.isArray(toolsCalled)) return false;
    return toolsCalled.some(tool => FILE_MODIFYING_TOOLS.includes(tool));
}

/**
 * Update quality gates in session state from latest GICL iteration data.
 * Called before creating auto-checkpoints so the checkpoint includes gate status.
 * @param {string} projectRoot - Project root directory
 */
function updateQualityGatesInState(projectRoot) {
    if (!SessionStateManager) return;

    try {
        const GICLSessionManager = require('../lib/gicl-session-manager');
        const gicl = new GICLSessionManager();
        const activeSession = gicl.getActiveSession();

        if (activeSession && activeSession.previousScores && activeSession.previousScores.length > 0) {
            // Query the latest iteration scores directly from DB
            const Database = require('better-sqlite3');
            const { getDbPath } = require('../lib/path-resolver');
            const db = new Database(getDbPath());
            const latest = db.prepare(
                `SELECT test_score, guideline_score, duplication_score, authenticity_score, final_score
                 FROM gicl_iterations WHERE session_id = ? ORDER BY iteration_number DESC LIMIT 1`
            ).get(activeSession.id);
            db.close();

            if (latest) {
                const gates = {
                    tests_passed: (latest.test_score || 0) >= 90,
                    mock_detection_passed: (latest.authenticity_score || 100) >= 70,
                    duplication_passed: (latest.duplication_score || 0) >= 70,
                    final_score: latest.final_score || 0
                };
                const manager = new SessionStateManager(projectRoot);
                manager.setState('quality_gates', gates);
                manager.close();
                logger.debug('[Stop] Quality gates updated from GICL iteration', gates);
            }
        }

        gicl.close();
    } catch (e) {
        logger.debug('[Stop] Could not update quality gates:', e.message);
    }
}

/**
 * Create auto-checkpoint after significant work
 * @param {Object} hookData - Hook data
 */
async function createAutoCheckpoint(hookData) {
    if (!saveCheckpoint) return;

    try {
        const projectRoot = findProjectRoot(process.cwd());

        // Update quality gates in session state before creating checkpoint
        updateQualityGatesInState(projectRoot);

        // Get current state from session manager
        let currentPhase = 'UNKNOWN';
        let currentStage = 'response-stop';
        let currentUnit = '';
        let qualityGates = {};

        if (SessionStateManager) {
            try {
                const manager = new SessionStateManager(projectRoot);
                currentPhase = manager.getState('current_phase') || 'UNKNOWN';
                currentStage = manager.getState('current_stage') || 'response-stop';
                currentUnit = manager.getState('current_unit') || '';
                qualityGates = manager.getState('quality_gates') || {};
                manager.close();
            } catch (e) {
                logger.debug('[Stop] Could not get session state:', e.message);
            }
        }

        const checkpoint = saveCheckpoint(
            currentPhase,
            currentStage,
            currentUnit,
            {
                reason: hookData.reason,
                tools_called: hookData.tools_called,
                quality_gates: qualityGates,
            },
            {
                trigger: 'response-stop',
                auto: true,
            },
            projectRoot
        );

        logger.info('[Stop] Auto-checkpoint created:', checkpoint.id);

        wsEmitter.emitCheckpoint({
            checkpointId: checkpoint.id,
            phase: currentPhase,
            stage: currentStage,
            message: 'Auto-checkpoint after file modifications',
        });

    } catch (e) {
        logger.debug('[Stop] Auto-checkpoint failed:', e.message);
    }
}

/**
 * Main hook implementation
 * @param {Object} hookData - Hook input data
 * @returns {Object} Stop handling result
 */
async function execute(hookData) {
    const { reason, tokens_used, response_time_ms, tools_called, session_id } = hookData;

    logger.debug(`[Stop] Reason: ${reason}, Tokens: ${tokens_used}, Time: ${response_time_ms}ms`);

    // Log significant completions
    if (tools_called && tools_called.length > 0) {
        wsEmitter.emitLog(`Response complete: ${tools_called.length} tools called`, {
            level: 'info',
            source: 'response-stop',
        });
    }

    const result = {
        success: true,
        reason,
        tokens_used,
        response_time_ms,
        tools_called_count: tools_called?.length || 0,
    };

    // Auto-checkpoint on significant work (file modifications)
    if (hasFileModifications(tools_called)) {
        logger.debug('[Stop] File modifications detected, creating checkpoint');
        await createAutoCheckpoint(hookData);
        result.checkpoint_created = true;
    }

    // Handle max_tokens - suggest continuation
    if (reason === 'max_tokens') {
        logger.warn('[Stop] Response truncated due to max_tokens');

        wsEmitter.emitLog('Response was truncated due to token limit', {
            level: 'warn',
            source: 'response-stop',
        });

        result.continue = true;
        result.message = 'Response was truncated. Consider continuing.';
    }

    // Handle errors
    if (reason === 'error') {
        wsEmitter.emitLog('Response ended with error', {
            level: 'error',
            source: 'response-stop',
        });
        result.success = false;
    }

    // Update progress if we have tools called
    if (tools_called && tools_called.length > 0) {
        wsEmitter.emitProgress({
            passing: tools_called.length,
            inProgress: 0,
            total: tools_called.length,
            percentage: 100,
        });
    }

    // Inject workflow context so Claude sees current phase and available skills
    let currentPhase = null;
    if (SessionStateManager) {
        try {
            const projectRoot = findProjectRoot(process.cwd());
            const manager = new SessionStateManager(projectRoot);
            currentPhase = manager.getState('current_phase');
            manager.close();
        } catch (e) {
            logger.debug('[Stop] Could not get phase for context injection:', e.message);
        }
    }

    if (currentPhase) {
        const phaseStr = String(currentPhase).toUpperCase();
        const phaseSkillMap = {
            'PRE-FLIGHT': '/aicodepath-preflight, /aicodepath-status',
            'INCEPTION': '/aicodepath-requirements, /aicodepath-mental-model, /aicodepath-c4-architecture',
            'CONSTRUCTION': '/aicodepath-gicl-start, /aicodepath-c4-architecture, /aicodepath-naming-analyzer',
            'OPERATIONS': '/aicodepath-dependency-updater, /aicodepath-status',
        };
        const relevantSkills = phaseSkillMap[phaseStr] || '/aicodepath-status';
        result.appendToSystemPrompt = `\n---\nAICodePath Context:\n- Current Phase: ${phaseStr}\n- Available Skills: ${relevantSkills}\n- Use /aicodepath-status to check progress\n`;
    }

    return result;
}

// Export for Claude Code hooks system
module.exports = { execute };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(execute, { name: 'response-stop-hook' });
}
