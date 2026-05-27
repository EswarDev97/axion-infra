/**
 * Test: Swarm Bridge
 *
 * Tests the task sync bridge between AICodePath units (SQLite)
 * and Claude Code task files (JSON).
 *
 * Uses an in-memory SQLite database for isolation.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

// ============================================================================
// Setup: In-memory SQLite database
// ============================================================================

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.log(`${colors.yellow}Skipping swarm-bridge tests: better-sqlite3 not available${colors.reset}`);
  process.exit(0);
}

function createTestDb() {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      assigned_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS unit_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      depends_on_unit_id INTEGER NOT NULL,
      dependency_type TEXT DEFAULT 'blocks',
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_unit_id) REFERENCES units(id) ON DELETE CASCADE,
      UNIQUE(unit_id, depends_on_unit_id)
    );

    CREATE TABLE IF NOT EXISTS swarm_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL,
      pattern TEXT NOT NULL,
      phase TEXT,
      status TEXT DEFAULT 'forming',
      lead_agent TEXT,
      max_teammates INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now')),
      disbanded_at TEXT,
      metadata JSON DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS swarm_team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES swarm_teams(id) ON DELETE CASCADE,
      agent_name TEXT NOT NULL,
      teammate_name TEXT,
      role TEXT,
      status TEXT DEFAULT 'spawning',
      tasks_completed INTEGER DEFAULT 0,
      tasks_failed INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      left_at TEXT
    );

    CREATE TABLE IF NOT EXISTS swarm_task_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES swarm_teams(id) ON DELETE CASCADE,
      unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      task_id TEXT NOT NULL,
      assigned_member_id INTEGER REFERENCES swarm_team_members(id),
      status TEXT DEFAULT 'pending',
      synced_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function seedTestData(db) {
  const sessionId = 'test-session-001';

  db.prepare('INSERT INTO units (session_id, name, description, status, priority) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, 'Design API', 'Design REST API endpoints', 'pending', 10);
  db.prepare('INSERT INTO units (session_id, name, description, status, priority) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, 'Build Database', 'Create database schema', 'pending', 8);
  db.prepare('INSERT INTO units (session_id, name, description, status, priority) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, 'Implement Auth', 'Build authentication module', 'pending', 6);

  // Auth depends on API
  db.prepare('INSERT INTO unit_dependencies (unit_id, depends_on_unit_id) VALUES (?, ?)')
    .run(3, 1);

  db.prepare('INSERT INTO swarm_teams (team_name, session_id, pattern, phase, status) VALUES (?, ?, ?, ?, ?)')
    .run('test-team', sessionId, 'parallel', 'CONSTRUCTION', 'active');

  db.prepare('INSERT INTO swarm_team_members (team_id, agent_name, teammate_name, role, status) VALUES (?, ?, ?, ?, ?)')
    .run(1, 'aicodepath-backend-architect', 'Backend Architect', 'lead', 'active');

  return sessionId;
}

// ============================================================================
// Import module under test
// ============================================================================

const { SwarmBridge } = require('../lib/swarm-bridge');

// ============================================================================
// Tests
// ============================================================================

console.log('\n=== Swarm Bridge Tests ===\n');

// --- Status Mapping ---

test('maps unit statuses to task statuses correctly', () => {
  const db = createTestDb();
  const bridge = new SwarmBridge(db, 'test-team');

  assertEqual(bridge._mapUnitStatusToTaskStatus('pending'), 'todo');
  assertEqual(bridge._mapUnitStatusToTaskStatus('ready'), 'todo');
  assertEqual(bridge._mapUnitStatusToTaskStatus('in_progress'), 'in_progress');
  assertEqual(bridge._mapUnitStatusToTaskStatus('completed'), 'done');
  assertEqual(bridge._mapUnitStatusToTaskStatus('failed'), 'error');
  assertEqual(bridge._mapUnitStatusToTaskStatus('blocked'), 'blocked');
  assertEqual(bridge._mapUnitStatusToTaskStatus('unknown'), 'todo');

  db.close();
});

test('maps task statuses to unit statuses correctly', () => {
  const db = createTestDb();
  const bridge = new SwarmBridge(db, 'test-team');

  assertEqual(bridge._mapTaskStatusToUnitStatus('todo'), 'pending');
  assertEqual(bridge._mapTaskStatusToUnitStatus('in_progress'), 'in_progress');
  assertEqual(bridge._mapTaskStatusToUnitStatus('done'), 'completed');
  assertEqual(bridge._mapTaskStatusToUnitStatus('error'), 'failed');
  assertEqual(bridge._mapTaskStatusToUnitStatus('blocked'), 'blocked');
  assertEqual(bridge._mapTaskStatusToUnitStatus('unknown'), 'pending');

  db.close();
});

// --- Team Lookup ---

test('_getTeam returns active team', () => {
  const db = createTestDb();
  seedTestData(db);
  const bridge = new SwarmBridge(db, 'test-team');

  const team = bridge._getTeam();
  assertTrue(team !== undefined && team !== null, 'Should find team');
  assertEqual(team.team_name, 'test-team');
  assertEqual(team.status, 'active');

  db.close();
});

test('_getTeam returns null for disbanded team', () => {
  const db = createTestDb();
  seedTestData(db);
  db.prepare("UPDATE swarm_teams SET status = 'disbanded' WHERE team_name = 'test-team'").run();
  const bridge = new SwarmBridge(db, 'test-team');

  const team = bridge._getTeam();
  assertTrue(team === undefined || team === null, 'Should not find disbanded team');

  db.close();
});

test('_getTeam returns null for nonexistent team', () => {
  const db = createTestDb();
  const bridge = new SwarmBridge(db, 'nonexistent-team');

  const team = bridge._getTeam();
  assertTrue(team === undefined || team === null, 'Should not find nonexistent team');

  db.close();
});

// --- syncUnitsToTasks ---

test('syncUnitsToTasks creates task files and mappings', async () => {
  const db = createTestDb();
  const sessionId = seedTestData(db);
  const bridge = new SwarmBridge(db, 'test-team');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
  bridge.taskDir = tmpDir;

  const result = await bridge.syncUnitsToTasks(sessionId);

  assertEqual(result.synced, 3, 'Should sync 3 units');
  assertEqual(result.errors, 0, 'Should have no errors');

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
  assertEqual(files.length, 3, 'Should create 3 task files');

  const mappings = db.prepare('SELECT * FROM swarm_task_mapping WHERE team_id = 1').all();
  assertEqual(mappings.length, 3, 'Should create 3 task mappings');

  const firstFile = JSON.parse(fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8'));
  assertTrue(firstFile.id !== undefined, 'Task should have id');
  assertTrue(firstFile.title !== undefined, 'Task should have title');
  assertTrue(firstFile.metadata.source === 'aicodepath', 'Task metadata should indicate source');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  db.close();
});

test('syncUnitsToTasks returns zeros when no units exist', async () => {
  const db = createTestDb();
  db.prepare("INSERT INTO swarm_teams (team_name, session_id, pattern, status) VALUES (?, ?, ?, ?)")
    .run('empty-team', 'empty-session', 'parallel', 'active');
  const bridge = new SwarmBridge(db, 'empty-team');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
  bridge.taskDir = tmpDir;

  const result = await bridge.syncUnitsToTasks('empty-session');
  assertEqual(result.synced, 0);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  db.close();
});

test('syncUnitsToTasks returns zeros when no team found', async () => {
  const db = createTestDb();
  const bridge = new SwarmBridge(db, 'no-such-team');

  const result = await bridge.syncUnitsToTasks('any-session');
  assertEqual(result.synced, 0);

  db.close();
});

test('syncUnitsToTasks translates dependencies to blockedBy', async () => {
  const db = createTestDb();
  const sessionId = seedTestData(db);
  const bridge = new SwarmBridge(db, 'test-team');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
  bridge.taskDir = tmpDir;

  await bridge.syncUnitsToTasks(sessionId);

  const mappings = db.prepare('SELECT * FROM swarm_task_mapping WHERE team_id = 1').all();
  const authMapping = mappings.find(m => m.unit_id === 3);
  const apiMapping = mappings.find(m => m.unit_id === 1);

  assertTrue(authMapping !== undefined, 'Should have auth task mapping');
  assertTrue(apiMapping !== undefined, 'Should have api task mapping');

  const authTask = JSON.parse(fs.readFileSync(path.join(tmpDir, `${authMapping.task_id}.json`), 'utf-8'));
  assertTrue(Array.isArray(authTask.blockedBy), 'Auth task should have blockedBy array');
  assertTrue(authTask.blockedBy.includes(apiMapping.task_id), 'Auth should be blocked by API task');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  db.close();
});

// --- syncTasksToUnits ---

test('syncTasksToUnits updates unit status from task files', async () => {
  const db = createTestDb();
  const sessionId = seedTestData(db);
  const bridge = new SwarmBridge(db, 'test-team');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
  bridge.taskDir = tmpDir;

  await bridge.syncUnitsToTasks(sessionId);

  // Simulate teammate completing a task
  const mappings = db.prepare('SELECT * FROM swarm_task_mapping WHERE team_id = 1').all();
  const firstMapping = mappings[0];
  const taskFilePath = path.join(tmpDir, `${firstMapping.task_id}.json`);
  const taskData = JSON.parse(fs.readFileSync(taskFilePath, 'utf-8'));
  taskData.status = 'done';
  fs.writeFileSync(taskFilePath, JSON.stringify(taskData));

  const result = await bridge.syncTasksToUnits(sessionId);
  assertTrue(result.updated >= 1, 'Should update at least 1 unit');

  const unit = db.prepare('SELECT status FROM units WHERE id = ?').get(firstMapping.unit_id);
  assertEqual(unit.status, 'completed');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  db.close();
});

test('syncTasksToUnits skips units with no status change', async () => {
  const db = createTestDb();
  const sessionId = seedTestData(db);
  const bridge = new SwarmBridge(db, 'test-team');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
  bridge.taskDir = tmpDir;

  await bridge.syncUnitsToTasks(sessionId);

  const result = await bridge.syncTasksToUnits(sessionId);
  assertEqual(result.updated, 0, 'Should not update any units when no changes');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  db.close();
});

// --- Sync Loop ---

test('startSyncLoop and stopSyncLoop work correctly', () => {
  const db = createTestDb();
  const bridge = new SwarmBridge(db, 'test-team');

  bridge.startSyncLoop(100000, 'test-session');
  assertTrue(bridge.syncTimer !== null, 'Sync timer should be set');

  bridge.stopSyncLoop();
  assertTrue(bridge.syncTimer === null, 'Sync timer should be cleared');

  db.close();
});

test('startSyncLoop does not create duplicate timers', () => {
  const db = createTestDb();
  const bridge = new SwarmBridge(db, 'test-team');

  bridge.startSyncLoop(100000, 'test-session');
  const firstTimer = bridge.syncTimer;

  bridge.startSyncLoop(100000, 'test-session');
  assertEqual(bridge.syncTimer, firstTimer, 'Should not replace existing timer');

  bridge.stopSyncLoop();
  db.close();
});

// --- Idempotent sync ---

test('syncUnitsToTasks is idempotent (re-running updates, not duplicates)', async () => {
  const db = createTestDb();
  const sessionId = seedTestData(db);
  const bridge = new SwarmBridge(db, 'test-team');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
  bridge.taskDir = tmpDir;

  await bridge.syncUnitsToTasks(sessionId);
  const mappingsAfterFirst = db.prepare('SELECT * FROM swarm_task_mapping WHERE team_id = 1').all();

  await bridge.syncUnitsToTasks(sessionId);
  const mappingsAfterSecond = db.prepare('SELECT * FROM swarm_task_mapping WHERE team_id = 1').all();

  assertEqual(mappingsAfterFirst.length, mappingsAfterSecond.length, 'Should not create duplicate mappings');

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
  assertEqual(files.length, 3, 'Should still have 3 task files');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  db.close();
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
process.exit(failed > 0 ? 1 : 0);
