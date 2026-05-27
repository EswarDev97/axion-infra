'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const {
  checkSkipConditions,
  checkCustomStopConditions,
  loadConfig,
  formatIterationSummary,
  formatIterationStatus,
  formatProgressBar,
  createLogEntry,
} = require('../gicl-iteration-hook');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'acp-gicl-test-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeSession(overrides = {}) {
  return { maxIterations: 5, previousScores: [], ...overrides };
}

function makeScore(overrides = {}) {
  return { final: 75, tests: 80, guidelines: 90, architecture: 85, duplication: 70, authenticity: 95, ...overrides };
}

// ---------------------------------------------------------------------------
// formatProgressBar()
// ---------------------------------------------------------------------------

describe('formatProgressBar()', () => {
  it('returns string starting with [', () => {
    expect(formatProgressBar(50)).toMatch(/^\[/);
  });

  it('shows 0% as all empty', () => {
    const bar = formatProgressBar(0, 10);
    expect(bar).toContain('░░░░░░░░░░');
    expect(bar).toContain('0%');
  });

  it('shows 100% as all filled', () => {
    const bar = formatProgressBar(100, 10);
    expect(bar).toContain('██████████');
    expect(bar).toContain('100%');
  });

  it('shows 50% as half filled', () => {
    const bar = formatProgressBar(50, 10);
    expect(bar).toContain('█████░░░░░');
    expect(bar).toContain('50%');
  });

  it('uses default width of 20', () => {
    const bar = formatProgressBar(0);
    const inner = bar.match(/\[([^\]]+)\]/)[1];
    expect(inner).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// createLogEntry()
// ---------------------------------------------------------------------------

describe('createLogEntry()', () => {
  it('returns object with phase, iteration, timestamp', () => {
    const entry = createLogEntry('start', 1);
    expect(entry.phase).toBe('start');
    expect(entry.iteration).toBe(1);
    expect(typeof entry.timestamp).toBe('string');
  });

  it('timestamp is valid ISO string', () => {
    const entry = createLogEntry('end', 3);
    expect(() => new Date(entry.timestamp)).not.toThrow();
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('spreads extra data into entry', () => {
    const entry = createLogEntry('end', 2, { score: 92, unit: 'T5' });
    expect(entry.score).toBe(92);
    expect(entry.unit).toBe('T5');
  });

  it('empty data object is fine', () => {
    const entry = createLogEntry('start', 0, {});
    expect(entry.phase).toBe('start');
  });
});

// ---------------------------------------------------------------------------
// checkSkipConditions()
// ---------------------------------------------------------------------------

describe('checkSkipConditions()', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('returns null when no skip conditions met', async () => {
    const result = await checkSkipConditions(makeSession(), 1, tmpDir);
    expect(result).toBeNull();
  });

  it('returns reason when iteration exceeds maxIterations', async () => {
    const result = await checkSkipConditions(makeSession({ maxIterations: 3 }), 4, tmpDir);
    expect(result).toMatch(/[Mm]aximum/);
  });

  it('returns reason when .gicl-skip file exists', async () => {
    fs.writeFileSync(path.join(tmpDir, '.gicl-skip'), '', 'utf8');
    const result = await checkSkipConditions(makeSession(), 1, tmpDir);
    expect(result).toMatch(/[Ss]kip/);
  });

  it('returns reason when .gicl-pause file exists', async () => {
    fs.writeFileSync(path.join(tmpDir, '.gicl-pause'), '', 'utf8');
    const result = await checkSkipConditions(makeSession(), 1, tmpDir);
    expect(result).toMatch(/[Pp]ause/);
  });
});

// ---------------------------------------------------------------------------
// checkCustomStopConditions()
// ---------------------------------------------------------------------------

describe('checkCustomStopConditions()', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('returns null with no stop conditions', async () => {
    const result = await checkCustomStopConditions(makeSession(), 1, makeScore(), tmpDir);
    expect(result).toBeNull();
  });

  it('returns reason when .gicl-stop file exists', async () => {
    fs.writeFileSync(path.join(tmpDir, '.gicl-stop'), 'manual stop', 'utf8');
    const result = await checkCustomStopConditions(makeSession(), 1, makeScore(), tmpDir);
    expect(result).toBe('manual stop');
  });

  it('deletes .gicl-stop file after reading', async () => {
    const stopFile = path.join(tmpDir, '.gicl-stop');
    fs.writeFileSync(stopFile, 'stop', 'utf8');
    await checkCustomStopConditions(makeSession(), 1, makeScore(), tmpDir);
    expect(fs.existsSync(stopFile)).toBe(false);
  });

  it('returns reason after 3 consecutive scores below 60', async () => {
    const session = makeSession({ previousScores: [50, 45, 55] });
    const result = await checkCustomStopConditions(session, 4, makeScore(), tmpDir);
    expect(result).toMatch(/below 60/);
  });

  it('does NOT stop when only 2 consecutive scores below 60', async () => {
    const session = makeSession({ previousScores: [80, 50, 55] });
    const result = await checkCustomStopConditions(session, 4, makeScore(), tmpDir);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadConfig()
// ---------------------------------------------------------------------------

describe('loadConfig()', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('returns empty object when no config file', async () => {
    const config = await loadConfig(tmpDir);
    expect(config).toEqual({});
  });

  it('parses .gicl.json', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.gicl.json'),
      JSON.stringify({ maxIterations: 10, targetScore: 95 }),
      'utf8'
    );
    const config = await loadConfig(tmpDir);
    expect(config.maxIterations).toBe(10);
    expect(config.targetScore).toBe(95);
  });

  it('returns empty object on invalid JSON', async () => {
    fs.writeFileSync(path.join(tmpDir, '.gicl.json'), '{ invalid json', 'utf8');
    const config = await loadConfig(tmpDir);
    expect(config).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// formatIterationSummary()
// ---------------------------------------------------------------------------

describe('formatIterationSummary()', () => {
  it('returns a string', () => {
    const result = formatIterationSummary(1, makeScore(), makeSession());
    expect(typeof result).toBe('string');
  });

  it('includes iteration number', () => {
    const result = formatIterationSummary(3, makeScore(), makeSession());
    expect(result).toContain('3');
  });

  it('includes final score', () => {
    const result = formatIterationSummary(1, makeScore({ final: 88 }), makeSession());
    expect(result).toContain('88');
  });

  it('includes maxIterations', () => {
    const result = formatIterationSummary(1, makeScore(), makeSession({ maxIterations: 7 }));
    expect(result).toContain('7');
  });
});

// ---------------------------------------------------------------------------
// formatIterationStatus()
// ---------------------------------------------------------------------------

describe('formatIterationStatus()', () => {
  function makeValidation(overrides = {}) {
    return {
      hasViolations: false,
      violations: [],
      designDocs: { totalCount: 0, completedCount: 0 },
      progressPercentage: 0,
      hasIncompleteRequirements: false,
      requirementResults: { incomplete: [] },
      suggestions: { totalAgents: 0, suggestions: [] },
      ...overrides,
    };
  }

  it('returns object with proceed and message', () => {
    const result = formatIterationStatus(2, makeScore(), makeSession(), makeValidation());
    expect(result).toHaveProperty('proceed');
    expect(typeof result.message).toBe('string');
  });

  it('proceed is false (not done yet)', () => {
    const result = formatIterationStatus(2, makeScore(), makeSession(), makeValidation());
    expect(result.proceed).toBe(false);
  });

  it('message contains score', () => {
    const result = formatIterationStatus(1, makeScore({ final: 73 }), makeSession(), makeValidation());
    expect(result.message).toContain('73');
  });

  it('shows violations when present', () => {
    const validation = makeValidation({
      hasViolations: true,
      violations: [{ severity: 'error', message: 'missing semicolon' }],
    });
    const result = formatIterationStatus(1, makeScore(), makeSession(), validation);
    expect(result.message).toContain('missing semicolon');
  });

  it('truncates violations list beyond 5', () => {
    const violations = Array.from({ length: 8 }, (_, i) => ({
      severity: 'warning',
      message: `violation ${i}`,
    }));
    const validation = makeValidation({ hasViolations: true, violations });
    const result = formatIterationStatus(1, makeScore(), makeSession(), validation);
    expect(result.message).toContain('and 3 more');
  });
});
