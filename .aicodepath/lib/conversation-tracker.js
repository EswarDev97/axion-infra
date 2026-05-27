/**
 * Conversation Tracker for AICodePath
 *
 * Tracks conversation history for checkpoints, enabling
 * preservation and restoration of conversation context.
 *
 * Features:
 * - Buffer conversation turns in memory
 * - Save turns to checkpoint on commit
 * - Load conversation from checkpoint
 * - Get conversation delta between checkpoints
 *
 * @module lib/conversation-tracker
 */

class ConversationTracker {
    /**
     * Create a new ConversationTracker
     * @param {Object} db - better-sqlite3 database instance
     */
    constructor(db) {
        this.db = db;
        this.currentTurns = [];

        this._prepareStatements();
    }

    /**
     * Prepare database statements for reuse
     * @private
     */
    _prepareStatements() {
        this.stmts = {
            insertTurn: this.db.prepare(`
        INSERT INTO checkpoint_conversation
        (checkpoint_id, turn_number, role, content, tool_calls)
        VALUES (?, ?, ?, ?, ?)
      `),
            getTurns: this.db.prepare(`
        SELECT * FROM checkpoint_conversation
        WHERE checkpoint_id = ?
        ORDER BY turn_number
      `),
            getTurnsSince: this.db.prepare(`
        SELECT * FROM checkpoint_conversation
        WHERE checkpoint_id = ? AND turn_number > ?
        ORDER BY turn_number
      `),
            getLatestTurn: this.db.prepare(`
        SELECT MAX(turn_number) as max_turn FROM checkpoint_conversation
        WHERE checkpoint_id = ?
      `),
            deleteTurns: this.db.prepare(`
        DELETE FROM checkpoint_conversation WHERE checkpoint_id = ?
      `),
            getTurnCount: this.db.prepare(`
        SELECT COUNT(*) as count FROM checkpoint_conversation WHERE checkpoint_id = ?
      `),
        };
    }

    /**
     * Add a conversation turn to the buffer
     * @param {string} role - Role: 'user', 'assistant', or 'system'
     * @param {string} content - Message content
     * @param {Array|null} toolCalls - Array of tool calls in this turn
     */
    addTurn(role, content, toolCalls = null) {
        if (!role || !content) {
            console.warn('[ConversationTracker] Invalid turn: missing role or content');
            return;
        }

        this.currentTurns.push({
            role,
            content,
            toolCalls: toolCalls ? JSON.stringify(toolCalls) : null,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Get the current buffer of turns
     * @returns {Array<Object>} Current turns buffer
     */
    getCurrentTurns() {
        return [...this.currentTurns];
    }

    /**
     * Get the count of buffered turns
     * @returns {number} Number of turns in buffer
     */
    getBufferCount() {
        return this.currentTurns.length;
    }

    /**
     * Save conversation buffer to checkpoint
     * @param {string} checkpointId - Checkpoint ID to save to
     * @returns {number} Number of turns saved
     */
    saveToCheckpoint(checkpointId) {
        if (this.currentTurns.length === 0) {
            return 0;
        }

        const transaction = this.db.transaction(() => {
            let turnNumber = 1;

            for (const turn of this.currentTurns) {
                this.stmts.insertTurn.run(
                    checkpointId,
                    turnNumber++,
                    turn.role,
                    turn.content,
                    turn.toolCalls
                );
            }

            return turnNumber - 1;
        });

        const savedCount = transaction();

        // Clear current turns after saving
        this.currentTurns = [];
        console.log(`[ConversationTracker] Saved ${savedCount} turns to checkpoint ${checkpointId}`);

        return savedCount;
    }

    /**
     * Load conversation from checkpoint
     * @param {string} checkpointId - Checkpoint ID to load from
     * @returns {Array<Object>} Array of conversation turns
     */
    loadFromCheckpoint(checkpointId) {
        const rows = this.stmts.getTurns.all(checkpointId);

        return rows.map(row => ({
            turnNumber: row.turn_number,
            role: row.role,
            content: row.content,
            toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : null,
            timestamp: row.timestamp,
        }));
    }

    /**
     * Get conversation delta since a specific turn
     * @param {string} checkpointId - Checkpoint ID
     * @param {number} sinceTurnNumber - Get turns after this number
     * @returns {Array<Object>} Array of turns since the specified turn
     */
    getConversationDelta(checkpointId, sinceTurnNumber) {
        const rows = this.stmts.getTurnsSince.all(checkpointId, sinceTurnNumber);

        return rows.map(row => ({
            turnNumber: row.turn_number,
            role: row.role,
            content: row.content,
            toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : null,
            timestamp: row.timestamp,
        }));
    }

    /**
     * Get the number of turns in a checkpoint
     * @param {string} checkpointId - Checkpoint ID
     * @returns {number} Number of turns
     */
    getTurnCount(checkpointId) {
        const result = this.stmts.getTurnCount.get(checkpointId);
        return result?.count || 0;
    }

    /**
     * Get the latest turn number for a checkpoint
     * @param {string} checkpointId - Checkpoint ID
     * @returns {number} Latest turn number or 0 if no turns
     */
    getLatestTurnNumber(checkpointId) {
        const result = this.stmts.getLatestTurn.get(checkpointId);
        return result?.max_turn || 0;
    }

    /**
     * Clear the conversation buffer
     */
    clear() {
        this.currentTurns = [];
    }

    /**
     * Format conversation for display
     * @param {string} checkpointId - Checkpoint ID
     * @returns {string} Formatted conversation string
     */
    formatConversation(checkpointId) {
        const turns = this.loadFromCheckpoint(checkpointId);

        return turns.map(turn => {
            const roleLabel = turn.role.toUpperCase();
            const content = turn.content.length > 200
                ? turn.content.substring(0, 200) + '...'
                : turn.content;
            return `[${roleLabel}] ${content}`;
        }).join('\n\n');
    }
}

module.exports = { ConversationTracker };
