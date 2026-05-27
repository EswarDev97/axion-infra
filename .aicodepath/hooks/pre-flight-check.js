#!/usr/bin/env node
/**
 * AICodePath Pre-Flight Check
 *
 * Verifies plugin installation and MCP server availability before workflow execution.
 * This script is intended to be run directly or as part of a pre-workflow skill.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { templates } = require('../lib/path-resolver');
const logger = require('../lib/logger');
const ErrorHandler = require('../lib/error-handler');
const { ConfigurationError, FileSystemError } = require('../lib/errors');

// CLAUDE.md template path (relative to project root)
const CLAUDE_MD_TEMPLATE = 'templates/CLAUDE.md.template';

// Required plugins for AICodePath workflow (per README)
const REQUIRED_PLUGINS = [
  { id: 'frontend-design@claude-plugins-official', purpose: 'UI component generation' },
  { id: 'github@claude-plugins-official', purpose: 'GitHub integration' },
  { id: 'context7@claude-plugins-official', purpose: 'Context management' },
  { id: 'code-review@claude-plugins-official', purpose: 'Code review automation' },
  { id: 'commit-commands@claude-plugins-official', purpose: 'Git commit management' },
  { id: 'feature-dev@claude-plugins-official', purpose: '7-phase feature development workflow' },
  {
    id: 'pr-review-toolkit@claude-plugins-official',
    purpose: 'Comprehensive PR analysis with 6 specialized agents',
  },
];

// Code intelligence plugins (language-specific - auto-detected)
const CODE_INTELLIGENCE_PLUGINS = {
  typescript: {
    id: 'typescript@claude-plugins-official',
    purpose: 'TypeScript/JavaScript code intelligence',
    indicators: ['tsconfig.json', 'package.json', '*.ts', '*.tsx', '*.js', '*.jsx'],
  },
  python: {
    id: 'python@claude-plugins-official',
    purpose: 'Python code intelligence',
    indicators: ['requirements.txt', 'setup.py', 'pyproject.toml', '*.py'],
  },
  go: {
    id: 'go@claude-plugins-official',
    purpose: 'Go code intelligence',
    indicators: ['go.mod', 'go.sum', '*.go'],
  },
  rust: {
    id: 'rust@claude-plugins-official',
    purpose: 'Rust code intelligence',
    indicators: ['Cargo.toml', 'Cargo.lock', '*.rs'],
  },
};

// Optional plugins that enhance the workflow (per README)
const OPTIONAL_PLUGINS = [
  { id: 'linear@claude-plugins-official', purpose: 'Issue tracking integration' },
  { id: 'agent-sdk-dev@claude-plugins-official', purpose: 'Agent SDK support' },
  { id: 'serena@claude-plugins-official', purpose: 'Code analysis' },
  { id: 'hookify@claude-plugins-official', purpose: 'Dynamic rule creation without coding' },
  { id: 'ralph-loop@claude-plugins-official', purpose: 'Autonomous TDD-driven development loops' },
  { id: 'plugin-dev@claude-plugins-official', purpose: 'Plugin development toolkit' },
  {
    id: 'learning-output-style@claude-plugins-official',
    purpose: 'Educational mode with active participation',
  },
  {
    id: 'explanatory-output-style@claude-plugins-official',
    purpose: 'Code explanation and insights mode',
  },
];

// Optional MCP servers with their capabilities (per README - not required)
const OPTIONAL_MCP_SERVERS = {
  playwright: {
    purpose: 'Browser automation for testing',
    capabilities: [
      'browser_navigate',
      'browser_click',
      'browser_screenshot',
      'browser_fill',
      'browser_type',
      'browser_evaluate',
    ],
    installCommand: 'npx @playwright/mcp',
    config: {
      command: 'npx',
      args: ['@playwright/mcp'],
    },
  },
};

/**
 * Read and parse JSON file safely
 */
async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Check if CLAUDE.md exists and has content
 */
async function checkClaudeMd(projectPath = process.cwd()) {
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  try {
    const stats = await fs.stat(claudeMdPath);
    if (stats.isFile() && stats.size > 10) {
      return { exists: true, path: claudeMdPath, size: stats.size };
    }
    return { exists: false, path: claudeMdPath, size: stats.size, reason: 'empty' };
  } catch (error) {
    return { exists: false, path: claudeMdPath, size: 0, reason: 'missing' };
  }
}

