/**
 * Tests for File Snapshot Manager
 *
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { FileSnapshotManager } = require('../file-snapshot-manager');

describe('FileSnapshotManager', () => {
    let db;
    let manager;
    let testDir;

    beforeEach(() => {
        // Create in-memory database with required schema
        db = new Database(':memory:');
        db.exec(`
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
    `);

        manager = new FileSnapshotManager(db);
        testDir = path.join(__dirname, 'test-files-snapshot');
        fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        // Cleanup test directory
        fs.rmSync(testDir, { recursive: true, force: true });
        db.close();
    });

    describe('captureBeforeState', () => {
        test('captures existing file state', () => {
            const testFile = path.join(testDir, 'test.txt');
            fs.writeFileSync(testFile, 'Hello World');

            const state = manager.captureBeforeState(testFile);

            expect(state).not.toBeNull();
            expect(state.exists).toBe(true);
            expect(state.hash).toBeDefined();
            expect(state.hash).toHaveLength(16);
            expect(state.size).toBe(11);
        });

        test('returns exists:false for non-existent file', () => {
            const testFile = path.join(testDir, 'nonexistent.txt');

            const state = manager.captureBeforeState(testFile);

            expect(state).not.toBeNull();
            expect(state.exists).toBe(false);
            expect(state.content).toBeNull();
            expect(state.hash).toBeNull();
            expect(state.size).toBe(0);
        });

        test('excludes node_modules paths', () => {
            const testFile = path.join(testDir, 'node_modules', 'package', 'index.js');
            fs.mkdirSync(path.dirname(testFile), { recursive: true });
            fs.writeFileSync(testFile, 'module.exports = {}');

            const state = manager.captureBeforeState(testFile);

            expect(state).toBeNull();
        });

        test('excludes .git paths', () => {
            const state = manager.captureBeforeState('.git/config');
            expect(state).toBeNull();
        });
    });

    describe('createDiff', () => {
        test('creates diff between two states', () => {
            const before = Buffer.from('Hello World');
            const after = Buffer.from('Hello Universe');

            const diff = manager.createDiff(before, after, 'test.txt');

            expect(diff).toContain('-Hello World');
            expect(diff).toContain('+Hello Universe');
        });

        test('handles empty before content', () => {
            const after = Buffer.from('New content');

            const diff = manager.createDiff(null, after, 'new-file.txt');

            expect(diff).toContain('+New content');
        });

        test('handles empty after content', () => {
            const before = Buffer.from('Old content');

            const diff = manager.createDiff(before, null, 'deleted-file.txt');

            expect(diff).toContain('-Old content');
        });

        test('returns binary indicator for binary files', () => {
            // Create a buffer with null bytes (binary indicator)
            const before = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6c, 0x6f]);
            const after = Buffer.from([0x57, 0x6f, 0x72, 0x00, 0x6c, 0x64]);

            const diff = manager.createDiff(before, after, 'binary.bin');

            expect(diff).toBe('[Binary file changed]');
        });
    });

    describe('saveSnapshot', () => {
        test('saves snapshot with modify operation', () => {
            const testFile = path.join(testDir, 'modify-test.txt');
            fs.writeFileSync(testFile, 'Original');

            const before = manager.captureBeforeState(testFile);
            fs.writeFileSync(testFile, 'Modified');
            const after = manager.captureAfterState(testFile);

            const result = manager.saveSnapshot('test-cp', testFile, before, after);

            expect(result).toBe(true);

            const files = manager.getCheckpointFiles('test-cp');
            expect(files).toHaveLength(1);
            expect(files[0].operation).toBe('modify');
        });

        test('saves snapshot with create operation', () => {
            const testFile = path.join(testDir, 'new-file.txt');

            const before = manager.captureBeforeState(testFile);
            expect(before.exists).toBe(false);

            fs.writeFileSync(testFile, 'New content');
            const after = manager.captureAfterState(testFile);

            const result = manager.saveSnapshot('test-cp', testFile, before, after);

            expect(result).toBe(true);

            const files = manager.getCheckpointFiles('test-cp');
            expect(files).toHaveLength(1);
            expect(files[0].operation).toBe('create');
        });

        test('saves snapshot with delete operation', () => {
            const testFile = path.join(testDir, 'delete-me.txt');
            fs.writeFileSync(testFile, 'To be deleted');

            const before = manager.captureBeforeState(testFile);
            fs.unlinkSync(testFile);
            const after = manager.captureAfterState(testFile);

            const result = manager.saveSnapshot('test-cp', testFile, before, after);

            expect(result).toBe(true);

            const files = manager.getCheckpointFiles('test-cp');
            expect(files).toHaveLength(1);
            expect(files[0].operation).toBe('delete');
        });

        test('skips unchanged files', () => {
            const testFile = path.join(testDir, 'unchanged.txt');
            fs.writeFileSync(testFile, 'Same content');

            const before = manager.captureBeforeState(testFile);
            const after = manager.captureAfterState(testFile);

            const result = manager.saveSnapshot('test-cp', testFile, before, after);

            expect(result).toBe(false);
        });
    });

    describe('restoreFile', () => {
        test('restores file to before state', () => {
            const testFile = path.join(testDir, 'restore-test.txt');
            fs.writeFileSync(testFile, 'Original');

            const before = manager.captureBeforeState(testFile);
            fs.writeFileSync(testFile, 'Modified');
            const after = manager.captureAfterState(testFile);

            manager.saveSnapshot('test-cp', testFile, before, after);

            // Modify again
            fs.writeFileSync(testFile, 'Further modified');

            // Restore to before
            manager.restoreFile('test-cp', testFile, 'before');

            expect(fs.readFileSync(testFile, 'utf8')).toBe('Original');
        });

        test('restores file to after state', () => {
            const testFile = path.join(testDir, 'restore-after-test.txt');
            fs.writeFileSync(testFile, 'Original');

            const before = manager.captureBeforeState(testFile);
            fs.writeFileSync(testFile, 'Modified');
            const after = manager.captureAfterState(testFile);

            manager.saveSnapshot('test-cp', testFile, before, after);

            // Reset to original
            fs.writeFileSync(testFile, 'Original');

            // Restore to after
            manager.restoreFile('test-cp', testFile, 'after');

            expect(fs.readFileSync(testFile, 'utf8')).toBe('Modified');
        });

        test('deletes file if before state was non-existent', () => {
            const testFile = path.join(testDir, 'created-then-deleted.txt');

            const before = manager.captureBeforeState(testFile);
            fs.writeFileSync(testFile, 'New content');
            const after = manager.captureAfterState(testFile);

            manager.saveSnapshot('test-cp', testFile, before, after);

            // Restore to before (file shouldn't exist)
            manager.restoreFile('test-cp', testFile, 'before');

            expect(fs.existsSync(testFile)).toBe(false);
        });

        test('throws error for non-existent snapshot', () => {
            expect(() => {
                manager.restoreFile('nonexistent-cp', '/fake/path', 'before');
            }).toThrow('No snapshot found');
        });
    });

    describe('restoreCheckpoint', () => {
        test('restores all files in checkpoint', () => {
            const file1 = path.join(testDir, 'file1.txt');
            const file2 = path.join(testDir, 'file2.txt');

            fs.writeFileSync(file1, 'File 1 Original');
            fs.writeFileSync(file2, 'File 2 Original');

            const before1 = manager.captureBeforeState(file1);
            const before2 = manager.captureBeforeState(file2);

            fs.writeFileSync(file1, 'File 1 Modified');
            fs.writeFileSync(file2, 'File 2 Modified');

            const after1 = manager.captureAfterState(file1);
            const after2 = manager.captureAfterState(file2);

            manager.saveSnapshot('test-cp', file1, before1, after1);
            manager.saveSnapshot('test-cp', file2, before2, after2);

            // Modify files again
            fs.writeFileSync(file1, 'File 1 Further');
            fs.writeFileSync(file2, 'File 2 Further');

            // Restore checkpoint
            const result = manager.restoreCheckpoint('test-cp', 'before');

            expect(result.success).toHaveLength(2);
            expect(result.failed).toHaveLength(0);
            expect(fs.readFileSync(file1, 'utf8')).toBe('File 1 Original');
            expect(fs.readFileSync(file2, 'utf8')).toBe('File 2 Original');
        });
    });

    describe('getFileHistory', () => {
        test('returns file history across checkpoints', () => {
            const testFile = path.join(testDir, 'history-test.txt');
            fs.writeFileSync(testFile, 'V1');

            const before1 = manager.captureBeforeState(testFile);
            fs.writeFileSync(testFile, 'V2');
            const after1 = manager.captureAfterState(testFile);
            manager.saveSnapshot('cp-1', testFile, before1, after1);

            const before2 = manager.captureAfterState(testFile);
            fs.writeFileSync(testFile, 'V3');
            const after2 = manager.captureAfterState(testFile);
            manager.saveSnapshot('cp-2', testFile, before2, after2);

            const history = manager.getFileHistory(testFile, 10);

            expect(history.length).toBeGreaterThanOrEqual(2);
        });
    });
});
