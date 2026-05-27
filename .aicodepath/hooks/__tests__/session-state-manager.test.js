'use strict';

const Database = require('better-sqlite3');
const os   = require('os');
const path = require('path');
const fs   = require('fs');

// ---------------------------------------------------------------------------
// Test strategy: mock path-resolver so SessionStateManager uses an in-memory
// DB instead of the real project DB.
// ---------------------------------------------------------------------------

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-ssm-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Minimal DDL needed by SessionStateManager
const SESSION_STATE_DDL = `
CREATE TABLE IF NOT EXISTS session_state (
  key TEXT PRIMARY KEY,
  value JSON NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS session_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  phase TEXT,
  stage TEXT,
  unit TEXT,
  action TEXT,
  details JSON,
  timestamp TEXT DEFAULT (datetime('now'))
);
`;

function createManager() {
  jest.resetModules();

  const tmpDb = path.join(tmpDir, `test-${Date.now()}.db`);

  // Seed the schema into the temp DB so SessionStateManager finds its tables
  const seedDb = new Database(tmpDb);
  seedDb.exec(SESSION_STATE_DDL);
  seedDb.close();

  // Mock path-resolver to redirect DB to a fresh temp file
  jest.doMock('../../lib/path-resolver', () => ({
    findProjectRoot: () => tmpDir,
    getDbPath: () => tmpDb,
  }));

  const SessionStateManager = require('../../lib/session-state-manager');
  return new SessionStateManager(tmpDir);
}

// ---------------------------------------------------------------------------
// PREDEFINED_KEYS
// ---------------------------------------------------------------------------

describe('PREDEFINED_KEYS', () => {
  it('exposes expected workflow keys', () => {
    jest.resetModules();
    jest.doMock('../../lib/path-resolver', () => ({
      findProjectRoot: () => tmpDir,
      getDbPath: () => path.join(tmpDir, 'keys-test.db'),
    }));
    const { PREDEFINED_KEYS } = require('../../lib/session-state-manager');
    expect(PREDEFINED_KEYS.CURRENT_PHASE).toBe('current_phase');
    expect(PREDEFINED_KEYS.CURRENT_STAGE).toBe('current_stage');
    expect(PREDEFINED_KEYS.CURRENT_UNIT).toBe('current_unit');
    expect(typeof PREDEFINED_KEYS.WORKFLOW_STARTED).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// setState / getState
// ---------------------------------------------------------------------------

describe('setState() / getState()', () => {
  it('returns null for unknown key', () => {
    const mgr = createManager();
    expect(mgr.getState('does-not-exist')).toBeNull();
  });

  it('stores and retrieves a string value', () => {
    const mgr = createManager();
    mgr.setState('my-key', 'hello');
    expect(mgr.getState('my-key')).toBe('hello');
  });

  it('stores and retrieves a number', () => {
    const mgr = createManager();
    mgr.setState('num', 42);
    expect(mgr.getState('num')).toBe(42);
  });

  it('stores and retrieves an object', () => {
    const mgr = createManager();
    mgr.setState('obj', { phase: 'CONSTRUCTION', iteration: 3 });
    const val = mgr.getState('obj');
    expect(val).toEqual({ phase: 'CONSTRUCTION', iteration: 3 });
  });

  it('overwrites existing value on second set', () => {
    const mgr = createManager();
    mgr.setState('k', 'first');
    mgr.setState('k', 'second');
    expect(mgr.getState('k')).toBe('second');
  });

  it('returns success:true from setState', () => {
    const mgr = createManager();
    const result = mgr.setState('x', 'y');
    expect(result.success).toBe(true);
  });

  it('stores metadata separately from value', () => {
    const mgr = createManager();
    mgr.setState('annotated', 'my-value', { source: 'test' });
    expect(mgr.getState('annotated')).toBe('my-value');
  });
});

// ---------------------------------------------------------------------------
// getStateWithMetadata()
// ---------------------------------------------------------------------------

describe('getStateWithMetadata()', () => {
  it('returns null for missing key', () => {
    const mgr = createManager();
    expect(mgr.getStateWithMetadata('missing')).toBeNull();
  });

  it('returns value and metadata when set', () => {
    const mgr = createManager();
    mgr.setState('mkey', 'mval', { author: 'test' });
    const r = mgr.getStateWithMetadata('mkey');
    expect(r.value).toBe('mval');
    expect(r.metadata.author).toBe('test');
  });

  it('returns null metadata when not set', () => {
    const mgr = createManager();
    mgr.setState('plain', 'value');
    const r = mgr.getStateWithMetadata('plain');
    expect(r.value).toBe('value');
    expect(r.metadata).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getAllState()
// ---------------------------------------------------------------------------

describe('getAllState()', () => {
  it('returns an array', () => {
    const mgr = createManager();
    expect(Array.isArray(mgr.getAllState())).toBe(true);
  });

  it('includes newly stored entries', () => {
    const mgr = createManager();
    const before = mgr.getAllState().length;
    mgr.setState('unique-test-a', 1);
    mgr.setState('unique-test-b', 2);
    const all = mgr.getAllState();
    expect(all.length).toBe(before + 2);
    const keys = all.map(r => r.key);
    expect(keys).toContain('unique-test-a');
    expect(keys).toContain('unique-test-b');
  });
});

// ---------------------------------------------------------------------------
// deleteState()
// ---------------------------------------------------------------------------

describe('deleteState()', () => {
  it('removes a key', () => {
    const mgr = createManager();
    mgr.setState('del', 'val');
    mgr.deleteState('del');
    expect(mgr.getState('del')).toBeNull();
  });

  it('does not throw when deleting non-existent key', () => {
    const mgr = createManager();
    expect(() => mgr.deleteState('ghost')).not.toThrow();
  });
});