/**
 * Generate CLAUDE.md from template
 */
async function generateClaudeMd(projectPath = process.cwd()) {
  const templatePath = path.join(templates(), 'CLAUDE.md.template');
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  try {
    // Read template
    const template = await fs.readFile(templatePath, 'utf8');

    // Get project info from package.json if available
    const packageJson = await readJsonFile(path.join(projectPath, 'package.json'));
    const projectName = packageJson?.name || path.basename(projectPath);

    // Get CR number from context-state if available
    const contextState = await readJsonFile(
      path.join(projectPath, 'aicodepath-docs', 'context-state.json')
    );
    const crNumber = contextState?.crNumber || 'N/A';

    // Current date
    const now = new Date().toISOString().split('T')[0];

    // Substitute placeholders
    const content = template
      .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
      .replace(/\{\{CREATED_DATE\}\}/g, now)
      .replace(/\{\{CR_NUMBER\}\}/g, crNumber)
      .replace(/\{\{GENERATED_DATE\}\}/g, now);

    // Write CLAUDE.md
    await fs.writeFile(claudeMdPath, content, 'utf8');

    logger.info('Generated CLAUDE.md', { path: claudeMdPath });
    return { success: true, path: claudeMdPath };
  } catch (error) {
    logger.error('Failed to generate CLAUDE.md', {
      error: error.message,
      stack: error.stack,
      path: claudeMdPath
    });
    return { success: false, error: error.message };
  }
}

/**
 * Ensure CLAUDE.md exists, generate if missing
 */
async function ensureClaudeMd(projectPath = process.cwd()) {
  const check = await checkClaudeMd(projectPath);

  if (check.exists) {
    return { exists: true, generated: false, path: check.path };
  }

  logger.info('CLAUDE.md needs generation', {
    reason: check.reason,
    path: check.path
  });
  const result = await generateClaudeMd(projectPath);

  return {
    exists: result.success,
    generated: result.success,
    path: check.path,
    error: result.error,
  };
}

/**
 * Detect project languages based on file presence (safe implementation)
 */
async function detectProjectLanguages(projectPath = process.cwd()) {
  const detectedLanguages = [];

  for (const [lang, config] of Object.entries(CODE_INTELLIGENCE_PLUGINS)) {
    let langDetected = false;

    // Check for language indicators
    for (const indicator of config.indicators) {
      const isGlob = indicator.includes('*');

      try {
        if (isGlob) {
          // For glob patterns, check first-level files with matching extension
          const ext = indicator.replace('*.', '.');
          const files = await fs.readdir(projectPath);
          const hasMatchingFile = files.some((file) => file.endsWith(ext));

          if (hasMatchingFile) {
            detectedLanguages.push({ lang, plugin: config });
            langDetected = true;
            break;
          }
        } else {
          // Direct file check
          const indicatorPath = path.join(projectPath, indicator);
          await fs.access(indicatorPath);
          detectedLanguages.push({ lang, plugin: config });
          langDetected = true;
          break;
        }
      } catch {
        // Indicator not found, continue
      }
    }

    if (langDetected) continue;
  }

  return detectedLanguages;
}

/**
 * Check if plugins are installed
 */
async function checkPlugins(pluginList = REQUIRED_PLUGINS, projectPath = process.cwd()) {
  const results = {
    installed: [],
    missing: [],
  };

  // Check global settings — Claude Code stores settings at ~/.claude/settings.json
  // (fallback: ~/.config/claude-code/settings.json for older installs)
  const globalSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const globalSettingsPathLegacy = path.join(os.homedir(), '.config', 'claude-code', 'settings.json');
  const projectSettingsPath = path.join(projectPath, '.claude', 'settings.local.json');

  const globalSettings = await readJsonFile(globalSettingsPath) || await readJsonFile(globalSettingsPathLegacy);
  const projectSettings = await readJsonFile(projectSettingsPath);

  // Merge enabled plugins from both sources
  const enabledPlugins = new Set();

  if (globalSettings?.enabledPlugins) {
    if (Array.isArray(globalSettings.enabledPlugins)) {
      globalSettings.enabledPlugins.forEach((p) => enabledPlugins.add(p));
    } else if (typeof globalSettings.enabledPlugins === 'object') {
      Object.entries(globalSettings.enabledPlugins).forEach(([key, value]) => {
        if (value === true) enabledPlugins.add(key);
      });
    }
  }

  if (projectSettings?.enabledPlugins) {
    if (Array.isArray(projectSettings.enabledPlugins)) {
      projectSettings.enabledPlugins.forEach((p) => enabledPlugins.add(p));
    } else if (typeof projectSettings.enabledPlugins === 'object') {
      Object.entries(projectSettings.enabledPlugins).forEach(([key, value]) => {
        if (value === true) enabledPlugins.add(key);
      });
    }
  }

  // Check each required plugin
  for (const plugin of pluginList) {
    if (enabledPlugins.has(plugin.id)) {
      results.installed.push(plugin);
    } else {
      results.missing.push(plugin);
    }
  }

  return results;
}

