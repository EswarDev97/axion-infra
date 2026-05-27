/**
 * Tests for Conversation Tracker
 *
 * @jest-environment node
 */

const Database = require('better-sqlite3');
const { ConversationTracker } = require('../conversation-tracker');

describe('ConversationTracker', () => {
    let db;
    let tracker;

    beforeEach(() => {
        // Create in-memory database with required schema
        db = new Database(':memory:');
        db.exec(`
      CREATE TABLE checkpoint_conversation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkpoint_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      );
    `);

        tracker = new ConversationTracker(db);
    });

    afterEach(() => {
        db.close();
    });

    describe('addTurn', () => {
        test('adds turn to buffer', () => {
            tracker.addTurn('user', 'Hello, can you help me?');

            expect(tracker.getBufferCount()).toBe(1);
            const turns = tracker.getCurrentTurns();
            expect(turns[0].role).toBe('user');
            expect(turns[0].content).toBe('Hello, can you help me?');
        });

        test('adds multiple turns', () => {
            tracker.addTurn('user', 'Question 1');
            tracker.addTurn('assistant', 'Answer 1');
            tracker.addTurn('user', 'Question 2');

            expect(tracker.getBufferCount()).toBe(3);
        });

        test('handles tool calls', () => {
            const toolCalls = [
                { name: 'Read', arguments: { file: 'test.txt' } },
                { name: 'Write', arguments: { file: 'output.txt' } },
            ];

            tracker.addTurn('assistant', 'Let me help you', toolCalls);

            const turns = tracker.getCurrentTurns();
            expect(turns[0].toolCalls).toBe(JSON.stringify(toolCalls));
        });

        test('ignores invalid turns', () => {
            tracker.addTurn('', 'No role');
            tracker.addTurn('user', '');
            tracker.addTurn(null, null);

            expect(tracker.getBufferCount()).toBe(0);
        });
    });

    describe('saveToCheckpoint', () => {
        test('saves turns to database', () => {
            tracker.addTurn('user', 'Question');
            tracker.addTurn('assistant', 'Answer');

            const saved = tracker.saveToCheckpoint('test-cp');

            expect(saved).toBe(2);
            expect(tracker.getBufferCount()).toBe(0); // Buffer cleared
        });

        test('returns 0 for empty buffer', () => {
            const saved = tracker.saveToCheckpoint('test-cp');
            expect(saved).toBe(0);
        });

        test('saves with correct turn numbers', () => {
            tracker.addTurn('user', 'First');
            tracker.addTurn('assistant', 'Second');
            tracker.addTurn('user', 'Third');

            tracker.saveToCheckpoint('test-cp');

            const turns = tracker.loadFromCheckpoint('test-cp');
            expect(turns[0].turnNumber).toBe(1);
            expect(turns[1].turnNumber).toBe(2);
            expect(turns[2].turnNumber).toBe(3);
        });
    });

    describe('loadFromCheckpoint', () => {
        test('loads saved conversation', () => {
            tracker.addTurn('user', 'Hello');
            tracker.addTurn('assistant', 'Hi there!');
            tracker.saveToCheckpoint('test-cp');

            const turns = tracker.loadFromCheckpoint('test-cp');

            expect(turns).toHaveLength(2);
            expect(turns[0].role).toBe('user');
            expect(turns[0].content).toBe('Hello');
            expect(turns[1].role).toBe('assistant');
            expect(turns[1].content).toBe('Hi there!');
        });

        test('returns empty array for non-existent checkpoint', () => {
            const turns = tracker.loadFromCheckpoint('nonexistent');
            expect(turns).toEqual([]);
        });

        test('parses tool calls correctly', () => {
            const toolCalls = [{ name: 'Read', arguments: { file: 'test.txt' } }];
            tracker.addTurn('assistant', 'Reading file...', toolCalls);
            tracker.saveToCheckpoint('test-cp');

            const turns = tracker.loadFromCheckpoint('test-cp');

            expect(turns[0].toolCalls).toEqual(toolCalls);
        });
    });

    describe('getConversationDelta', () => {
        test('returns turns after specified turn number', () => {
            tracker.addTurn('user', 'Turn 1');
            tracker.addTurn('assistant', 'Turn 2');
            tracker.addTurn('user', 'Turn 3');
            tracker.addTurn('assistant', 'Turn 4');
            tracker.saveToCheckpoint('test-cp');

            const delta = tracker.getConversationDelta('test-cp', 2);

            expect(delta).toHaveLength(2);
            expect(delta[0].content).toBe('Turn 3');
            expect(delta[1].content).toBe('Turn 4');
        });
    });

    describe('getTurnCount', () => {
        test('returns correct count', () => {
            tracker.addTurn('user', 'One');
            tracker.addTurn('assistant', 'Two');
            tracker.addTurn('user', 'Three');
            tracker.saveToCheckpoint('test-cp');

            const count = tracker.getTurnCount('test-cp');

            expect(count).toBe(3);
        });

        test('returns 0 for empty checkpoint', () => {
            const count = tracker.getTurnCount('empty-cp');
            expect(count).toBe(0);
        });
    });

    describe('getLatestTurnNumber', () => {
        test('returns max turn number', () => {
            tracker.addTurn('user', 'One');
            tracker.addTurn('assistant', 'Two');
            tracker.addTurn('user', 'Three');
            tracker.saveToCheckpoint('test-cp');

            const latest = tracker.getLatestTurnNumber('test-cp');

            expect(latest).toBe(3);
        });
    });

    describe('clear', () => {
        test('clears buffer', () => {
            tracker.addTurn('user', 'Hello');
            tracker.addTurn('assistant', 'Hi');

            tracker.clear();

            expect(tracker.getBufferCount()).toBe(0);
        });
    });

    describe('formatConversation', () => {
        test('formats conversation for display', () => {
            tracker.addTurn('user', 'Hello');
            tracker.addTurn('assistant', 'Hi there!');
            tracker.saveToCheckpoint('test-cp');

            const formatted = tracker.formatConversation('test-cp');

            expect(formatted).toContain('[USER]');
            expect(formatted).toContain('[ASSISTANT]');
            expect(formatted).toContain('Hello');
            expect(formatted).toContain('Hi there!');
        });

        test('truncates long content', () => {
            const longContent = 'A'.repeat(300);
            tracker.addTurn('user', longContent);
            tracker.saveToCheckpoint('test-cp');

            const formatted = tracker.formatConversation('test-cp');

            expect(formatted).toContain('...');
            expect(formatted.length).toBeLessThan(longContent.length + 50);
        });
    });
});
