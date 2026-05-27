'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-session-test-'));
  fs.mkdirSync(path.join(dir, '.aicodepath', 'skills', 'using-aicodepath'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'aicodepath-docs', 'checkpoints'),             { recursive: true });
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// We test session-start-hook by mocking path-resolver so the hook uses our
// temp project root instead of the real process.cwd().
// ---------------------------------------------------------------------------

describe('session-start-hook', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTmpProject();
    jest.resetModules();
    // Mock path-resolver to return our temp dir
    jest.doMock('../../lib/path-resolver', () => ({
      findProjectRoot: () => tmpDir,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup(tmpDir);
  });

  it('returns hookSpecificOutput.additionalContext', async () => {
    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput).toBeDefined();
    expect(typeof result.hookSpecificOutput.additionalContext).toBe('string');
  });

  it('context contains EXTREMELY_IMPORTANT wrapper', async () => {
    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.additionalContext).toMatch(/<EXTREMELY_IMPORTANT>/);
    expect(result.hookSpecificOutput.additionalContext).toMatch(/<\/EXTREMELY_IMPORTANT>/);
  });

  it('injects meta-skill content when SKILL.md exists', async () => {
    const skillPath = path.join(tmpDir, '.aicodepath', 'skills', 'using-aicodepath', 'SKILL.md');
    fs.writeFileSync(skillPath, '# Test Meta Skill\nSkill content here', 'utf8');

    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('Test Meta Skill');
  });

  it('uses fallback message when SKILL.md is missing', async () => {
    // tmpDir has the directory but no SKILL.md
    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('AICodePath is active');
  });

  it('includes workspace detection when aicodepath-state.md is missing', async () => {
    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('Workspace Detection Result');
    expect(result.hookSpecificOutput.additionalContext).toContain('not initialized');
  });

  it('parses aicodepath-state.md when it exists', async () => {
    const stateContent = [
      '# AICodePath State',
      '- **Project Type**: **GREENFIELD**',
      '- **Current Phase**: **PRE-FLIGHT**',
      '- **Current Stage**: **initialization**',
    ].join('\n');
    fs.writeFileSync(
      path.join(tmpDir, 'aicodepath-docs', 'aicodepath-state.md'),
      stateContent,
      'utf8'
    );

    const { hook } = require('../session-start-hook');
    const result = await hook({});
    const ctx = result.hookSpecificOutput.additionalContext;
    expect(ctx).toContain('GREENFIELD');
    expect(ctx).toContain('PRE-FLIGHT');
  });

  it('emits MANDATORY-INCEPTION for brownfield at reverse-engineering stage', async () => {
    const stateContent = [
      '# AICodePath State',
      '- **Project Type**: **BROWNFIELD**',
      '- **Current Phase**: **INCEPTION**',
      '- **Current Stage**: **reverse-engineering**',
    ].join('\n');
    fs.writeFileSync(
      path.join(tmpDir, 'aicodepath-docs', 'aicodepath-state.md'),
      stateContent,
      'utf8'
    );

    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('<MANDATORY-INCEPTION>');
  });

  it('includes resume summary when recent checkpoint exists', async () => {
    const cp = {
      phase: 'CONSTRUCTION',
      stage: 'implementation',
      unit: 'T3',
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(tmpDir, 'aicodepath-docs', 'checkpoints', 'latest.json'),
      JSON.stringify(cp),
      'utf8'
    );

    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('Session Resume Available');
    expect(result.hookSpecificOutput.additionalContext).toContain('CONSTRUCTION');
  });

  it('omits resume summary for checkpoints older than 24h', async () => {
    const old = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    const cp  = { phase: 'CONSTRUCTION', stage: 'implementation', timestamp: old };
    fs.writeFileSync(
      path.join(tmpDir, 'aicodepath-docs', 'checkpoints', 'latest.json'),
      JSON.stringify(cp),
      'utf8'
    );

    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.additionalContext).not.toContain('Session Resume Available');
  });

  it('never throws — returns a result even when all optional files are missing', async () => {
    // tmp project has no SKILL.md, no state file, no checkpoint — all reads fail-safe
    const { hook } = require('../session-start-hook');
    const result = await hook({});
    // Hook must always return something (never throw)
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('hookEventName is SessionStart', async () => {
    const { hook } = require('../session-start-hook');
    const result = await hook({});
    expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
  });
});