/**
 * Check if AICodePath Knowledge Base is initialized
 */
async function checkKnowledgeBase(projectPath = process.cwd()) {
  const results = {
    initialized: false,
    dbPath: path.join(projectPath, 'aicodepath-docs', 'aicodepath.db'),
    dbExists: false,
    dbSizeBytes: 0,
    missingComponents: [],
  };

  try {
    const stats = await fs.stat(results.dbPath);
    results.dbExists = stats.isFile();
    results.dbSizeBytes = stats.size;
  } catch (e) {
    results.dbExists = false;
  }

  if (!results.dbExists || results.dbSizeBytes === 0) {
    results.missingComponents.push('aicodepath-docs/aicodepath.db');
  }

  results.initialized = results.dbExists && results.dbSizeBytes > 0;

  return results;
}

/**
 * Check if CI/CD lint tools are installed
 */
async function checkCILintTools(projectPath = process.cwd()) {
  const results = {
    detected: false,
    platform: null,
    installed: [],
    missing: [],
    installCommands: [],
  };

  try {
    // Dynamically load CI modules
    const { lib } = require('../lib/path-resolver');
    const ciLibPath = path.join(lib(), 'ci');
    const fs = require('fs');

    if (!fs.existsSync(ciLibPath)) {
      return results;
    }

    const configParser = require(path.join(ciLibPath, 'config-parser'));
    const packageEnforcer = require(path.join(ciLibPath, 'package-enforcer'));

    // Parse CI configuration
    const ciConfig = configParser.parseCIConfig(projectPath);

    if (!ciConfig.detected) {
      return results;
    }

    results.detected = true;
    results.platform = ciConfig.platform;

    // Check which linters are installed
    const check = packageEnforcer.checkCILinters(projectPath);

    results.installed = check.installed || [];
    results.missing = Object.values(check.missing || {}).flat();

    if (results.missing.length > 0) {
      results.installCommands = packageEnforcer.generateInstallCommands(check.missing);
    }

    return results;
  } catch (error) {
    // CI modules not available or error - not critical
    return results;
  }
}

/**
 * Check if MCP servers are configured
 */
async function checkMCPServers() {
  const results = {
    available: {},
    missing: {},
  };

  // Check MCP configuration
  const projectMcpPath = path.join(process.cwd(), '.claude', 'mcp-servers.json');
  const globalMcpPath = path.join(os.homedir(), '.claude', 'mcp-servers.json');

  const projectMcp = await readJsonFile(projectMcpPath);
  const globalMcp = await readJsonFile(globalMcpPath);

  // Merge MCP server configs
  const mcpServers = {
    ...(globalMcp?.servers || globalMcp?.mcpServers || {}),
    ...(projectMcp?.servers || projectMcp?.mcpServers || {}),
  };

  // Also check for direct server definitions
  if (globalMcp && !globalMcp.servers && !globalMcp.mcpServers) {
    Object.assign(mcpServers, globalMcp);
  }
  if (projectMcp && !projectMcp.servers && !projectMcp.mcpServers) {
    Object.assign(mcpServers, projectMcp);
  }

  // Check each optional MCP server
  for (const [serverName, serverInfo] of Object.entries(OPTIONAL_MCP_SERVERS)) {
    const serverConfig = mcpServers[serverName];

    if (serverConfig) {
      // Server is configured, assume capabilities are available
      // In a real implementation, you would verify capabilities via MCP protocol
      results.available[serverName] = {
        ...serverInfo,
        configured: true,
        capabilities: serverInfo.capabilities, // Assume all available if configured
      };
    } else {
      results.missing[serverName] = {
        ...serverInfo,
        configured: false,
      };
    }
  }

  return results;
}

