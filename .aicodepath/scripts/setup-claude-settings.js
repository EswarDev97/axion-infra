#!/usr/bin/env node
/**
 * Generates .claude/settings.local.json with correct paths for target project
 * Run this after installing aicodepath-tool into a new project
 *
 * Features:
 * - Auto-enables required AICodePath plugins
 * - Detects project languages and enables code intelligence plugins
 * - Configures statusline and hooks
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.cwd();
const CLAUDE_DIR = path.join(PROJECT_DIR, '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.local.json');
const AICODEPATH_DIR = path.join(PROJECT_DIR, '.aicodepath');

// Verify aicodepath is installed
if (!fs.existsSync(AICODEPATH_DIR)) {
  console.error('Error: .aicodepath directory not found. Run install-v2.sh first.');
  process.exit(1);
}

// Create .claude directory if needed
if (!fs.existsSync(CLAUDE_DIR)) {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
}

// AICodePath required plugins
// NOTE: Plugins must be installed globally first via Claude Code UI
// This just enables them for this project once installed
const REQUIRED_PLUGINS = [
  'frontend-design@claude-plugins-official',
  'github@claude-plugins-official',
  'context7@claude-plugins-official',
  'code-review@claude-plugins-official',
  'commit-commands@claude-plugins-official',
  'feature-dev@claude-plugins-official',
  'pr-review-toolkit@claude-plugins-official',
];

// Code intelligence plugins (language-specific)
const CODE_INTELLIGENCE_PLUGINS = {
  typescript: {
    id: 'typescript@claude-plugins-official',
    indicators: ['tsconfig.json', 'package.json', '.ts', '.tsx', '.js', '.jsx'],
  },
  python: {
    id: 'python@claude-plugins-official',
    indicators: ['requirements.txt', 'setup.py', 'pyproject.toml', '.py'],
  },
  go: {
    id: 'go@claude-plugins-official',
    indicators: ['go.mod', 'go.sum', '.go'],
  },
  rust: {
    id: 'rust@claude-plugins-official',
    indicators: ['Cargo.toml', 'Cargo.lock', '.rs'],
  },
};

/**
 * Detect project languages based on file presence
 */
function detectProjectLanguages(projectPath = PROJECT_DIR) {
  const detectedLanguages = [];

  for (const [lang, config] of Object.entries(CODE_INTELLIGENCE_PLUGINS)) {
    // Check for language indicators
    for (const indicator of config.indicators) {
      try {
        if (indicator.startsWith('.')) {
          // File extension - check if any files with this extension exist
          const files = fs.readdirSync(projectPath);
          const hasMatchingFile = files.some((file) => file.endsWith(indicator));

          if (hasMatchingFile) {
            detectedLanguages.push({ lang, pluginId: config.id });
            break;
          }
        } else {
          // Specific file - check if it exists
          const indicatorPath = path.join(projectPath, indicator);
          if (fs.existsSync(indicatorPath)) {
            detectedLanguages.push({ lang, pluginId: config.id });
            break;
          }
        }
      } catch {
        // Indicator not found, continue
      }
    }
  }

  return detectedLanguages;
}

// Detect project languages
const detectedLanguages = detectProjectLanguages();
const languagePlugins = detectedLanguages.map((l) => l.pluginId);

// Convert plugin arrays to object format (required by Claude Code)
const allPlugins = [...REQUIRED_PLUGINS, ...languagePlugins];
const enabledPluginsObject = {};
allPlugins.forEach((plugin) => {
  enabledPluginsObject[plugin] = true;
});

// Generate settings with project-specific paths
// NOTE: Hooks are now defined in .claude/settings.json (project-level)
// This file (settings.local.json) contains only local preferences and permissions
const settings = {
  // Standard permissions for AICodePath workflows
  // Use general wildcards only - avoid overly specific command patterns
  permissions: {
    allow: [
      'Bash(node:*)',
      'Bash(npm:*)',
      'Bash(git add:*)',
      'Bash(git commit:*)',
      'Bash(git push:*)',
      'Bash(git status:*)',
      'Bash(git diff:*)',
      'Bash(git log:*)',
      'Bash(sqlite3:*)',
      'Bash(find:*)',
      'Bash(grep:*)'
    ]
  },

  // Enable required plugins + detected language plugins (if installed globally)
  enabledPlugins: enabledPluginsObject,

  // Statusline configuration (local preference)
  statusLine: {
    type: 'command',
    command: path.join(AICODEPATH_DIR, 'scripts/statusline.sh'),
    padding: 0
  }
};

// Write settings file
fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

console.log('✓ Generated .claude/settings.local.json');
console.log(`  Project: ${PROJECT_DIR}`);
console.log(`  Permissions: ${settings.permissions.allow.length} standard commands allowed`);
console.log(`  Statusline: ${settings.statusLine.command}`);
console.log(`  Enabled plugins: ${REQUIRED_PLUGINS.length} AICodePath plugins`);
console.log(`\n  Note: Project hooks are defined in .claude/settings.json (created by install script)`);

if (detectedLanguages.length > 0) {
  console.log(`  Detected languages: ${detectedLanguages.map((l) => l.lang).join(', ')}`);
  console.log(`  Language plugins: ${languagePlugins.length} code intelligence plugins`);
  detectedLanguages.forEach((l) => {
    console.log(`    - ${l.lang}: ${l.pluginId}`);
  });
} else {
  console.log('  No languages detected - add code files and re-run to enable intelligence plugins');
}

console.log('\n⚠️  Note: Plugins must be installed globally via Claude Code UI first.');
console.log('   The settings file only enables already-installed plugins.');
console.log('\nRestart Claude Code for changes to take effect.');
