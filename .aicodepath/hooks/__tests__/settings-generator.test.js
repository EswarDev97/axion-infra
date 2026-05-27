'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { generateSettings, DEFAULT_PERMISSIONS } = require('../../lib/settings-generator');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-settings-test-'));
  // Minimal .aicodepath structure so generateSettings doesn't crash
  fs.mkdirSync(path.join(dir, '.aicodepath', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.aicodepath', 'templates'), { recursive: true });
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// DEFAULT_PERMISSIONS
// ---------------------------------------------------------------------------

describe('DEFAULT_PERMISSIONS', () => {
  it('has allow, ask, deny arrays', () => {
    expect(Array.isArray(DEFAULT_PERMISSIONS.allow)).toBe(true);
    expect(Array.isArray(DEFAULT_PERMISSIONS.ask)).toBe(true);
    expect(Array.isArray(DEFAULT_PERMISSIONS.deny)).toBe(true);
  });

  it('allow list is non-empty', () => {
    expect(DEFAULT_PERMISSIONS.allow.length).toBeGreaterThan(0);
  });

  it('deny list blocks rm -rf /', () => {
    expect(DEFAULT_PERMISSIONS.deny).toContain('Bash(rm -rf /)');
  });

  it('deny list blocks .env writes', () => {
    expect(DEFAULT_PERMISSIONS.deny).toContain('Write(.env)');
  });
});

// ---------------------------------------------------------------------------
// generateSettings()
// ---------------------------------------------------------------------------

describe('generateSettings()', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = mkTmpProject(); });
  afterEach(() => cleanup(tmpDir));

  it('throws on relative path', () => {
    expect(() => generateSettings('relative/path')).toThrow(
      'absolute path'
    );
  });

  it('throws on empty string', () => {
    expect(() => generateSettings('')).toThrow();
  });

  it('returns success:true on valid project root', () => {
    const result = generateSettings(tmpDir);
    expect(result.success).toBe(true);
  });

  it('writes settings.json to .claude/settings.json', () => {
    generateSettings(tmpDir);
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);
  });

  it('written settings.json is valid JSON', () => {
    generateSettings(tmpDir);
    const raw = fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('settings.json contains permissions when includePermissions=true (default)', () => {
    generateSettings(tmpDir);
    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8')
    );
    expect(parsed.permissions).toBeDefined();
    expect(Array.isArray(parsed.permissions.allow)).toBe(true);
    expect(Array.isArray(parsed.permissions.deny)).toBe(true);
  });

  it('settings.json omits permissions when includePermissions=false', () => {
    generateSettings(tmpDir, { includePermissions: false });
    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8')
    );
    expect(parsed.permissions).toBeUndefined();
  });

  it('result.permissionsIncluded reflects the option', () => {
    const r1 = generateSettings(tmpDir, { includePermissions: true });
    expect(r1.permissionsIncluded).toBe(true);

    const r2 = generateSettings(tmpDir, { includePermissions: false });
    expect(r2.permissionsIncluded).toBe(false);
  });

  it('merges customPermissions.allow into defaults', () => {
    generateSettings(tmpDir, {
      customPermissions: { allow: ['Bash(my-custom-cmd)'] },
    });
    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8')
    );
    expect(parsed.permissions.allow).toContain('Bash(my-custom-cmd)');
  });

  it('deduplicates allow entries', () => {
    generateSettings(tmpDir, {
      customPermissions: { allow: ['Bash(git status)'] }, // already in defaults
    });
    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8')
    );
    const count = parsed.permissions.allow.filter(e => e === 'Bash(git status)').length;
    expect(count).toBe(1);
  });

  it('preserves existing enabledPlugins from prior settings.json', () => {
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({ enabledPlugins: ['my-plugin'] }),
      'utf8'
    );
    generateSettings(tmpDir);
    const parsed = JSON.parse(
      fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8')
    );
    expect(parsed.enabledPlugins).toEqual(['my-plugin']);
  });

  it('returns settingsPath pointing to .claude/settings.json', () => {
    const result = generateSettings(tmpDir);
    expect(result.settingsPath).toBe(path.join(tmpDir, '.claude', 'settings.json'));
  });
});
