/**
 * Tests for Unit Orchestrator
 *
 * Tests initialization, concurrency control, unit lifecycle,
 * and control operations.
 *
 * Run with: npm test -- unit-orchestrator.test.js
 */

const Database = require('better-sqlite3');
const { UnitOrchestrator, getAgentName } = require('../unit-orchestrator');

// Mock the websocket-server module
jest.mock('../websocket-server', () => ({
    getWebSocketServer: () => null,
}));

// Mock child_process to avoid actually spawning processes
jest.mock('child_process', () => ({
    spawn: jest.fn(() => {
        const EventEmitter = require('events');
        const process = new EventEmitter();
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();
        process.kill = jest.fn();
        // Simulate quick completion
        setTimeout(() => {
            process.emit('exit', 0, null);
        }, 100);
        return process;
    }),
}));

describe('UnitOrchestrator', () => {
    let db;
    let orchestrator;

    beforeEach(() => {
        db = new Database(':memory:');

        // Create required tables
        db.exec(`
      CREATE TABLE units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        estimated_effort INTEGER,
        actual_effort INTEGER,
        assigned_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT
      );

      CREATE TABLE unit_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id INTEGER NOT NULL,
        depends_on_unit_id INTEGER NOT NULL,
        dependency_type TEXT DEFAULT 'blocks',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(unit_id, depends_on_unit_id)
      );

      CREATE TABLE orchestration_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        status TEXT DEFAULT 'initializing',
        max_concurrency INTEGER DEFAULT 3,
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        total_units INTEGER DEFAULT 0,
        completed_units INTEGER DEFAULT 0,
        failed_units INTEGER DEFAULT 0
      );

      CREATE TABLE unit_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id INTEGER NOT NULL,
        orchestration_run_id INTEGER NOT NULL,
        agent_index INTEGER,
        agent_name TEXT,
        status TEXT DEFAULT 'running',
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        exit_code INTEGER,
        error_message TEXT
      );
    `);

        orchestrator = new UnitOrchestrator(db, {
            maxConcurrency: 2,
            retryFailedUnits: false,
            unitTimeout: 5000,
        });
    });

    afterEach(() => {
        db.close();
        jest.clearAllMocks();
    });

    // =========================================================================
    // Agent Name Generator
    // =========================================================================

    describe('getAgentName', () => {
        test('returns correct names for indices 0-4', () => {
            expect(getAgentName(0)).toBe('Coder');
            expect(getAgentName(1)).toBe('Builder');
            expect(getAgentName(2)).toBe('Architect');
            expect(getAgentName(3)).toBe('Developer');
            expect(getAgentName(4)).toBe('Engineer');
        });

        test('wraps with suffix for indices >= 5', () => {
            expect(getAgentName(5)).toBe('Coder 2');
            expect(getAgentName(10)).toBe('Coder 3');
        });
    });

    // =========================================================================
    // Initialization Tests
    // =========================================================================

    describe('initialize', () => {
        test('creates orchestration run record', async () => {
            db.exec(`INSERT INTO units (session_id, name) VALUES ('test-session', 'Unit A')`);

            const runId = await orchestrator.initialize('test-session');

            expect(runId).toBeGreaterThan(0);
            expect(orchestrator.state).toBe('initializing');

            const run = db.prepare('SELECT * FROM orchestration_runs WHERE id = ?').get(runId);
            expect(run).toBeDefined();
            expect(run.session_id).toBe('test-session');
            expect(run.total_units).toBe(1);
        });

        test('marks units without dependencies as ready', async () => {
            db.exec(`
        INSERT INTO units (session_id, name, status) VALUES ('test-session', 'A', 'pending');
        INSERT INTO units (session_id, name, status) VALUES ('test-session', 'B', 'pending');
      `);

            await orchestrator.initialize('test-session');

            const units = db.prepare('SELECT * FROM units WHERE status = ?').all('ready');
            expect(units.length).toBe(2);
        });

        test('throws on cycle detection', async () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 'test-session', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 'test-session', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (1, 2);
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (2, 1);
      `);

            await expect(orchestrator.initialize('test-session')).rejects.toThrow('cycles detected');
        });
    });

    // =========================================================================
    // Control Operations
    // =========================================================================

    describe('start', () => {
        test('transitions to running state', async () => {
            db.exec(`INSERT INTO units (session_id, name) VALUES ('test-session', 'A')`);
            await orchestrator.initialize('test-session');

            await orchestrator.start();

            expect(orchestrator.state).toBe('running');

            const run = db.prepare('SELECT status FROM orchestration_runs WHERE id = ?').get(orchestrator.runId);
            expect(run.status).toBe('running');
        });

        test('throws if not initialized', async () => {
            await expect(orchestrator.start()).rejects.toThrow('Cannot start from state');
        });
    });

    describe('pause', () => {
        test('transitions to paused state', async () => {
            db.exec(`INSERT INTO units (session_id, name) VALUES ('test-session', 'A')`);
            await orchestrator.initialize('test-session');
            await orchestrator.start();

            orchestrator.pause();

            expect(orchestrator.state).toBe('paused');
        });
    });

    describe('resume', () => {
        test('transitions back to running from paused', async () => {
            db.exec(`INSERT INTO units (session_id, name) VALUES ('test-session', 'A')`);
            await orchestrator.initialize('test-session');
            await orchestrator.start();
            orchestrator.pause();

            orchestrator.resume();

            expect(orchestrator.state).toBe('running');
        });

        test('does nothing if not paused', async () => {
            db.exec(`INSERT INTO units (session_id, name) VALUES ('test-session', 'A')`);
            await orchestrator.initialize('test-session');
            await orchestrator.start();

            orchestrator.resume(); // Should be no-op

            expect(orchestrator.state).toBe('running');
        });
    });

    describe('stop', () => {
        test('transitions to failed state', async () => {
            db.exec(`INSERT INTO units (session_id, name) VALUES ('test-session', 'A')`);
            await orchestrator.initialize('test-session');
            await orchestrator.start();

            await orchestrator.stop();

            expect(orchestrator.state).toBe('failed');
        });
    });

    // =========================================================================
    // Statistics
    // =========================================================================

    describe('getStats', () => {
        test('returns correct statistics', async () => {
            db.exec(`
        INSERT INTO units (session_id, name, status) VALUES ('test-session', 'A', 'completed');
        INSERT INTO units (session_id, name, status) VALUES ('test-session', 'B', 'in_progress');
        INSERT INTO units (session_id, name, status) VALUES ('test-session', 'C', 'pending');
      `);

            await orchestrator.initialize('test-session');
            const stats = orchestrator.getStats();

            expect(stats.totalUnits).toBe(3);
            expect(stats.completedUnits).toBe(1);
            expect(stats.inProgressUnits).toBe(1);
            // Note: C becomes 'ready' after initialization because no deps
            expect(stats.state).toBe('initializing');
            expect(stats.maxConcurrency).toBe(2);
        });
    });

    // =========================================================================
    // Concurrency Control
    // =========================================================================

    describe('concurrency control', () => {
        test('respects max concurrency limit', async () => {
            // Create 5 units (more than concurrency limit of 2)
            for (let i = 1; i <= 5; i++) {
                db.exec(`INSERT INTO units (session_id, name) VALUES ('test-session', 'Unit ${i}')`);
            }

            await orchestrator.initialize('test-session');
            await orchestrator.start();

            // At most 2 should be in_progress at a time
            const stats = orchestrator.getStats();
            expect(stats.activeSessionCount).toBeLessThanOrEqual(2);
        });
    });
});
