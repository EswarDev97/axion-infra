/**
 * Integration tests for install-v2.sh script
 * Tests the v2 installation process into a temporary project directory
 *
 * Note: Uses child_process.execSync for shell script execution in tests.
 * Input paths are controlled and validated before use.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Safely execute bash script with validated paths
 * @param {string} scriptPath - Absolute path to script
 * @param {string} targetPath - Absolute path to target directory
 * @returns {string} - Command output
 */
function executeBashScript(scriptPath, targetPath) {
  // Validate inputs are absolute paths
  if (!path.isAbsolute(scriptPath) || !path.isAbsolute(targetPath)) {
    throw new Error('Script and target paths must be absolute');
  }

  // Execute with proper quoting for safety
  return execSync(`bash "${scriptPath}" "${targetPath}"`, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });
}

/**
 * Safely execute sqlite3 command
 * @param {string} dbPath - Absolute path to database
 * @param {string} query - SQL query
 * @returns {string} - Query result
 */
function executeSqliteQuery(dbPath, query) {
  if (!path.isAbsolute(dbPath)) {
    throw new Error('Database path must be absolute');
  }

  return execSync(`sqlite3 "${dbPath}" "${query}"`, {
    encoding: 'utf-8',
  });
}

describe('install-v2.sh', () => {
  let testProjectDir;
  let sourceRoot;
  let installScript;

  beforeAll(() => {
    // Get the source root (aicodepath-tool directory)
    sourceRoot = path.resolve(__dirname, '../..');
    installScript = path.join(sourceRoot, 'scripts', 'install-v2.sh');

    // Verify install script exists
    if (!fs.existsSync(installScript)) {
      throw new Error(`Install script not found: ${installScript}`);
    }
  });

  beforeEach(() => {
    // Create a temporary test project directory
    testProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicodepath-test-'));
  });

  afterEach(() => {
    // Clean up test directory
    if (testProjectDir && fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  describe('Installation Process', () => {
    test('should create .aicodepath directory', () => {
      // Run installation
      executeBashScript(installScript, testProjectDir);

      const aicodepathDir = path.join(testProjectDir, '.aicodepath');
      expect(fs.existsSync(aicodepathDir)).toBe(true);
      expect(fs.statSync(aicodepathDir).isDirectory()).toBe(true);
    });

    test('should create version file with 2.0.0', () => {
      executeBashScript(installScript, testProjectDir);

      const versionFile = path.join(testProjectDir, '.aicodepath', 'version');
      expect(fs.existsSync(versionFile)).toBe(true);

      const version = fs.readFileSync(versionFile, 'utf-8').trim();
      expect(version).toBe('2.0.0');
    });

    test('should copy all required directories', () => {
      executeBashScript(installScript, testProjectDir);

      const requiredDirs = [
        'hooks',
        'rules',
        'guidelines',
        'lib',
        'scripts',
        'db',
        'templates',
        'state-templates',
        'skills',
        'agents',
      ];

      const aicodepathDir = path.join(testProjectDir, '.aicodepath');

      requiredDirs.forEach((dir) => {
        const dirPath = path.join(aicodepathDir, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      });
    });

    test('should copy config.json', () => {
      executeBashScript(installScript, testProjectDir);

      const configFile = path.join(testProjectDir, '.aicodepath', 'config.json');
      expect(fs.existsSync(configFile)).toBe(true);

      // Verify it's valid JSON
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      expect(config.version).toBe('2.0.0');
      expect(config.name).toBe('aicodepath');
      expect(config.paths).toBeDefined();
      expect(config.features).toBeDefined();
    });

    test('should create .claude directory', () => {
      executeBashScript(installScript, testProjectDir);

      const claudeDir = path.join(testProjectDir, '.claude');
      expect(fs.existsSync(claudeDir)).toBe(true);
      expect(fs.statSync(claudeDir).isDirectory()).toBe(true);
    });

    test('should create .claude/settings.json with hooks pointing to .aicodepath', () => {
      executeBashScript(installScript, testProjectDir);

      const settingsFile = path.join(testProjectDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsFile)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      expect(settings.hooks).toBeDefined();
      expect(typeof settings.hooks).toBe('object');

      // Verify hooks structure contains required hook types
      expect(settings.hooks.SessionStart || settings.hooks.PreToolUse || settings.hooks.PostToolUse).toBeDefined();
    });

    test('should create .claude/skills.json pointing to .aicodepath', () => {
      executeBashScript(installScript, testProjectDir);

      const skillsFile = path.join(testProjectDir, '.claude', 'skills.json');
      expect(fs.existsSync(skillsFile)).toBe(true);

      const skills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8'));
      expect(skills.skills).toBeDefined();

      // Verify all scripts point to .aicodepath
      Object.values(skills.skills).forEach((skill) => {
        expect(skill.script).toMatch(/^\.\/\.aicodepath\//);
      });
    });

    test('should copy CLAUDE.md to project root', () => {
      executeBashScript(installScript, testProjectDir);

      const claudeMd = path.join(testProjectDir, 'CLAUDE.md');
      expect(fs.existsSync(claudeMd)).toBe(true);

      const content = fs.readFileSync(claudeMd, 'utf-8');
      expect(content).toContain('AICodePath');
      expect(content).toContain('Workflow Rules');
    });

    test('should initialize knowledge base directory', () => {
      executeBashScript(installScript, testProjectDir);

      const kbDir = path.join(testProjectDir, 'aicodepath-docs');
      expect(fs.existsSync(kbDir)).toBe(true);
      expect(fs.statSync(kbDir).isDirectory()).toBe(true);
    });

    test('should create SQLite database', () => {
      executeBashScript(installScript, testProjectDir);

      const dbFile = path.join(testProjectDir, 'aicodepath-docs', 'aicodepath.db');
      expect(fs.existsSync(dbFile)).toBe(true);

      // Verify it's a valid SQLite database by checking for tables
      const result = executeSqliteQuery(
        dbFile,
        "SELECT name FROM sqlite_master WHERE type='table';"
      );

      expect(result).toContain('artifacts');
      expect(result).toContain('decisions');
      expect(result).toContain('links');
    });

    test('should make scripts executable', () => {
      executeBashScript(installScript, testProjectDir);

      const scriptsDir = path.join(testProjectDir, '.aicodepath', 'scripts');
      const scripts = fs.readdirSync(scriptsDir);

      const shellScripts = scripts.filter((f) => f.endsWith('.sh'));
      expect(shellScripts.length).toBeGreaterThan(0);

      shellScripts.forEach((script) => {
        const scriptPath = path.join(scriptsDir, script);
        const stats = fs.statSync(scriptPath);
        // Check if file is executable (mode includes execute bit)
        expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    test('should fail gracefully if target directory does not exist', () => {
      const nonExistentDir = path.join(testProjectDir, 'non-existent');

      expect(() => {
        executeBashScript(installScript, nonExistentDir);
      }).toThrow();
    });

    test('should prompt for confirmation if .aicodepath already exists', () => {
      // First installation
      executeBashScript(installScript, testProjectDir);

      // Try to install again - should fail without confirmation
      // (We can't easily test interactive prompts in jest, so we just verify it doesn't silently overwrite)
      const aicodepathDir = path.join(testProjectDir, '.aicodepath');
      const versionFileBefore = fs.readFileSync(
        path.join(aicodepathDir, 'version'),
        'utf-8'
      );

      // Create a marker file
      fs.writeFileSync(path.join(aicodepathDir, 'test-marker'), 'test');

      // Second installation with automatic "no" response should fail
      try {
        execSync(`echo "n" | bash "${installScript}" "${testProjectDir}"`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error) {
        // Expected to fail
      }

      // Marker should still exist (installation was cancelled)
      expect(fs.existsSync(path.join(aicodepathDir, 'test-marker'))).toBe(true);
    });
  });

  describe('Directory Structure Verification', () => {
    test('should create complete directory structure', () => {
      executeBashScript(installScript, testProjectDir);

      // Check top-level structure
      expect(fs.existsSync(path.join(testProjectDir, '.aicodepath'))).toBe(true);
      expect(fs.existsSync(path.join(testProjectDir, '.claude'))).toBe(true);
      expect(fs.existsSync(path.join(testProjectDir, 'aicodepath-docs'))).toBe(true);
      expect(fs.existsSync(path.join(testProjectDir, 'CLAUDE.md'))).toBe(true);

      // Check .aicodepath contents
      const aicodepathContents = fs.readdirSync(
        path.join(testProjectDir, '.aicodepath')
      );
      expect(aicodepathContents).toContain('hooks');
      expect(aicodepathContents).toContain('rules');
      expect(aicodepathContents).toContain('guidelines');
      expect(aicodepathContents).toContain('lib');
      expect(aicodepathContents).toContain('scripts');
      expect(aicodepathContents).toContain('db');
      expect(aicodepathContents).toContain('templates');
      expect(aicodepathContents).toContain('state-templates');
      expect(aicodepathContents).toContain('skills');
      expect(aicodepathContents).toContain('agents');
      expect(aicodepathContents).toContain('config.json');
      expect(aicodepathContents).toContain('version');

      // Check .claude contents
      const claudeContents = fs.readdirSync(path.join(testProjectDir, '.claude'));
      expect(claudeContents).toContain('settings.json');
      expect(claudeContents).toContain('skills.json');
    });

    test('should preserve source directory structure in hooks', () => {
      executeBashScript(installScript, testProjectDir);

      const hooksDir = path.join(testProjectDir, '.aicodepath', 'hooks');
      const sourceHooksDir = path.join(sourceRoot, 'hooks');

      // Check that key files exist
      const sourceFiles = fs.readdirSync(sourceHooksDir).filter((f) => f.endsWith('.js'));
      const targetFiles = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.js'));

      expect(targetFiles.length).toBeGreaterThan(0);
      expect(targetFiles.length).toBe(sourceFiles.length);
    });

    test('should preserve source directory structure in rules', () => {
      executeBashScript(installScript, testProjectDir);

      const rulesDir = path.join(testProjectDir, '.aicodepath', 'rules');
      const sourceRulesDir = path.join(sourceRoot, 'rules');

      // Check that core-workflow.md exists
      expect(fs.existsSync(path.join(rulesDir, 'core-workflow.md'))).toBe(true);

      // Check subdirectories
      const sourceSubdirs = fs
        .readdirSync(sourceRulesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      const targetSubdirs = fs
        .readdirSync(rulesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      sourceSubdirs.forEach((dir) => {
        expect(targetSubdirs).toContain(dir);
      });
    });
  });

  describe('Configuration Validation', () => {
    test('should create valid settings.json with all required hooks', () => {
      executeBashScript(installScript, testProjectDir);

      const settingsFile = path.join(testProjectDir, '.claude', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));

      const requiredHookScripts = [
        'pre-flight-check',
        'guideline-validator',
        'api-validator',
        'data-validator',
        'architecture-validator',
        'duplication-checker',
        'devops-validator',
        'iac-validator',
        'pre-commit-validator',
      ];

      const settingsContent = JSON.stringify(settings);

      // Verify all required hook scripts are referenced in settings
      requiredHookScripts.forEach((hookScript) => {
        expect(settingsContent).toContain(hookScript);
        expect(settingsContent).toContain('.aicodepath/hooks');
      });

      // Verify hooks structure
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.PreToolUse || settings.hooks.PostToolUse).toBeDefined();
    });

    test('should create valid skills.json with all required skills', () => {
      executeBashScript(installScript, testProjectDir);

      const skillsFile = path.join(testProjectDir, '.claude', 'skills.json');
      const skills = JSON.parse(fs.readFileSync(skillsFile, 'utf-8'));

      const requiredSkills = [
        'aicodepath-preflight',
        'aicodepath-diagnostics',
        'aicodepath-init',
        'aicodepath-validate-guidelines',
        'aicodepath-statusline',
      ];

      requiredSkills.forEach((skillId) => {
        const skill = skills.skills[skillId];
        expect(skill).toBeDefined();
        expect(skill.name).toBeDefined();
        expect(skill.description).toBeDefined();
        expect(skill.script).toMatch(/^\.\/\.aicodepath\//);
        expect(skill.showInMenu).toBeDefined();
      });
    });

    test('should have valid config.json structure', () => {
      executeBashScript(installScript, testProjectDir);

      const configFile = path.join(testProjectDir, '.aicodepath', 'config.json');
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

      // Verify required sections
      expect(config.version).toBe('2.0.0');
      expect(config.name).toBeDefined();
      expect(config.metadata).toBeDefined();
      expect(config.paths).toBeDefined();
      expect(config.features).toBeDefined();
      expect(config.requiredPlugins).toBeDefined();
      expect(config.mcpServers).toBeDefined();
      expect(config.configuration).toBeDefined();

      // Verify paths section
      expect(config.paths.hooks).toBe('hooks');
      expect(config.paths.rules).toBe('rules');
      expect(config.paths.guidelines).toBe('guidelines');
      expect(config.paths.lib).toBe('lib');
      expect(config.paths.scripts).toBe('scripts');
      expect(config.paths.db).toBe('db');
      expect(config.paths.templates).toBe('templates');
      expect(config.paths.stateTemplates).toBe('state-templates');
      expect(config.paths.skills).toBe('skills');
      expect(config.paths.agents).toBe('agents');
      expect(config.paths.knowledgeBase).toBe('aicodepath-docs');
    });
  });
});