/**
 * Generate remediation instructions
 */
function generateRemediationInstructions(
  pluginResults,
  mcpResults,
  kbResults = null,
  optionalPluginResults = null
) {
  const instructions = [];

  // Required plugins (no install/enable instructions)
  if (pluginResults.missing.length > 0) {
    instructions.push('\n## Missing Required Plugins\n');
    instructions.push('Workflow is blocked until these plugins are available:\n');
    for (const plugin of pluginResults.missing) {
      instructions.push(`- ${plugin.id}`);
    }
    instructions.push('\nSee `rules/common/mandatory-plugins.md` for managing required plugins.\n');
  }

  // Optional plugins (non-blocking)
  if (optionalPluginResults && optionalPluginResults.missing.length > 0) {
    instructions.push('\n## Optional Plugins Missing (Non-Blocking)\n');
    instructions.push('Optional plugins are not available:\n');
    for (const plugin of optionalPluginResults.missing) {
      instructions.push(`- ${plugin.id}`);
    }
    instructions.push('');
  }

  // MCP server setup (optional)
  if (Object.keys(mcpResults.missing).length > 0) {
    instructions.push('\n## MCP Servers Missing (Optional)\n');
    instructions.push('Optional MCP servers are not configured:\n');
    for (const serverName of Object.keys(mcpResults.missing)) {
      instructions.push(`- ${serverName}`);
    }
    instructions.push('\nWorkflow continues without these servers.\n');
  }

  // Knowledge Base setup
  if (kbResults && !kbResults.initialized) {
    instructions.push('\n## Knowledge Base Not Initialized\n');
    instructions.push('Initialize the AICodePath Knowledge Base:\n');
    instructions.push('```bash');
    instructions.push('./scripts/init-knowledge-base.sh');
    instructions.push('```\n');
    if (kbResults.missingComponents.length > 0) {
      instructions.push('Missing components:\n');
      for (const component of kbResults.missingComponents) {
        instructions.push(`- ${component}`);
      }
      instructions.push('');
    }
  }

  return instructions.join('\n');
}

/**
 * Format check results for display
 */
