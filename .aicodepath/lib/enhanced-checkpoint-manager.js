/**
 * Enhanced Checkpoint Manager for AICodePath
 *
 * Orchestrates file snapshots and conversation tracking to provide
 * full checkpoint and rollback capabilities for code modifications.
 *
 * Features:
 * - Track file changes before Write/Edit operations
 * - Record conversation turns
 * - Create checkpoints with files + conversation
 * - Rewind to checkpoint state (code, conversation, or both)
 * - Compare checkpoints
 * - Prune old checkpoints
 *
 * @module lib/enhanced-checkpoint-manager
 */

const { v4: uuidv4 } = require('uuid');
const { FileSnapshotManager } = require('./file-snapshot-manager');
const { ConversationTracker } = require('./conversation-tracker');

class EnhancedCheckpointManager {
    /**
     * Create a new EnhancedCheckpointManager
     * @param {Object} db - better-sqlite3 database instance
     * @param {Object} options - Configuration options
     */
    constructor(db, options = {}) {
        this.db = db;
        this.options = options;

        this.fileManager = new FileSnapshotManager(db, options.fileSnapshot);
        this.conversationTracker = new ConversationTracker(db);

        // Map of filePath -> beforeState for pending changes
        this.pendingFileChanges = new Map();

        this._prepareStatements();
    }

    /**
     * Prepare database statements for reuse
     * @private
     */
    _prepareStatements() {
        this.stmts = {
            createCheckpoint: this.db.prepare(`
        INSERT INTO session_history (session_id, phase, stage, unit, action, details)
        VALUES (?, ?, ?, ?, 'checkpoint_created', ?)
      `),
            getCheckpoints: this.db.prepare(`
        SELECT * FROM session_history
        WHERE action = 'checkpoint_created' AND session_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `),
            getCheckpointById: this.db.prepare(`
        SELECT * FROM session_history
        WHERE action = 'checkpoint_created' AND id = ?
      `),
            getCheckpointBySessionAndId: this.db.prepare(`
        SELECT * FROM session_history
        WHERE action = 'checkpoint_created' AND session_id = ? AND json_extract(details, '$.checkpointId') = ?
      `),
            deleteCheckpoint: this.db.prepare(`
        DELETE FROM session_history WHERE id = ?
      `),
            insertRollback: this.db.prepare(`
        INSERT INTO rollback_history (checkpoint_id, rollback_type)
        VALUES (?, ?)
      `),
            updateRollback: this.db.prepare(`
        UPDATE rollback_history SET
          files_reverted = ?,
          conversation_turns_reverted = ?,
          completed_at = datetime('now'),
          status = ?,
          error_message = ?
        WHERE id = ?
      `),
            getRollbackHistory: this.db.prepare(`
        SELECT * FROM rollback_history
        WHERE checkpoint_id = ?
        ORDER BY initiated_at DESC
      `),
        };
    }

    /**
     * Generate unique checkpoint ID
     * @returns {string} Checkpoint ID
     * @private
     */
    _generateCheckpointId() {
        return `chk_${uuidv4().substring(0, 8)}`;
    }

    /**
     * Register file change tracking (call before Write/Edit)
     * @param {string} filePath - Path to file being modified
     */
    trackFileChange(filePath) {
        if (!this.pendingFileChanges.has(filePath)) {
            const beforeState = this.fileManager.captureBeforeState(filePath);
            if (beforeState) {
                this.pendingFileChanges.set(filePath, beforeState);
                console.log(`[Checkpoint] Tracking file: ${filePath}`);
            }
        }
    }

    /**
     * Get count of pending file changes
     * @returns {number} Number of files being tracked
     */
    getPendingFileCount() {
        return this.pendingFileChanges.size;
    }

    /**
     * Record conversation turn
     * @param {string} role - Role: 'user', 'assistant', or 'system'
     * @param {string} content - Message content
     * @param {Array|null} toolCalls - Array of tool calls
     */
    recordTurn(role, content, toolCalls = null) {
        this.conversationTracker.addTurn(role, content, toolCalls);
    }

