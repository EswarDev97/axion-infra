/**
 * Preflight Command
 *
 * Checks that the AICodePath environment is correctly configured:
 * Node version, required directories, Claude Code settings, hook registration.
 *
 * @module commands/preflight
 */

'use strict';

const fs = require('fs');
const path = require('path');
const pathResolver = require('../lib/path-resolver');
const logger = require('../lib/logger');

const MIN_NODE_MAJOR = 18;

/**
 * Run all preflight checks and print a summary.
 */
async function preflightCommand() {
  const results = [];

  // 1. Node version
  const [major] = process.versions.node.split('.').map(Number);
  const nodeOk = major >= MIN_NODE_MAJOR;
  results.push({
    label: `Node.js >= ${MIN_NODE_MAJOR} (found ${process.versions.node})`,
    pass: nodeOk,
  });

  // 2. Project root found
  let projectRoot;
  try {
    projectRoot = pathResolver.findProjectRoot();
    results.push({ label: `Project root: ${projectRoot}`, pass: true });
  } catch {
    results.push({ label: 'Project root (CLAUDE.md or package.json found)', pass: false });
  }

  // 3. .aicodepath directory
  const aicodePathRoot = pathResolver.getAicodePathRoot ? pathResolver.getAicodePathRoot() : path.join(projectRoot || process.cwd(), '.aicodepath');
  results.push({
    label: `.aicodepath/ directory exists`,
    pass: fs.existsSync(aicodePathRoot),
  });

  // 4. .claude/settings.json
  const claudeDir = projectRoot ? path.join(projectRoot, '.claude') : null;
  const settingsPath = claudeDir ? path.join(claudeDir, 'settings.json') : null;
  const settingsExists = settingsPath && fs.existsSync(settingsPath);
  results.push({
    label: `.claude/settings.json exists${settingsExists ? '' : ' (run: node .aicodepath/bin/aicodepath.js init)'}`,
    pass: Boolean(settingsExists),
  });

  // 5. Database file
  try {
    const dbPath = pathResolver.getDbPath();
    results.push({
      label: `Database file: ${dbPath}`,
      pass: fs.existsSync(dbPath),
    });
  } catch {
    results.push({ label: 'Database file accessible', pass: false });
  }

  // 6. Hooks registered in settings.json
  if (settingsExists) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const hookCount = Object.values(settings.hooks || {})
        .flat()
        .flatMap(group => (group && group.hooks) ? group.hooks : [group])
        .filter(h => h && h.command).length;
      results.push({ label: `Hooks registered in settings.json (${hookCount} found)`, pass: hookCount > 0 });
    } catch {
      results.push({ label: 'Hooks registered in settings.json', pass: false });
    }
  }

  // 7. Key config paths exist
  if (aicodePathRoot) {
    try {
      const configPath = path.join(aicodePathRoot, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const dirs = config.paths || {};
      const missing = Object.entries(dirs)
        .filter(([, rel]) => typeof rel === 'string')
        .filter(([, rel]) => !fs.existsSync(path.join(aicodePathRoot, rel)));
      results.push({
        label: `Config directory paths exist (${Object.keys(dirs).length} checked${missing.length ? ', ' + missing.length + ' missing: ' + missing.map(([k]) => k).join(', ') : ''})`,
        pass: missing.length === 0,
      });
    } catch {
      results.push({ label: 'Config paths validated', pass: false });
    }
  }

  // Print summary
  let allPass = true;
  console.log('\n🛫 AICodePath Preflight Check\n');
  for (const { label, pass } of results) {
    const icon = pass ? '✅' : '❌';
    console.log(`  ${icon} ${label}`);
    if (!pass) allPass = false;
  }
  console.log('');

  if (allPass) {
    console.log('✅ All preflight checks passed. AICodePath is ready.\n');
  } else {
    console.log('❌ Some checks failed. Run `node .aicodepath/bin/aicodepath.js init` to fix missing configuration.\n');
    process.exit(1);
  }
}

module.exports = preflightCommand;