function formatResults(
  pluginResults,
  mcpResults,
  kbResults = null,
  optionalPluginResults = null,
  ciLintResults = null,
  codeIntelResults = null,
  detectedLanguages = []
) {
  const lines = [];

  lines.push('# AICodePath Pre-Flight Check Results\n');

  // Required plugin results
  lines.push('## Required Plugins\n');
  lines.push(`| Plugin | Status |`);
  lines.push(`|--------|--------|`);

  for (const plugin of pluginResults.installed) {
    lines.push(`| ${plugin.id} | ✓ Installed |`);
  }
  for (const plugin of pluginResults.missing) {
    lines.push(`| ${plugin.id} | ✗ Missing |`);
  }

  lines.push(
    `\n**Summary**: ${pluginResults.installed.length}/${REQUIRED_PLUGINS.length} plugins installed\n`
  );

  // Add installation instructions if plugins are missing
  if (pluginResults.missing.length > 0) {
    lines.push('📦 **How to install missing plugins:**\n');
    lines.push('1. Open Claude Code CLI');
    lines.push('2. Type `/plugins` to open the Plugins panel');
    lines.push('3. Search for and install the missing plugins listed above');
    lines.push('4. Plugins will be auto-enabled for this project via `.claude/settings.local.json`');
    lines.push('5. Restart Claude Code to activate\n');
  }

  // Code Intelligence plugin results
  if (codeIntelResults && detectedLanguages.length > 0) {
    lines.push('## Code Intelligence Plugins (Language-Specific)\n');
    lines.push(`**Detected Languages**: ${detectedLanguages.map((l) => l.lang).join(', ')}\n`);
    lines.push(`| Plugin | Status |`);
    lines.push(`|--------|--------|`);

    for (const plugin of codeIntelResults.installed) {
      lines.push(`| ${plugin.id} | ✓ Installed |`);
    }
    for (const plugin of codeIntelResults.missing) {
      lines.push(`| ${plugin.id} | ✗ Missing |`);
    }

    lines.push(
      `\n**Summary**: ${codeIntelResults.installed.length}/${detectedLanguages.length} code intelligence plugins installed\n`
    );

    if (codeIntelResults.missing.length > 0) {
      lines.push('\n💡 **Optional**: Install code intelligence plugins for better IDE features (go-to-definition, find-references, type checking).\n');
    }
  }

  // Optional plugin results
  if (optionalPluginResults) {
    lines.push('## Optional Plugins\n');
    lines.push(`| Plugin | Status |`);
    lines.push(`|--------|--------|`);

    for (const plugin of optionalPluginResults.installed) {
      lines.push(`| ${plugin.id} | ✓ Installed |`);
    }
    for (const plugin of optionalPluginResults.missing) {
      lines.push(`| ${plugin.id} | ✗ Missing |`);
    }

    lines.push(
      `\n**Summary**: ${optionalPluginResults.installed.length}/${OPTIONAL_PLUGINS.length} plugins installed\n`
    );
  }

  // MCP server results (optional)
  lines.push('## MCP Servers (Optional)\n');
  lines.push(`| Server | Status |`);
  lines.push(`|--------|--------|`);

  for (const [name, info] of Object.entries(mcpResults.available)) {
    lines.push(`| ${name} | ✓ Available |`);
  }
  for (const [name, info] of Object.entries(mcpResults.missing)) {
    lines.push(`| ${name} | ✗ Missing |`);
  }

  const totalMcp = Object.keys(OPTIONAL_MCP_SERVERS).length;
  const availableMcp = Object.keys(mcpResults.available).length;
  lines.push(`\n**Summary**: ${availableMcp}/${totalMcp} MCP servers available\n`);

  // Knowledge Base results
  if (kbResults) {
    lines.push('## Knowledge Base\n');
    lines.push(`| Component | Status |`);
    lines.push(`|-----------|--------|`);
    lines.push(`| Database | ${kbResults.dbExists ? '✓ Present' : '✗ Missing'} |`);
    lines.push(`\n**Status**: ${kbResults.initialized ? '✓ Initialized' : '✗ Not Initialized'}\n`);
  }

  // CI/CD Lint Tools results
  if (ciLintResults && ciLintResults.detected) {
    lines.push('## CI/CD Lint Tools\n');
    lines.push(`**Platform**: ${ciLintResults.platform}\n`);
    lines.push(`| Linter | Status |`);
    lines.push(`|--------|--------|`);

    for (const linter of ciLintResults.installed) {
      lines.push(`| ${linter} | ✓ Installed |`);
    }
    for (const linter of ciLintResults.missing) {
      lines.push(`| ${linter} | ✗ Missing |`);
    }

    const total = ciLintResults.installed.length + ciLintResults.missing.length;
    lines.push(`\n**Summary**: ${ciLintResults.installed.length}/${total} linters installed\n`);

    if (ciLintResults.missing.length > 0 && ciLintResults.installCommands.length > 0) {
      lines.push('**Install missing linters**:\n```bash');
      for (const cmd of ciLintResults.installCommands) {
        lines.push(cmd);
      }
      lines.push('```\n');
    }
  }

  return lines.join('\n');
}


/**
 * Check availability of Code Graph Python dependencies
 * (tree_sitter_language_pack, networkx, fastmcp).
 *
 * Reads AICODEPATH_PYTHON env var for the Python executable (default: 'python3').
 * Reads AICODEPATH_GRAPH_CHECK_SCRIPT env var to override the check script (for testing).
 *
 * @returns {Promise<{available: boolean, error?: string}>}
 */
async function checkGraphDependencies(projectPath) {
  const python = process.env.AICODEPATH_PYTHON || 'python3';
  const checkScript = process.env.AICODEPATH_GRAPH_CHECK_SCRIPT || null;

  return new Promise((resolve) => {
    const args = checkScript
      ? [checkScript]
      : ['-c', 'import tree_sitter_language_pack; import networkx; import fastmcp'];

    const opts = { timeout: 5000 };

    execFile(python, args, opts, (err, stdout, stderr) => {
      if (err) {
        const errorMsg = (stderr && stderr.trim()) || err.message || String(err);
        resolve({ available: false, error: errorMsg });
      } else {
        resolve({ available: true });
      }
    });
  });
}

