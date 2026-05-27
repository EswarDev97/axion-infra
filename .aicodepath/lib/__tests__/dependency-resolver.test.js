/**
 * Tests for Dependency Resolver
 *
 * Tests cycle detection, topological sorting, ready unit identification,
 * and dependency notification.
 *
 * Run with: npm test -- dependency-resolver.test.js
 */

const Database = require('better-sqlite3');
const { DependencyResolver } = require('../dependency-resolver');

describe('DependencyResolver', () => {
    let db;
    let resolver;

    beforeEach(() => {
        db = new Database(':memory:');

        // Create tables
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
    `);

        resolver = new DependencyResolver(db);
    });

    afterEach(() => {
        db.close();
    });

    // =========================================================================
    // Cycle Detection Tests
    // =========================================================================

    describe('detectCycles', () => {
        test('detects simple two-node cycle', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (1, 2, 'blocks');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (2, 1, 'blocks');
      `);

            const cycles = resolver.detectCycles('s1');
            expect(cycles.length).toBeGreaterThan(0);
        });

        test('detects three-node cycle', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (3, 's1', 'C', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (1, 2, 'blocks');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (2, 3, 'blocks');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (3, 1, 'blocks');
      `);

            const cycles = resolver.detectCycles('s1');
            expect(cycles.length).toBeGreaterThan(0);
        });

        test('returns empty array for acyclic graph', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (3, 's1', 'C', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (2, 1, 'blocks');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (3, 2, 'blocks');
      `);

            const cycles = resolver.detectCycles('s1');
            expect(cycles).toEqual([]);
        });

        test('returns empty array for no dependencies', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
      `);

            const cycles = resolver.detectCycles('s1');
            expect(cycles).toEqual([]);
        });
    });

    // =========================================================================
    // Execution Order Tests
    // =========================================================================

    describe('getExecutionOrder', () => {
        test('returns correct topological order for linear chain', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (3, 's1', 'C', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (2, 1, 'blocks');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (3, 2, 'blocks');
      `);

            const order = resolver.getExecutionOrder('s1');
            expect(order.map(u => u.name)).toEqual(['A', 'B', 'C']);
        });

        test('respects priority within tiers', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status, priority) VALUES (1, 's1', 'Low', 'pending', 1);
        INSERT INTO units (id, session_id, name, status, priority) VALUES (2, 's1', 'High', 'pending', 10);
        INSERT INTO units (id, session_id, name, status, priority) VALUES (3, 's1', 'Medium', 'pending', 5);
      `);

            const order = resolver.getExecutionOrder('s1');
            // All have same dependencies (none), so sorted by priority
            expect(order[0].name).toBe('High');
            expect(order[1].name).toBe('Medium');
            expect(order[2].name).toBe('Low');
        });

        test('handles diamond dependency pattern', () => {
            // A -> B, A -> C, B -> D, C -> D
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (3, 's1', 'C', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (4, 's1', 'D', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (2, 1);
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (3, 1);
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (4, 2);
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (4, 3);
      `);

            const order = resolver.getExecutionOrder('s1');
            const names = order.map(u => u.name);

            // A must be first
            expect(names[0]).toBe('A');
            // D must be last
            expect(names[3]).toBe('D');
            // B and C must be in the middle (order doesn't matter)
            expect(names.slice(1, 3).sort()).toEqual(['B', 'C']);
        });

        test('throws error on cycle', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (1, 2);
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (2, 1);
      `);

            expect(() => resolver.getExecutionOrder('s1')).toThrow('Circular dependency');
        });
    });

    // =========================================================================
    // Ready Units Tests
    // =========================================================================

    describe('getReadyUnits', () => {
        test('returns units with no dependencies as ready', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
      `);

            const ready = resolver.getReadyUnits('s1');
            expect(ready.length).toBe(2);
            expect(ready.map(u => u.name).sort()).toEqual(['A', 'B']);
        });

        test('returns units with all dependencies completed', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'completed');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (2, 1);
      `);

            const ready = resolver.getReadyUnits('s1');
            expect(ready.length).toBe(1);
            expect(ready[0].name).toBe('B');
        });

        test('excludes units with pending dependencies', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (2, 1);
      `);

            const ready = resolver.getReadyUnits('s1');
            expect(ready.length).toBe(1);
            expect(ready[0].name).toBe('A');
        });

        test('marks units blocked when hard dependency fails', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'failed');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (2, 1, 'blocks');
      `);

            const ready = resolver.getReadyUnits('s1');
            expect(ready.length).toBe(0);

            // Check B is now blocked
            const unit = db.prepare('SELECT status FROM units WHERE id = 2').get();
            expect(unit.status).toBe('blocked');
        });

        test('soft dependencies do not block on failure', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'failed');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (2, 1, 'soft');
      `);

            // Soft dependency failed but doesn't block
            // B is still pending because dependency not 'completed'
            const ready = resolver.getReadyUnits('s1');
            // B doesn't become ready because A is not completed, but also not blocked
            expect(ready.length).toBe(0);

            // However, B should NOT be blocked
            const unit = db.prepare('SELECT status FROM units WHERE id = 2').get();
            expect(unit.status).not.toBe('blocked');
        });

        test('sorts by priority descending', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status, priority) VALUES (1, 's1', 'Low', 'pending', 1);
        INSERT INTO units (id, session_id, name, status, priority) VALUES (2, 's1', 'High', 'pending', 10);
        INSERT INTO units (id, session_id, name, status, priority) VALUES (3, 's1', 'Medium', 'pending', 5);
      `);

            const ready = resolver.getReadyUnits('s1');
            expect(ready[0].name).toBe('High');
            expect(ready[1].name).toBe('Medium');
            expect(ready[2].name).toBe('Low');
        });
    });

    // =========================================================================
    // Notification Tests
    // =========================================================================

    describe('notifyCompletion', () => {
        test('marks dependent units ready when all deps complete', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'completed');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (2, 1);
      `);

            const nowReady = resolver.notifyCompletion(1);
            expect(nowReady).toContain(2);

            const unit = db.prepare('SELECT status FROM units WHERE id = 2').get();
            expect(unit.status).toBe('ready');
        });

        test('does not mark ready if other deps pending', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'completed');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (3, 's1', 'C', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (3, 1);
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (3, 2);
      `);

            const nowReady = resolver.notifyCompletion(1);
            expect(nowReady).not.toContain(3);

            const unit = db.prepare('SELECT status FROM units WHERE id = 3').get();
            expect(unit.status).toBe('pending');
        });
    });

    describe('notifyFailure', () => {
        test('blocks downstream units with hard dependency', () => {
            db.exec(`
        INSERT INTO units (id, session_id, name, status) VALUES (1, 's1', 'A', 'failed');
        INSERT INTO units (id, session_id, name, status) VALUES (2, 's1', 'B', 'pending');
        INSERT INTO units (id, session_id, name, status) VALUES (3, 's1', 'C', 'pending');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (2, 1, 'blocks');
        INSERT INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type) VALUES (3, 2, 'blocks');
      `);

            const blocked = resolver.notifyFailure(1);

            // B should be blocked
            expect(blocked).toContain(2);
            const unitB = db.prepare('SELECT status FROM units WHERE id = 2').get();
            expect(unitB.status).toBe('blocked');

            // C should also be blocked (cascading)
            expect(blocked).toContain(3);
            const unitC = db.prepare('SELECT status FROM units WHERE id = 3').get();
            expect(unitC.status).toBe('blocked');
        });
    });
});
