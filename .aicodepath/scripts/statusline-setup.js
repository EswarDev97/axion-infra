#!/usr/bin/env node
/**
 * AICodePath Statusline Setup Script
 *
 * Interactive setup for configuring Claude Code statusline with AICodePath integration.
 * Detects OS, checks dependencies, and generates appropriate configuration.
 *
 * Usage: node statusline-setup.js [--install-central] [--script-type=bash|python|powershell]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { findProjectRoot } = require('../lib/path-resolver');

// Configuration
const CENTRAL_DIR = path.join(os.homedir(), '.aicodepath');
const PROJECT_DIR = findProjectRoot();

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Detect operating system
 */
function detectOS() {
  const platform = os.platform();

  if (platform === 'win32') {
    return 'windows';
  } else if (platform === 'darwin') {
    return 'macos';
  } else if (platform === 'linux') {
    // Check for WSL
    try {
      const release = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
      if (release.includes('microsoft') || release.includes('wsl')) {
        return 'wsl';
      }
    } catch {
      // Not WSL
    }
    return 'linux';
  }

  return 'unknown';
}

/**
 * Check if jq is available
 */
function checkJq() {
  try {
    execSync('jq --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Python 3 is available
 */
function checkPython() {
  try {
    execSync('python3 --version', { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync('python --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get recommended script type for the platform
 */
function getRecommendedScript(osType, hasJq, hasPython) {
  if (osType === 'windows') {
    return 'powershell';
  }

  // For Unix systems, prefer bash with jq, fallback to python
  if (hasJq) {
    return 'bash';
  } else if (hasPython) {
    return 'python';
  }

  return 'bash'; // Will show warning about jq
}

/**
 * Get shell RC file path
 */
function getShellRcPath(osType) {
  const homeDir = os.homedir();

  if (osType === 'windows') {
    return path.join(homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
  }

  // Check which shell is being used
  const shell = process.env.SHELL || '/bin/bash';

  if (shell.includes('zsh')) {
    return path.join(homeDir, '.zshrc');
  } else if (shell.includes('fish')) {
    return path.join(homeDir, '.config', 'fish', 'config.fish');
  }

  return path.join(homeDir, '.bashrc');
}

/**
 * Generate Claude Code settings for statusline
 */
function generateClaudeSettings(scriptPath) {
  return {
    statusLine: {
      type: 'command',
      command: scriptPath,
      padding: 0,
    },
  };
}

/**
 * Write statusLine config into ~/.claude/settings.json, merging with existing content.
 * The scriptPath is derived from os.homedir() at runtime — never hardcoded.
 */
function writeClaudeSettings(scriptPath) {
  const claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const claudeDir = path.dirname(claudeSettingsPath);

  // Ensure ~/.claude/ exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Read existing settings (if any)
  let existing = {};
  if (fs.existsSync(claudeSettingsPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
    } catch {
      console.warn(`${colors.yellow}⚠ Could not parse existing settings.json — will merge carefully${colors.reset}`);
    }
  }

  // Merge: only update statusLine, preserve everything else
  existing.statusLine = {
    type: 'command',
    command: scriptPath,
    padding: existing.statusLine?.padding ?? 0,
  };

  fs.writeFileSync(claudeSettingsPath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  return claudeSettingsPath;
}

/**
 * Copy statusline scripts to central directory
 */
function installCentral(scriptType) {
  // Ensure central directory exists
  if (!fs.existsSync(CENTRAL_DIR)) {
    fs.mkdirSync(CENTRAL_DIR, { recursive: true });
  }

  const scriptsDir = path.join(__dirname);
  const filesToCopy = [
    { src: 'statusline.sh', dest: 'statusline.sh' },
    { src: 'statusline.py', dest: 'statusline.py' },
    { src: 'statusline.ps1', dest: 'statusline.ps1' },
    { src: 'statusline-kb-query.js', dest: 'statusline-kb-query.js' },
    { src: 'provider-data-extractor.js', dest: 'provider-data-extractor.js' },
  ];

  for (const file of filesToCopy) {
    const srcPath = path.join(scriptsDir, file.src);
    const destPath = path.join(CENTRAL_DIR, file.dest);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);

      // Make executable on Unix
      if (os.platform() !== 'win32') {
        fs.chmodSync(destPath, '755');
      }
    }
  }

  // Copy lib/providers/ directory recursively
  const providersSrc = path.join(PROJECT_DIR, '.aicodepath', 'lib', 'providers');
  const providersDest = path.join(CENTRAL_DIR, 'lib', 'providers');
  try {
    fs.cpSync(providersSrc, providersDest, { recursive: true });
  } catch (err) {
    console.warn(`${colors.yellow}⚠ Could not copy lib/providers/: ${err.message}${colors.reset}`);
  }

  // Return path to the selected script
  const scriptNames = {
    bash: 'statusline.sh',
    python: 'statusline.py',
    powershell: 'statusline.ps1',
  };

  return path.join(CENTRAL_DIR, scriptNames[scriptType] || scriptNames.bash);
}

/**
 * Generate setup report
 */
function generateReport(config) {
  const { osType, hasJq, hasPython, scriptType, scriptPath, shellRcPath } = config;

  console.log(`\n${colors.bold}${colors.cyan}AICodePath Statusline Setup${colors.reset}\n`);
  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // System info
  console.log(`${colors.bold}System Information:${colors.reset}`);
  console.log(`  OS:        ${osType}`);
  console.log(
    `  jq:        ${hasJq ? colors.green + '✓ installed' : colors.yellow + '✗ not found'}${colors.reset}`
  );
  console.log(
    `  Python:    ${hasPython ? colors.green + '✓ installed' : colors.yellow + '✗ not found'}${colors.reset}`
  );
  console.log(`  Script:    ${scriptType}`);
  console.log('');

  // Warnings
  if (!hasJq && scriptType === 'bash') {
    console.log(
      `${colors.yellow}⚠ Warning: jq not found. Install jq for bash statusline:${colors.reset}`
    );
    if (osType === 'macos') {
      console.log(`  ${colors.dim}brew install jq${colors.reset}`);
    } else if (osType === 'linux' || osType === 'wsl') {
      console.log(`  ${colors.dim}sudo apt install jq  # Debian/Ubuntu${colors.reset}`);
      console.log(`  ${colors.dim}sudo dnf install jq  # Fedora${colors.reset}`);
    }
    console.log(
      `  ${colors.dim}Or use --script-type=python for jq-free operation${colors.reset}\n`
    );
  }

  // Installation paths
  console.log(`${colors.bold}Installation:${colors.reset}`);
  console.log(`  Script:    ${scriptPath}`);
  console.log(`  Shell RC:  ${shellRcPath}`);
  console.log('');

  // Usage instructions (settings.json is written automatically by main())
  console.log(`${colors.bold}Quick Start:${colors.reset}`);
  console.log(`  1. Restart Claude Code (or send one message to trigger an update)`);
  console.log(`  2. The two-line statusline will appear at the bottom of your terminal`);
  console.log('');

  // Features
  console.log(`${colors.bold}Statusline Features:${colors.reset}`);
  console.log(`  ${colors.cyan}[ Claude: Model ]${colors.reset}     Active Claude model`);
  console.log(`  ${colors.green}[ ████░░ 60% ]${colors.reset}       Context token usage`);
  console.log(`  ${colors.cyan}[ CONSTRUCTION ]${colors.reset}     AICodePath workflow phase`);
  console.log(`  ${colors.bold}${'\x1b[35m'}[ main ]${colors.reset}             Git branch`);
  console.log(`  ${'\x1b[38;5;208m'}[ project ]${colors.reset}          Project name`);
  console.log('');
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);
  const installCentralFlag = args.includes('--install-central');

  // Parse script type argument
  let requestedScriptType = null;
  const scriptTypeArg = args.find((a) => a.startsWith('--script-type='));
  if (scriptTypeArg) {
    requestedScriptType = scriptTypeArg.split('=')[1];
  }

  // Detect environment
  const osType = detectOS();
  const hasJq = checkJq();
  const hasPython = checkPython();

  // Determine script type
  const scriptType = requestedScriptType || getRecommendedScript(osType, hasJq, hasPython);

  // Get script path
  let scriptPath;
  if (installCentralFlag) {
    scriptPath = installCentral(scriptType);
    console.log(`${colors.green}✓ Scripts installed to ${CENTRAL_DIR}${colors.reset}`);
  } else {
    // Use project-local scripts
    const scriptNames = {
      bash: 'statusline.sh',
      python: 'statusline.py',
      powershell: 'statusline.ps1',
    };
    scriptPath = path.join(PROJECT_DIR, '.aicodepath', 'scripts', scriptNames[scriptType] || scriptNames.bash);
  }

  // Get shell RC path
  const shellRcPath = getShellRcPath(osType);

  // Write statusLine into ~/.claude/settings.json automatically
  const claudeSettingsPath = writeClaudeSettings(scriptPath);
  console.log(`${colors.green}✓ settings.json updated: ${claudeSettingsPath}${colors.reset}`);
  console.log(`${colors.dim}  statusLine.command → ${scriptPath}${colors.reset}\n`);

  // Generate report
  generateReport({
    osType,
    hasJq,
    hasPython,
    scriptType,
    scriptPath,
    shellRcPath,
  });

  // Output JSON for programmatic use
  if (args.includes('--json')) {
    const output = {
      os: osType,
      dependencies: { jq: hasJq, python: hasPython },
      scriptType,
      scriptPath,
      shellRcPath,
      settings: generateClaudeSettings(scriptPath),
    };
    console.log(JSON.stringify(output, null, 2));
  }
}

main();