    /**
     * Create a checkpoint
     * @param {Object} params - Checkpoint parameters
     * @param {string} params.sessionId - Session ID
     * @param {string} params.phase - Current phase
     * @param {string} params.stage - Current stage
     * @param {string} params.unit - Current unit
     * @param {Object} params.state - Session state object
     * @param {Object} params.context - Additional context
     * @param {string} params.message - Optional message for the checkpoint
     * @returns {string} Checkpoint ID
     */
    createCheckpoint(params) {
        const {
            sessionId,
            phase,
            stage,
            unit,
            state = {},
            context = {},
            message = null,
        } = params;

        const checkpointId = this._generateCheckpointId();
        const timestamp = new Date().toISOString();

        // Start transaction
        const transaction = this.db.transaction(() => {
            // Create main checkpoint record in session_history
            const details = {
                checkpointId,
                timestamp,
                state,
                context,
                message,
                filesTracked: this.pendingFileChanges.size,
                conversationTurns: this.conversationTracker.getBufferCount(),
            };

            this.stmts.createCheckpoint.run(
                sessionId,
                phase,
                stage,
                unit,
                JSON.stringify(details)
            );

            // Save file snapshots
            let filesSaved = 0;
            for (const [filePath, beforeState] of this.pendingFileChanges) {
                const afterState = this.fileManager.captureAfterState(filePath);
                if (this.fileManager.saveSnapshot(checkpointId, filePath, beforeState, afterState)) {
                    filesSaved++;
                }
            }

            // Save conversation
            const turnsSaved = this.conversationTracker.saveToCheckpoint(checkpointId);

            console.log(`[Checkpoint] Created: ${checkpointId} (${filesSaved} files, ${turnsSaved} turns)`);
            return { filesSaved, turnsSaved };
        });

        transaction();

        // Clear pending changes
        this.pendingFileChanges.clear();

        return checkpointId;
    }

    /**
     * Rewind to a checkpoint
     * @param {string} checkpointId - Checkpoint ID to rewind to
     * @param {string} mode - Rewind mode: 'code', 'conversation', or 'both'
     * @returns {Object} Rewind result
     */
    rewind(checkpointId, mode = 'both') {
        // Create rollback record
        const rollbackResult = this.stmts.insertRollback.run(checkpointId, mode);
        const rollbackId = rollbackResult.lastInsertRowid;

        let filesReverted = 0;
        let turnsReverted = 0;
        let error = null;

        try {
            // Restore files
            if (mode === 'code' || mode === 'both') {
                const result = this.fileManager.restoreCheckpoint(checkpointId, 'before');
                filesReverted = result.success.length;

                if (result.failed.length > 0) {
                    console.warn(`[Checkpoint] Some files failed to restore:`, result.failed);
                }
            }

            // Restore conversation state
            if (mode === 'conversation' || mode === 'both') {
                const conversation = this.conversationTracker.loadFromCheckpoint(checkpointId);
                turnsReverted = conversation.length;
                // Note: Actual conversation restoration in Claude Code would require API integration
                console.log(`[Checkpoint] Loaded ${turnsReverted} conversation turns (restoration depends on Claude Code API)`);
            }

            this.stmts.updateRollback.run(
                filesReverted,
                turnsReverted,
                'completed',
                null,
                rollbackId
            );

            console.log(`[Checkpoint] Rewind complete: ${filesReverted} files, ${turnsReverted} turns`);

            return {
                success: true,
                checkpointId,
                filesReverted,
                turnsReverted,
                mode,
            };
        } catch (err) {
            error = err.message;

            this.stmts.updateRollback.run(
                filesReverted,
                turnsReverted,
                'failed',
                error,
                rollbackId
            );

            throw err;
        }
    }

    /**
     * List checkpoints for session
     * @param {string} sessionId - Session ID
     * @param {number} limit - Maximum number to return
     * @returns {Array<Object>} Array of checkpoint objects
     */
    list(sessionId, limit = 20) {
        const rows = this.stmts.getCheckpoints.all(sessionId, limit);

        return rows.map(row => {
            const details = JSON.parse(row.details || '{}');
            return {
                id: details.checkpointId,
                dbId: row.id,
                phase: row.phase,
                stage: row.stage,
                unit: row.unit,
                message: details.message,
                timestamp: details.timestamp || row.timestamp,
                filesTracked: details.filesTracked || 0,
                conversationTurns: details.conversationTurns || 0,
                files: this.fileManager.getCheckpointFiles(details.checkpointId),
            };
        });
    }

