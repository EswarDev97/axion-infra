/**
 * File Snapshot Manager for AICodePath
 *
 * Captures file content changes for checkpoint tracking, enabling
 * rollback of code modifications to previous checkpoint states.
 *
 * Features:
 * - Capture file state before/after modifications
 * - Generate unified diffs for display
 * - Compress file content for storage efficiency
 * - Restore files to checkpoint state
 * - Exclude patterns for node_modules, .git, etc.
 *
 * @module lib/file-snapshot-manager
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { createPatch } = require('diff');

class FileSnapshotManager {
    /**
     * Create a new FileSnapshotManager
     * @param {Object} db - better-sqlite3 database instance
     * @param {Object} options - Configuration options
     */
    constructor(db, options = {}) {
        this.db = db;
        this.options = {
            maxFileSize: 10 * 1024 * 1024, // 10MB max per file
            compressThreshold: 1024, // Compress files > 1KB
            excludePatterns: [
                'node_modules/**',
                '.git/**',
                '*.log',
                '.aicodepath/db/**',
                '.aicodepath/logs/**',
                'coverage/**',
                'dist/**',
                'build/**',
            ],
            ...options,
        };

        this._prepareStatements();
    }

    /**
     * Prepare database statements for reuse
     * @private
     */
    _prepareStatements() {
        this.stmts = {
            insertFile: this.db.prepare(`
        INSERT INTO checkpoint_files
        (checkpoint_id, file_path, operation, content_before, content_after, hash_before, hash_after, diff_patch, file_size_before, file_size_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
            getFileSnapshot: this.db.prepare(`
        SELECT * FROM checkpoint_files WHERE checkpoint_id = ? AND file_path = ?
      `),
            getCheckpointFiles: this.db.prepare(`
        SELECT * FROM checkpoint_files WHERE checkpoint_id = ? ORDER BY file_path
      `),
            getFileHistory: this.db.prepare(`
        SELECT cf.*, cf.created_at as checkpoint_time
        FROM checkpoint_files cf
        WHERE cf.file_path = ?
        ORDER BY cf.created_at DESC
        LIMIT ?
      `),
            deleteCheckpointFiles: this.db.prepare(`
        DELETE FROM checkpoint_files WHERE checkpoint_id = ?
      `),
        };
    }

    /**
     * Calculate SHA-256 hash of content (truncated to 16 chars)
     * @param {Buffer|string} content - Content to hash
     * @returns {string|null} Hash string or null if no content
     * @private
     */
    _hashContent(content) {
        if (!content) return null;
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
    }

    /**
     * Compress content if above threshold
     * @param {Buffer|string} content - Content to compress
     * @returns {Buffer|null} Compressed content or original if below threshold
     * @private
     */
    _compress(content) {
        if (!content) return null;
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        if (buffer.length < this.options.compressThreshold) {
            return buffer;
        }
        return zlib.gzipSync(buffer);
    }

    /**
     * Decompress content
     * @param {Buffer} data - Potentially compressed data
     * @returns {string|null} Decompressed content as UTF-8 string
     * @private
     */
    _decompress(data) {
        if (!data) return null;

        // Check if gzip compressed (magic bytes: 0x1f 0x8b)
        if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
            return zlib.gunzipSync(data).toString('utf8');
        }
        return data.toString('utf8');
    }

    /**
     * Check if file path should be excluded from tracking
     * @param {string} filePath - File path to check
     * @returns {boolean} True if file should be excluded
     * @private
     */
    _shouldExclude(filePath) {
        const { minimatch } = require('minimatch');
        const normalizedPath = filePath.replace(/\\/g, '/');
        return this.options.excludePatterns.some(pattern =>
            minimatch(normalizedPath, pattern, { dot: true, matchBase: true })
        );
    }

    /**
     * Check if content is binary (contains null bytes)
     * @param {Buffer} buffer - Content buffer
     * @returns {boolean} True if binary content detected
     * @private
     */
    _isBinary(buffer) {
        if (!buffer || buffer.length === 0) return false;
        // Check for null bytes in first 8KB
        const sample = buffer.slice(0, 8192);
        for (let i = 0; i < sample.length; i++) {
            if (sample[i] === 0) return true;
        }
        return false;
    }

    /**
     * Capture file state before modification
     * @param {string} filePath - Path to file
     * @returns {Object|null} File state object or null if excluded/error
     */
    captureBeforeState(filePath) {
        if (this._shouldExclude(filePath)) {
            return null;
        }

        const absolutePath = path.resolve(filePath);

        try {
            if (!fs.existsSync(absolutePath)) {
                return { exists: false, content: null, hash: null, size: 0 };
            }

            const stats = fs.statSync(absolutePath);
            if (stats.size > this.options.maxFileSize) {
                console.warn(`[FileSnapshot] File too large, skipping: ${filePath} (${stats.size} bytes)`);
                return null;
            }

            const content = fs.readFileSync(absolutePath);
            return {
                exists: true,
                content,
                hash: this._hashContent(content),
                size: stats.size,
            };
        } catch (error) {
            console.error(`[FileSnapshot] Failed to capture before state: ${filePath}`, error.message);
            return null;
        }
    }

    /**
     * Capture file state after modification
     * @param {string} filePath - Path to file
     * @returns {Object|null} File state object or null if excluded/error
     */
    captureAfterState(filePath) {
        return this.captureBeforeState(filePath);
    }

    /**
     * Create unified diff between two states
     * @param {Buffer|null} beforeContent - Content before change
     * @param {Buffer|null} afterContent - Content after change
     * @param {string} filePath - File path for diff header
     * @returns {string} Unified diff string
     */
    createDiff(beforeContent, afterContent, filePath) {
        const beforeText = beforeContent?.toString('utf8') || '';
        const afterText = afterContent?.toString('utf8') || '';

        // Check if binary
        if (this._isBinary(beforeContent) || this._isBinary(afterContent)) {
            return '[Binary file changed]';
        }

        try {
            return createPatch(filePath, beforeText, afterText, 'before', 'after');
        } catch (error) {
            console.error(`[FileSnapshot] Failed to create diff: ${filePath}`, error.message);
            return `[Error creating diff: ${error.message}]`;
        }
    }

    /**
     * Save file snapshot to checkpoint
     * @param {string} checkpointId - Checkpoint ID
     * @param {string} filePath - File path
     * @param {Object} beforeState - State before modification
     * @param {Object} afterState - State after modification
     * @returns {boolean} True if saved successfully
     */
    saveSnapshot(checkpointId, filePath, beforeState, afterState) {
        if (!beforeState && !afterState) {
            return false;
        }

        // Determine operation type
        let operation;
        if (!beforeState?.exists && afterState?.exists) {
            operation = 'create';
        } else if (beforeState?.exists && !afterState?.exists) {
            operation = 'delete';
        } else if (beforeState?.hash === afterState?.hash) {
            // No change, skip saving
            return false;
        } else {
            operation = 'modify';
        }

        const diff = this.createDiff(
            beforeState?.content,
            afterState?.content,
            filePath
        );

        try {
            this.stmts.insertFile.run(
                checkpointId,
                filePath,
                operation,
                this._compress(beforeState?.content),
                this._compress(afterState?.content),
                beforeState?.hash,
                afterState?.hash,
                diff,
                beforeState?.size || 0,
                afterState?.size || 0
            );
            return true;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                console.warn(`[FileSnapshot] Duplicate snapshot for ${filePath} in checkpoint ${checkpointId}`);
            } else {
                console.error(`[FileSnapshot] Failed to save: ${filePath}`, error.message);
            }
            return false;
        }
    }

    /**
     * Get all file changes in a checkpoint
     * @param {string} checkpointId - Checkpoint ID
     * @returns {Array<Object>} Array of file change objects
     */
    getCheckpointFiles(checkpointId) {
        const rows = this.stmts.getCheckpointFiles.all(checkpointId);

        return rows.map(row => ({
            path: row.file_path,
            operation: row.operation,
            hashBefore: row.hash_before,
            hashAfter: row.hash_after,
            sizeBefore: row.file_size_before,
            sizeAfter: row.file_size_after,
            diff: row.diff_patch,
        }));
    }

    /**
     * Restore a single file to checkpoint state
     * @param {string} checkpointId - Checkpoint ID
     * @param {string} filePath - File path to restore
     * @param {string} mode - 'before' or 'after'
     * @returns {boolean} True if restored successfully
     */
    restoreFile(checkpointId, filePath, mode = 'before') {
        const snapshot = this.stmts.getFileSnapshot.get(checkpointId, filePath);

        if (!snapshot) {
            throw new Error(`No snapshot found for ${filePath} in checkpoint ${checkpointId}`);
        }

        const contentField = mode === 'before' ? 'content_before' : 'content_after';
        const content = this._decompress(snapshot[contentField]);

        const absolutePath = path.resolve(filePath);

        try {
            if (content === null) {
                // File didn't exist at this point, delete it
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                    console.log(`[FileSnapshot] Deleted: ${filePath}`);
                }
            } else {
                // Ensure directory exists
                fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
                fs.writeFileSync(absolutePath, content);
                console.log(`[FileSnapshot] Restored: ${filePath}`);
            }
            return true;
        } catch (error) {
            console.error(`[FileSnapshot] Failed to restore: ${filePath}`, error.message);
            throw error;
        }
    }

    /**
     * Restore all files in a checkpoint
     * @param {string} checkpointId - Checkpoint ID
     * @param {string} mode - 'before' or 'after'
     * @returns {Object} Results with success and failed arrays
     */
    restoreCheckpoint(checkpointId, mode = 'before') {
        const files = this.stmts.getCheckpointFiles.all(checkpointId);
        const results = { success: [], failed: [] };

        for (const file of files) {
            try {
                this.restoreFile(checkpointId, file.file_path, mode);
                results.success.push(file.file_path);
            } catch (error) {
                results.failed.push({ path: file.file_path, error: error.message });
            }
        }

        return results;
    }

    /**
     * Get file history across checkpoints
     * @param {string} filePath - File path
     * @param {number} limit - Maximum number of entries
     * @returns {Array<Object>} Array of file history entries
     */
    getFileHistory(filePath, limit = 10) {
        return this.stmts.getFileHistory.all(filePath, limit);
    }

    /**
     * Get file content from a checkpoint
     * @param {string} checkpointId - Checkpoint ID
     * @param {string} filePath - File path
     * @param {string} mode - 'before' or 'after'
     * @returns {string|null} File content or null if not found
     */
    getFileContent(checkpointId, filePath, mode = 'after') {
        const snapshot = this.stmts.getFileSnapshot.get(checkpointId, filePath);
        if (!snapshot) return null;

        const contentField = mode === 'before' ? 'content_before' : 'content_after';
        return this._decompress(snapshot[contentField]);
    }
}

module.exports = { FileSnapshotManager };