/**
 * Main pre-flight check implementation
 */
async function runPreFlightCheckImpl(context = {}) {
  // Extract projectPath from context object or default to cwd
  // Prefer AICODEPATH_PROJECT_ROOT env var (set in hooks.json) so the hook
  // always resolves relative to the monorepo root, not the active subdirectory.
  const projectPath = typeof context === 'string'
    ? context
    : (process.env.AICODEPATH_PROJECT_ROOT || context.projectPath || context.cwd || process.cwd());

  logger.info('Running AICodePath Pre-Flight Check', { projectPath });

  // Check if we're in development mode (developing aicodepath-tool itself)
  // In dev mode, we skip strict blocking to allow development without all dependencies
  const isDevMode = process.env.AICODEPATH_DEV_MODE === 'true' ||
                     process.env.AICODEPATH_HOOK_DEV === 'true' ||
                     (typeof projectPath === 'string' && projectPath.includes('aicodepath-tool'));

  // Ensure CLAUDE.md exists (generate if missing)
  const claudeMdResult = await ensureClaudeMd(projectPath);
  if (claudeMdResult.error) {
    throw new FileSystemError(`Failed to ensure CLAUDE.md exists: ${claudeMdResult.error}`);
  }
  if (claudeMdResult.generated) {
    logger.info('CLAUDE.md generated successfully', {
      path: claudeMdResult.path
    });
  }

  // Check Code Graph Python dependencies (non-blocking warning)
  const graphDepsResult = await checkGraphDependencies(projectPath);
  if (!graphDepsResult.available) {
    logger.warn('Code graph dependencies missing', { error: graphDepsResult.error });
    console.log('⚠️  Code graph dependencies missing. Run: pip3 install -r .aicodepath/generators/requirements.txt\n');
  }

  // Fire-and-forget: index graph DB if empty (Task 15)
  triggerGraphIndexIfEmpty(projectPath).then((result) => {
    if (result.triggered) {
      logger.info('Code graph indexing triggered in background', { projectPath });
    }
  }).catch((err) => {
    logger.warn('Failed to trigger graph indexing', { error: err.message });
  });

  // Detect project languages and build code intelligence plugin requirements
  const detectedLanguages = await detectProjectLanguages(projectPath);
  const codeIntelligencePlugins = detectedLanguages.map((lang) => ({
    id: lang.plugin.id,
    purpose: lang.plugin.purpose,
  }));

  // Run checks
  const pluginResults = await checkPlugins(REQUIRED_PLUGINS, projectPath);
  const codeIntelResults = await checkPlugins(codeIntelligencePlugins, projectPath);
  const optionalPluginResults = await checkPlugins(OPTIONAL_PLUGINS, projectPath);
  const mcpResults = await checkMCPServers();
  const kbResults = await checkKnowledgeBase(projectPath);
  const ciLintResults = await checkCILintTools(projectPath);

  // Format results
  const resultsOutput = formatResults(
    pluginResults,
    mcpResults,
    kbResults,
    optionalPluginResults,
    ciLintResults,
    codeIntelResults,
    detectedLanguages
  );
  logger.info('Pre-flight check results', {
    requiredPlugins: {
      installed: pluginResults.installed.length,
      missing: pluginResults.missing.length,
      total: REQUIRED_PLUGINS.length
    },
    codeIntelligence: {
      detected: detectedLanguages.map(l => l.lang),
      installed: codeIntelResults.installed.length,
      missing: codeIntelResults.missing.length
    },
    knowledgeBase: {
      initialized: kbResults.initialized
    }
  });
  console.log(resultsOutput);

  // Check if all passed
  const pluginsOk = pluginResults.missing.length === 0;
  const codeIntelOk = codeIntelResults.missing.length === 0;
  const kbOk = kbResults.initialized;

  if (pluginsOk && kbOk) {
    console.log('\n✓ All pre-flight checks passed!\n');
    if (!codeIntelOk && codeIntelResults.missing.length > 0) {
      console.log('Note: Some code intelligence plugins are not installed (optional).\n');
    }
    if (Object.keys(mcpResults.missing).length > 0) {
      console.log('Note: Some MCP servers are not configured (optional).\n');
    }
    if (optionalPluginResults.missing.length > 0) {
      console.log('Note: Some optional plugins are not installed.\n');
    }
    if (ciLintResults.detected && ciLintResults.missing.length > 0) {
      console.log(
        'Warning: Some CI/CD lint tools are missing. Install them to prevent CI failures.\n'
      );
    }
    console.log('Ready to proceed with AICodePath workflow.\n');
    return {
      success: true,
      pluginResults,
      optionalPluginResults,
      mcpResults,
      kbResults,
      ciLintResults,
    };
  } else {
    console.log('\n✗ Pre-flight checks failed!\n');
    const remediation = generateRemediationInstructions(
      pluginResults,
      mcpResults,
      kbResults,
      optionalPluginResults
    );
    console.log(remediation);

    // In development mode (or when developing aicodepath-tool itself),
    // don't block - just warn and continue
    if (isDevMode) {
      console.log('\n⚠️  Development mode detected - continuing despite missing components.\n');
      console.log('Set AICODEPATH_DEV_MODE=false to enforce strict checks.\n');
      return {
        success: true, // Don't block in dev mode
        devMode: true,
        pluginResults,
        optionalPluginResults,
        mcpResults,
        kbResults,
        ciLintResults,
        remediation,
      };
    }

    console.log('\nPlease resolve missing required components and retry.\n');
    return {
      success: false,
      pluginResults,
      optionalPluginResults,
      mcpResults,
      kbResults,
      ciLintResults,
      remediation,
    };
  }
}