    /**
     * Get checkpoint details
     * @param {string} sessionId - Session ID
     * @param {string} checkpointId - Checkpoint ID
     * @returns {Object|null} Checkpoint details or null if not found
     */
    get(sessionId, checkpointId) {
        const row = this.stmts.getCheckpointBySessionAndId.get(sessionId, checkpointId);

        if (!row) {
            return null;
        }

        const details = JSON.parse(row.details || '{}');

        return {
            id: checkpointId,
            dbId: row.id,
            sessionId: row.session_id,
            phase: row.phase,
            stage: row.stage,
            unit: row.unit,
            message: details.message,
            timestamp: details.timestamp || row.timestamp,
            state: details.state || {},
            context: details.context || {},
            files: this.fileManager.getCheckpointFiles(checkpointId),
            conversation: this.conversationTracker.loadFromCheckpoint(checkpointId),
        };
    }

    /**
     * Compare two checkpoints
     * @param {string} sessionId - Session ID
     * @param {string} checkpointId1 - First checkpoint ID
     * @param {string} checkpointId2 - Second checkpoint ID
     * @returns {Object} Comparison result
     */
    compare(sessionId, checkpointId1, checkpointId2) {
        const cp1 = this.get(sessionId, checkpointId1);
        const cp2 = this.get(sessionId, checkpointId2);

        if (!cp1 || !cp2) {
            throw new Error('One or both checkpoints not found');
        }

        const files1 = new Set(cp1.files.map(f => f.path));
        const files2 = new Set(cp2.files.map(f => f.path));

        const allFiles = new Set([...files1, ...files2]);
        const comparison = [];

        for (const filePath of allFiles) {
            const inCp1 = files1.has(filePath);
            const inCp2 = files2.has(filePath);

            const file1 = cp1.files.find(f => f.path === filePath);
            const file2 = cp2.files.find(f => f.path === filePath);

            comparison.push({
                path: filePath,
                inCheckpoint1: inCp1,
                inCheckpoint2: inCp2,
                hashBefore1: file1?.hashBefore,
                hashAfter1: file1?.hashAfter,
                hashBefore2: file2?.hashBefore,
                hashAfter2: file2?.hashAfter,
                changed: file1?.hashAfter !== file2?.hashAfter,
            });
        }

        return {
            checkpoint1: { id: cp1.id, timestamp: cp1.timestamp },
            checkpoint2: { id: cp2.id, timestamp: cp2.timestamp },
            files: comparison,
            conversationDelta: (cp2.conversation?.length || 0) - (cp1.conversation?.length || 0),
        };
    }

    /**
     * Prune old checkpoints
     * @param {string} sessionId - Session ID
     * @param {number} keepCount - Number of recent checkpoints to keep
     * @returns {number} Number of checkpoints pruned
     */
    prune(sessionId, keepCount = 50) {
        const checkpoints = this.list(sessionId, 1000);

        if (checkpoints.length <= keepCount) {
            return 0;
        }

        const toDelete = checkpoints.slice(keepCount);
        let deleted = 0;

        for (const cp of toDelete) {
            try {
                this.stmts.deleteCheckpoint.run(cp.dbId);
                deleted++;
            } catch (error) {
                console.error(`[Checkpoint] Failed to delete: ${cp.id}`, error.message);
            }
        }

        if (deleted > 0) {
            console.log(`[Checkpoint] Pruned ${deleted} old checkpoints`);
        }

        return deleted;
    }

    /**
     * Get rollback history for a checkpoint
     * @param {string} checkpointId - Checkpoint ID
     * @returns {Array<Object>} Rollback history entries
     */
    getRollbackHistory(checkpointId) {
        return this.stmts.getRollbackHistory.all(checkpointId);
    }

    /**
     * Clear all pending file changes without creating checkpoint
     */
    clearPendingChanges() {
        this.pendingFileChanges.clear();
        this.conversationTracker.clear();
    }
}

// Singleton instance for hook integration
let instance = null;

/**
 * Get or create the singleton instance
 * @param {Object} db - Database instance (required on first call)
 * @param {Object} options - Configuration options
 * @returns {EnhancedCheckpointManager} Manager instance
 */
function getEnhancedCheckpointManager(db, options = {}) {
    if (!instance && db) {
        instance = new EnhancedCheckpointManager(db, options);
    }
    return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
function resetEnhancedCheckpointManager() {
    instance = null;
}

module.exports = {
    EnhancedCheckpointManager,
    getEnhancedCheckpointManager,
    resetEnhancedCheckpointManager,
};
