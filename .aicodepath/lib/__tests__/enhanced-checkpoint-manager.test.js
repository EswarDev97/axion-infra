/**
 * Tests for Enhanced Checkpoint Manager
 *
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const {
    EnhancedCheckpointManager,
    resetEnhancedCheckpointManager,
} = require('../enhanced-checkpoint-manager');

describe('EnhancedCheckpointManager', () => {
    let db;
    let manager;
    let testDir;

    beforeEach(() => {
        // Reset singleton
        resetEnhancedCheckpointManager();

        // Create in-memory database with required schema
        db = new Database(':memory:');
        db.exec(`
      CREATE TABLE session_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        phase TEXT,
        stage TEXT,
        unit TEXT,
        action TEXT,
        details JSON,
        timestamp TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE checkpoint_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkpoint_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        operation TEXT NOT NULL,
        content_before BLOB,
        content_after BLOB,
        hash_before TEXT,
        hash_after TEXT,
        diff_patch TEXT,
        file_size_before INTEGER DEFAULT 0,
        file_size_after INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(checkpoint_id, file_path)
      );

      CREATE TABLE checkpoint_conversation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkpoint_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE rollback_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkpoint_id TEXT NOT NULL,
        rollback_type TEXT NOT NULL,
        files_reverted INTEGER DEFAULT 0,
        conversation_turns_reverted INTEGER DEFAULT 0,
        initiated_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        status TEXT DEFAULT 'in_progress',
        error_message TEXT
      );
    `);

        manager = new EnhancedCheckpointManager(db);
        testDir = path.join(__dirname, 'test-files-enhanced-cp');
        fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        // Cleanup test directory
        fs.rmSync(testDir, { recursive: true, force: true });
        db.close();
    });

    describe('trackFileChange', () => {
        test('tracks file before modification', () => {
            const testFile = path.join(testDir, 'tracked.txt');
            fs.writeFileSync(testFile, 'Original content');

            manager.trackFileChange(testFile);

            expect(manager.getPendingFileCount()).toBe(1);
        });

        test('does not duplicate tracking', () => {
            const testFile = path.join(testDir, 'tracked.txt');
            fs.writeFileSync(testFile, 'Content');

            manager.trackFileChange(testFile);
            manager.trackFileChange(testFile);

            expect(manager.getPendingFileCount()).toBe(1);
        });
    });

    describe('recordTurn', () => {
        test('records conversation turn', () => {
            manager.recordTurn('user', 'Hello');
            manager.recordTurn('assistant', 'Hi there!');

            // Turns are buffered in conversation tracker
            const turns = manager.conversationTracker.getCurrentTurns();
            expect(turns).toHaveLength(2);
        });
    });

    describe('createCheckpoint', () => {
        test('creates checkpoint with files and conversation', () => {
            const testFile = path.join(testDir, 'test.txt');
            fs.writeFileSync(testFile, 'V1');

            manager.trackFileChange(testFile);
            fs.writeFileSync(testFile, 'V2');

            manager.recordTurn('user', 'Make a change');
            manager.recordTurn('assistant', 'Done!');

            const checkpointId = manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'build',
                unit: 'auth',
                message: 'Test checkpoint',
            });

            expect(checkpointId).toMatch(/^chk_[a-f0-9]+$/);
            expect(manager.getPendingFileCount()).toBe(0);
        });

        test('stores file snapshots', () => {
            const testFile = path.join(testDir, 'snapshot.txt');
            fs.writeFileSync(testFile, 'Before');

            manager.trackFileChange(testFile);
            fs.writeFileSync(testFile, 'After');

            const checkpointId = manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'build',
                unit: 'test',
            });

            const checkpoint = manager.get('test-session', checkpointId);
            expect(checkpoint.files).toHaveLength(1);
            expect(checkpoint.files[0].operation).toBe('modify');
        });
    });

    describe('list', () => {
        test('lists checkpoints for session', () => {
            manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'INCEPTION',
                stage: 'requirements',
                unit: null,
            });

            manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'build',
                unit: 'auth',
            });

            const checkpoints = manager.list('test-session', 10);

            expect(checkpoints).toHaveLength(2);
        });

        test('orders by most recent first', () => {
            manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'INCEPTION',
                stage: 'first',
                unit: null,
            });

            manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'second',
                unit: null,
            });

            const checkpoints = manager.list('test-session', 10);

            expect(checkpoints[0].stage).toBe('second');
            expect(checkpoints[1].stage).toBe('first');
        });
    });

    describe('get', () => {
        test('returns checkpoint details', () => {
            const testFile = path.join(testDir, 'details.txt');
            fs.writeFileSync(testFile, 'Content');

            manager.trackFileChange(testFile);
            fs.writeFileSync(testFile, 'New content');
            manager.recordTurn('user', 'Test message');

            const checkpointId = manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'test',
                unit: 'component',
                message: 'Test checkpoint',
            });

            const checkpoint = manager.get('test-session', checkpointId);

            expect(checkpoint).not.toBeNull();
            expect(checkpoint.id).toBe(checkpointId);
            expect(checkpoint.phase).toBe('CONSTRUCTION');
            expect(checkpoint.files).toHaveLength(1);
            expect(checkpoint.conversation).toHaveLength(1);
        });

        test('returns null for non-existent checkpoint', () => {
            const checkpoint = manager.get('test-session', 'chk_nonexistent');
            expect(checkpoint).toBeNull();
        });
    });

    describe('rewind', () => {
        test('rewinds files to before state', () => {
            const testFile = path.join(testDir, 'rewind.txt');
            fs.writeFileSync(testFile, 'Original');

            manager.trackFileChange(testFile);
            fs.writeFileSync(testFile, 'Modified');

            const checkpointId = manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'build',
                unit: 'test',
            });

            // Modify file again
            fs.writeFileSync(testFile, 'Further modified');

            // Rewind
            const result = manager.rewind(checkpointId, 'code');

            expect(result.success).toBe(true);
            expect(result.filesReverted).toBe(1);
            expect(fs.readFileSync(testFile, 'utf8')).toBe('Original');
        });

        test('records rollback history', () => {
            const testFile = path.join(testDir, 'rollback.txt');
            fs.writeFileSync(testFile, 'V1');

            manager.trackFileChange(testFile);
            fs.writeFileSync(testFile, 'V2');

            const checkpointId = manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'build',
                unit: 'test',
            });

            manager.rewind(checkpointId, 'code');

            const history = manager.getRollbackHistory(checkpointId);
            expect(history).toHaveLength(1);
            expect(history[0].status).toBe('completed');
        });
    });

    describe('compare', () => {
        test('compares two checkpoints', () => {
            const file1 = path.join(testDir, 'compare1.txt');
            const file2 = path.join(testDir, 'compare2.txt');

            // First checkpoint
            fs.writeFileSync(file1, 'A');
            manager.trackFileChange(file1);
            fs.writeFileSync(file1, 'B');

            const cp1 = manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 's1',
                unit: null,
            });

            // Second checkpoint
            fs.writeFileSync(file2, 'X');
            manager.trackFileChange(file2);
            fs.writeFileSync(file2, 'Y');

            const cp2 = manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 's2',
                unit: null,
            });

            const comparison = manager.compare('test-session', cp1, cp2);

            expect(comparison.checkpoint1.id).toBe(cp1);
            expect(comparison.checkpoint2.id).toBe(cp2);
            expect(comparison.files.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('prune', () => {
        test('prunes old checkpoints', () => {
            // Create multiple checkpoints
            for (let i = 0; i < 5; i++) {
                manager.createCheckpoint({
                    sessionId: 'test-session',
                    phase: 'CONSTRUCTION',
                    stage: `stage-${i}`,
                    unit: null,
                });
            }

            const deleted = manager.prune('test-session', 3);

            expect(deleted).toBe(2);
            expect(manager.list('test-session', 100)).toHaveLength(3);
        });

        test('does nothing if under limit', () => {
            manager.createCheckpoint({
                sessionId: 'test-session',
                phase: 'CONSTRUCTION',
                stage: 'only-one',
                unit: null,
            });

            const deleted = manager.prune('test-session', 10);

            expect(deleted).toBe(0);
        });
    });

    describe('clearPendingChanges', () => {
        test('clears pending file changes and conversation buffer', () => {
            const testFile = path.join(testDir, 'pending.txt');
            fs.writeFileSync(testFile, 'Content');

            manager.trackFileChange(testFile);
            manager.recordTurn('user', 'Test');

            manager.clearPendingChanges();

            expect(manager.getPendingFileCount()).toBe(0);
            expect(manager.conversationTracker.getBufferCount()).toBe(0);
        });
    });
});