// Wrapped version for hook system
const runPreFlightCheck = ErrorHandler.wrapHook('pre-flight-check', runPreFlightCheckImpl);

// Export for use as module
module.exports = {
  runPreFlightCheck,
  runPreFlightCheckImpl, // Export impl for testing
  checkPlugins,
  checkMCPServers,
  checkKnowledgeBase,
  checkCILintTools,
  checkClaudeMd,
  ensureClaudeMd,
  generateClaudeMd,
  REQUIRED_PLUGINS,
  OPTIONAL_PLUGINS,
  OPTIONAL_MCP_SERVERS,
  checkGraphDependencies,
  triggerGraphIndexIfEmpty,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(runPreFlightCheckImpl, { name: 'pre-flight-check' });
}

// ─── Task 15: Auto-index graph DB at pre-flight when empty ───────────────────

/**
 * Trigger background codebase indexing if the graph DB is empty or missing.
 *
 * Uses fire-and-forget pattern (detached spawn + unref) — returns immediately
 * without waiting for the Python process to complete.
 *
 * @param {string} projectPath - Absolute path to the project root
 * @returns {Promise<{triggered: boolean, message: string}>}
 */
async function triggerGraphIndexIfEmpty(projectPath) {
  const { spawn } = require('child_process');
  const pathResolver = require('../lib/path-resolver');

  const dbPath = process.env.AICODEPATH_DB_PATH
    ? require('path').resolve(process.env.AICODEPATH_DB_PATH)
    : pathResolver.getDbPath(projectPath);

  // Check whether code_entities table has any rows
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    let count;
    try {
      count = db.prepare('SELECT COUNT(*) as n FROM code_entities').get().n;
    } finally {
      db.close();
    }
    if (count > 0) {
      return { triggered: false, message: 'Graph DB already populated' };
    }
  } catch (_dbErr) {
    // DB doesn't exist or table missing — fall through to trigger indexing
  }

  // Resolve the script path (allow override via env var for testing)
  const scriptPath = process.env.AICODEPATH_GRAPH_SCRIPT_OVERRIDE
    ? require('path').resolve(process.env.AICODEPATH_GRAPH_SCRIPT_OVERRIDE)
    : require('path').join(projectPath, '.aicodepath', 'generators', 'parsers', 'ast_parser.py');

  const python = process.env.AICODEPATH_PYTHON || 'python3';

  // Fire-and-forget: spawn detached, unref so the parent process does not wait
  const child = spawn(python, [scriptPath, '--index', projectPath, '--db-path', dbPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return { triggered: true, message: 'Graph indexing started in background' };
}
