'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
  detectPhaseStart,
  extractPlanKeywords,
  SessionStateManager,
  resolveRole,
  planRoleActivatorHookImpl,
} = require('../plan-role-activator');

// ---------------------------------------------------------------------------
// detectPhaseStart — synchronous, no try-catch needed
// ---------------------------------------------------------------------------

describe('detectPhaseStart', () => {
  it('returns true for "start task P2-1"', () => {
    expect(detectPhaseStart('start task P2-1')).toBe(true);
  });

  it("returns true for \"let's implement the evaluator\"", () => {
    expect(detectPhaseStart("let's implement the evaluator")).toBe(true);
  });

  it('returns true for "begin requirements for the API"', () => {
    expect(detectPhaseStart('begin requirements for the API')).toBe(true);
  });

  it('returns true for "write plan for vehicle evaluator"', () => {
    expect(detectPhaseStart('write plan for vehicle evaluator')).toBe(true);
  });

  it('returns true for "design the database schema"', () => {
    expect(detectPhaseStart('design the database schema')).toBe(true);
  });

  it('returns true for "brainstorm the worker queue"', () => {
    expect(detectPhaseStart('brainstorm the worker queue')).toBe(true);
  });

  it('returns true when message references a task ID like D-1', () => {
    expect(detectPhaseStart('can we work on D-1 now')).toBe(true);
  });

  it('returns true when message references a task ID like B-3', () => {
    expect(detectPhaseStart('move on to B-3')).toBe(true);
  });

  it('returns false for a general question', () => {
    expect(detectPhaseStart('what time is it')).toBe(false);
  });

  it('returns false for a code review request', () => {
    expect(detectPhaseStart('show me the code')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(detectPhaseStart('')).toBe(false);
  });

  it('returns false for a status check', () => {
    expect(detectPhaseStart('what is the current status')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractPlanKeywords — async, wrapped in try-catch
// ---------------------------------------------------------------------------

describe('extractPlanKeywords', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-role-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns keywords from the first incomplete task description', async () => {
    try {
      const planContent = `# Implementation Plan
## Tasks
### Task 1: Migrate vehicle repository to Kysely ✅
Done.
### Task 2: Build RabbitMQ fan-out for async API processing
**Why**: Sends evaluation requests to backend workers via message queue.
`;
      fs.writeFileSync(path.join(tmpDir, '2026-03-04-test-plan.md'), planContent);
      const keywords = await extractPlanKeywords(tmpDir);
      expect(keywords).toContain('rabbitmq');
      expect(keywords).toContain('api');
      expect(keywords).toContain('backend');
    } catch (err) {
      throw err;
    }
  });

  it('returns [] when plans dir is missing', async () => {
    try {
      const keywords = await extractPlanKeywords('/nonexistent/path/plans');
      expect(keywords).toEqual([]);
    } catch (err) {
      throw err;
    }
  });

  it('returns [] when plans dir is empty', async () => {
    try {
      const keywords = await extractPlanKeywords(tmpDir);
      expect(keywords).toEqual([]);
    } catch (err) {
      throw err;
    }
  });

  it('returns [] when all tasks in plan are completed', async () => {
    try {
      const planContent = `# Plan
### Task 1: Do something ✅
Done.
### Task 2: Do another thing ✅
Also done.
`;
      fs.writeFileSync(path.join(tmpDir, '2026-03-04-complete-plan.md'), planContent);
      const keywords = await extractPlanKeywords(tmpDir);
      expect(keywords).toEqual([]);
    } catch (err) {
      throw err;
    }
  });
});

// ---------------------------------------------------------------------------
// SessionStateManager — async, wrapped in try-catch
// ---------------------------------------------------------------------------

describe('SessionStateManager', () => {
  let tmpDir;
  let manager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-state-test-'));
    manager = new SessionStateManager(path.join(tmpDir, 'session-roles.json'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('isRoleLoaded returns false for empty state', async () => {
    try {
      const state = await manager.load();
      expect(manager.isRoleLoaded('backend-architect', state)).toBe(false);
    } catch (err) {
      throw err;
    }
  });

  it('isRoleLoaded returns true after saving a role', async () => {
    try {
      await manager.save({ activeRoles: ['backend-architect'], loadedAt: {}, lastTaskKeywords: [] });
      const state = await manager.load();
      expect(manager.isRoleLoaded('backend-architect', state)).toBe(true);
    } catch (err) {
      throw err;
    }
  });

  it('isRoleLoaded returns false for a different role', async () => {
    try {
      await manager.save({ activeRoles: ['backend-architect'], loadedAt: {}, lastTaskKeywords: [] });
      const state = await manager.load();
      expect(manager.isRoleLoaded('test-engineer', state)).toBe(false);
    } catch (err) {
      throw err;
    }
  });

  it('load returns empty state when file is missing', async () => {
    try {
      const state = await manager.load();
      expect(state.activeRoles).toEqual([]);
    } catch (err) {
      throw err;
    }
  });

  it('load resets to empty state when file contains corrupt JSON', async () => {
    try {
      fs.writeFileSync(path.join(tmpDir, 'session-roles.json'), '{ not valid json }}');
      const state = await manager.load();
      expect(state.activeRoles).toEqual([]);
    } catch (err) {
      throw err;
    }
  });

  it('isSameTask returns false for empty state', () => {
    const state = { lastTaskKeywords: [] };
    expect(manager.isSameTask(['api', 'backend'], state)).toBe(false);
  });

  it('isSameTask returns true when keywords match saved task', () => {
    const state = { lastTaskKeywords: ['api', 'backend', 'database'] };
    expect(manager.isSameTask(['database', 'api', 'backend'], state)).toBe(true);
  });

  it('isSameTask returns false when keywords differ from saved task', () => {
    const state = { lastTaskKeywords: ['api', 'backend'] };
    expect(manager.isSameTask(['test', 'coverage', 'mock'], state)).toBe(false);
  });

  it('isSameTask returns false when saved task has no keywords', () => {
    const state = { lastTaskKeywords: [] };
    expect(manager.isSameTask(['api', 'backend'], state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveRole — async, wrapped in try-catch
// ---------------------------------------------------------------------------

describe('resolveRole', () => {
  it('returns a role name and content for backend-leaning keywords', async () => {
    try {
      const result = await resolveRole(['api', 'repository', 'database', 'backend']);
      expect(result).not.toBeNull();
      expect(typeof result.name).toBe('string');
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
    } catch (err) {
      throw err;
    }
  });

  it('returns a role for test-oriented keywords', async () => {
    try {
      const result = await resolveRole(['test', 'coverage', 'mock', 'assertion']);
      expect(result).not.toBeNull();
      expect(result.name).toMatch(/test|qa/i);
    } catch (err) {
      throw err;
    }
  });

  it('returns null for empty keyword array', async () => {
    try {
      const result = await resolveRole([]);
      expect(result).toBeNull();
    } catch (err) {
      throw err;
    }
  });

  it('returns null for keywords that match no role', async () => {
    try {
      const result = await resolveRole(['zzz', 'xyz', 'qqq']);
      expect(result).toBeNull();
    } catch (err) {
      throw err;
    }
  });
});

// ---------------------------------------------------------------------------
// planRoleActivatorHookImpl — integration, async, try-catch
// ---------------------------------------------------------------------------

describe('planRoleActivatorHookImpl', () => {
  let tmpDir;
  let stateFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-integration-test-'));
    stateFile = path.join(tmpDir, 'session-roles.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns {} when prompt has no phase-start signal', async () => {
    try {
      const result = await planRoleActivatorHookImpl(
        { prompt: 'what is the current status' },
        { plansDir: tmpDir, stateFilePath: stateFile }
      );
      expect(result).toEqual({});
    } catch (err) {
      throw err;
    }
  });

  it('returns {} when task keywords are unchanged (same task)', async () => {
    try {
      const planContent = `# Plan
### Task 1: Build backend API for evaluation
**Why**: Needs backend API and database repository layer.
`;
      fs.writeFileSync(path.join(tmpDir, '2026-03-04-plan.md'), planContent);
      // Pre-save state with the same task keywords the plan will produce
      const priorKeywords = await extractPlanKeywords(tmpDir);
      fs.writeFileSync(stateFile, JSON.stringify({
        activeRoles: ['backend-architect'],
        loadedAt: {},
        lastTaskKeywords: priorKeywords,
      }));

      const result = await planRoleActivatorHookImpl(
        { prompt: 'start task P2-1' },
        { plansDir: tmpDir, stateFilePath: stateFile }
      );
      // Same task → no re-injection
      expect(result).toEqual({});
    } catch (err) {
      throw err;
    }
  });

  it('injects role again when task keywords change (new task)', async () => {
    try {
      const planContent = `# Plan
### Task 1: Write Jest tests with mocks and coverage assertions
**Why**: Test coverage for the evaluator feature.
`;
      fs.writeFileSync(path.join(tmpDir, '2026-03-04-plan.md'), planContent);
      // State from a previous backend task
      fs.writeFileSync(stateFile, JSON.stringify({
        activeRoles: ['backend-architect'],
        loadedAt: {},
        lastTaskKeywords: ['api', 'database', 'repository'],
      }));

      const result = await planRoleActivatorHookImpl(
        { prompt: 'start task P2-2' },
        { plansDir: tmpDir, stateFilePath: stateFile }
      );
      // New task (test keywords) → inject new role
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
    } catch (err) {
      throw err;
    }
  });

  it('returns additionalContext when a new role is needed', async () => {
    try {
      const planContent = `# Plan
### Task 1: Build backend API with database repository and message queue
**Why**: Needs backend API, database, and async processing.
`;
      fs.writeFileSync(path.join(tmpDir, '2026-03-04-plan.md'), planContent);

      const result = await planRoleActivatorHookImpl(
        { prompt: 'start task P2-1' },
        { plansDir: tmpDir, stateFilePath: stateFile }
      );

      expect(result).toBeDefined();
      if (result.hookSpecificOutput) {
        expect(typeof result.hookSpecificOutput.additionalContext).toBe('string');
        expect(result.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
      }
    } catch (err) {
      throw err;
    }
  });

  it('returns {} when plans dir is missing (fail-safe)', async () => {
    try {
      const result = await planRoleActivatorHookImpl(
        { prompt: 'start task P2-1' },
        { plansDir: '/nonexistent/plans', stateFilePath: stateFile }
      );
      expect(result).toEqual({});
    } catch (err) {
      throw err;
    }
  });
});
