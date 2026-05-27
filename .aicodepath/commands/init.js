#!/usr/bin/env node

/**
 * Init Command - Initialize AICodePath in target project
 *
 * Sets up:
 * - .claude/settings.json with absolute paths to hooks (default mode)
 * - .claude/skills/ symlinks to .aicodepath/skills/
 * - .claude/agents/ symlinks to .aicodepath/agents/
 * - OR plugin mode (--plugin flag) for Claude Code plugin installation
 *
 * @module commands/init
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('../lib/path-resolver');
const { generateSettings } = require('../lib/settings-generator');
const { symlinkSkills, symlinkAgents } = require('../lib/symlink-manager');
const { generateMcpConfig } = require('../lib/mcp-config-generator');
const { generateEnvConfig } = require('../lib/env-generator');
const { buildStats } = require('../lib/stats-builder');
const { renderTemplates } = require('../lib/template-renderer');
const ErrorHandler = require('../lib/error-handler');
const logger = require('../lib/logger');
const { execSync, execFileSync } = require('child_process');


async function initCommandImpl() {
  // Check for --plugin flag
  const args = process.argv.slice(2);
  const pluginMode = args.includes('--plugin');

  if (pluginMode) {
    // Plugin installation mode
    console.log('AICodePath Plugin Installation Mode');
    console.log('====================================\n');
    console.log('To install AICodePath as a Claude Code plugin, run:\n');
    console.log('  claude plugin install .aicodepath/\n');
    console.log('This will:');
    console.log('  - Register aicodepath as a Claude Code plugin');
    console.log('  - Auto-configure hooks using ${CLAUDE_PLUGIN_ROOT}/');
    console.log('  - Make skills and agents available via plugin system');
    console.log('  - Enable seamless updates through plugin management\n');
    console.log('After installation, the plugin will be active in all your Claude Code sessions.');

    return {
      success: true,
      mode: 'plugin',
      message: 'Use: claude plugin install .aicodepath/'
    };
  }

  // Default symlink-based mode (backward compatibility)
  const projectRoot = pathResolver.findProjectRoot();
  const aicodePathRoot = pathResolver.getAicodePathRoot(projectRoot);

  if (!fs.existsSync(aicodePathRoot)) {
    throw new Error(`AICodePath installation not found at: ${aicodePathRoot}`);
  }

  // Detect monorepo scenario: git root differs from AICodePath root
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (gitRoot && path.resolve(gitRoot) !== path.resolve(projectRoot)) {
      console.log(`\nMonorepo detected: git root is ${gitRoot}`);
      console.log(`AICodePath root: ${projectRoot}`);
      console.log('Ensure .aicodepath/ is at the correct level.');
      console.log('Set AICODEPATH_PROJECT_ROOT in .env.aicodepath if needed.\n');
    }
  } catch (e) {
    // Not a git repo or git not available - skip detection
  }

  // Generate .claude/settings.json with absolute hook paths
  console.log('Generating .claude/settings.json...');
  const result = generateSettings(projectRoot);
  console.log(`Generated settings.json with ${result.pathsResolved} resolved hook paths`);
  console.log(`  Location: ${result.settingsPath}`);

  // Symlink skills to .claude/skills/
  console.log('\nLinking skills to .claude/skills/...');
  const skillsResult = symlinkSkills(projectRoot);
  console.log(`Linked ${skillsResult.skillCount} skills (${skillsResult.created} created, ${skillsResult.unchanged} unchanged)`);

  // Symlink agents to .claude/agents/
  console.log('Linking agents to .claude/agents/...');
  const agentsResult = symlinkAgents(projectRoot);
  console.log(`Linked ${agentsResult.agentCount} agents (${agentsResult.created} created, ${agentsResult.unchanged} unchanged)`);

  // Create aicodepath-docs directory for knowledge base
  const docsDir = path.join(projectRoot, 'aicodepath-docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
    console.log('Created aicodepath-docs/ directory');
  }
  const designDir = path.join(projectRoot, 'aicodepath-docs', 'design');
  if (!fs.existsSync(designDir)) {
    fs.mkdirSync(designDir, { recursive: true });
    console.log('Created aicodepath-docs/design/ directory');
  }
  const planDir = path.join(projectRoot, 'aicodepath-docs', 'plan');
  if (!fs.existsSync(planDir)) {
    fs.mkdirSync(planDir, { recursive: true });
    console.log('Created aicodepath-docs/plan/ directory');
  }
  const taskDir = path.join(projectRoot, 'aicodepath-docs', 'task');
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
    console.log('Created aicodepath-docs/task/ directory');
  }

  // Detect project type and route to appropriate AIDLC phase (runs once at init)
  console.log('\nDetecting project type and routing AIDLC workflow...');
  const { executeAutoRouting } = require('../lib/auto-workflow-router');
  const routingResult = executeAutoRouting(projectRoot);

  if (routingResult.success && routingResult.action === 'routed') {
    console.log(routingResult.summary);
    if (routingResult.projectType === 'brownfield') {
      try {
        const diagramScript = path.join(aicodePathRoot, 'scripts', 'generate-initial-diagrams.js');
        if (fs.existsSync(diagramScript)) {
          const dbPath = path.join(docsDir, 'aicodepath.db');
          if (fs.existsSync(dbPath)) {
            execFileSync(process.execPath, [diagramScript, '--project-root', projectRoot], {
              cwd: projectRoot,
              stdio: 'inherit'
            });
            console.log('Initial diagrams generated successfully');
          } else {
            console.log('Database not found — skipping diagram generation (run after database initialization)');
            logger.info('Skipping diagram generation: database not initialized yet', { context: 'init' });
          }
        } else {
          logger.warn(`Diagram generation script not found at ${diagramScript}`, { context: 'init' });
        }
      } catch (err) {
        logger.warn(`Initial diagram generation failed: ${err.message}`, { context: 'init' });
        console.log('Warning: Failed to generate initial diagrams (continuing anyway)');
      }
    }
  } else if (routingResult.action === 'resume') {
    console.log(`\nExisting AIDLC workflow state detected — skipping re-detection.`);
    console.log(`Current phase: ${routingResult.state.phase || 'unknown'}`);
    console.log('Use /aicodepath-resume to continue from where you left off.');
  } else {
    logger.warn('Auto-routing failed', { error: routingResult.error, context: 'init' });
    console.log(`Warning: Project type detection failed — ${routingResult.error}`);
    console.log('Continuing with manual workflow selection.');
  }


  // Generate .env.aicodepath with documented environment variables
  console.log('\nGenerating .env.aicodepath...');
  const envResult = generateEnvConfig(projectRoot);
  if (envResult.success) {
    if (envResult.created) {
      console.log(`Created .env.aicodepath at ${envResult.envPath}`);
      console.log('  Source in your shell: source .env.aicodepath');
    } else if (envResult.skipped) {
      console.log('.env.aicodepath already exists (skipped)');
    }
  } else {
    logger.warn('Env config generation failed', { error: envResult.error });
  }

  // Generate .mcp.json from config.json MCP server definitions
  console.log('\nGenerating .mcp.json...');
  try {
    const mcpResult = generateMcpConfig(projectRoot);
    if (mcpResult.success && mcpResult.serverCount > 0) {
      const mergeInfo = mcpResult.merged ? ' (merged with existing entries)' : '';
      console.log(`Generated .mcp.json with ${mcpResult.serverCount} MCP server entries${mergeInfo}`);
      console.log(`  Location: ${mcpResult.mcpPath}`);
    } else if (mcpResult.success && mcpResult.serverCount === 0) {
      console.log('No MCP servers defined, skipped .mcp.json generation');
    } else {
      logger.warn('MCP config generation had errors', { errors: mcpResult.errors });
      console.log('Warning: MCP config generation encountered errors (check logs)');
    }
  } catch (error) {
    // Non-blocking: MCP generation failure shouldn't prevent init
    logger.error('MCP config generation failed', {
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    console.log('Warning: Failed to generate .mcp.json (continuing anyway)');
  }

  // Bootstrap aicodepath-docs/preferences/project-preferences.json if missing
  console.log('\nBootstrapping preferences file...');
  let repoName = path.basename(projectRoot);
  try {
    repoName = execSync('git remote get-url origin', { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      .trim().split('/').pop().replace(/\.git$/, '') || repoName;
  } catch (_) { /* no remote — use directory name fallback */ }
  bootstrapPreferencesFile(projectRoot, repoName);

  // Render .tpl templates → .md docs (unless --no-render-docs)
  const noRenderDocs = args.includes('--no-render-docs');
  await renderDocs({ noRenderDocs, projectRoot });

  console.log('\nAICodePath initialization complete.');
  console.log('\nTips:');
  console.log('  - Edit .env.aicodepath to configure AICodePath behavior');
  console.log('  - Use `node .aicodepath/bin/aicodepath.js init --plugin` to see plugin installation instructions');

  return {
    success: true,
    mode: 'symlink',
    projectRoot,
    settingsPath: result.settingsPath,
    pathsResolved: result.pathsResolved,
    skillsLinked: skillsResult.skillCount,
    agentsLinked: agentsResult.agentCount,
    envCreated: envResult.created,
    envSkipped: envResult.skipped
  };
}

/**
 * Build stats and render .tpl templates to their .md output files.
 * Called by initCommandImpl unless --no-render-docs is passed.
 *
 * @param {object} [options]
 * @param {boolean} [options.noRenderDocs]  When true, skip rendering and return skipped=true
 * @param {string}  [options.projectRoot]   Override project root
 * @returns {Promise<{skipped:boolean}|{rendered:number}>}
 */
async function renderDocs(options = {}) {
  if (options.noRenderDocs) {
    logger.info('Skipping doc rendering (--no-render-docs)', { context: 'init' });
    return { skipped: true };
  }

  const projectRoot = options.projectRoot || pathResolver.findProjectRoot();
  console.log('\nRendering doc templates...');
  try {
    const stats = await buildStats({ projectRoot });
    await renderTemplates(stats, { projectRoot });
    console.log(`Rendered docs: ${stats.totals.agents} agents, ${stats.totals.skills} skills, ${stats.totals.hooks} hooks`);
    return { skipped: false, rendered: 4 };
  } catch (err) {
    logger.warn('Doc rendering failed (non-blocking)', { error: err.message, context: 'init' });
    console.log(`Warning: Doc rendering failed — ${err.message}`);
    return { skipped: false, rendered: 0, error: err.message };
  }
}

/**
 * Bootstrap aicodepath-docs/preferences/project-preferences.json with a v2.0 skeleton.
 * Idempotent — skips if the file already exists.
 * @param {string} projectRoot - Absolute path to the project root
 * @param {string} repoName - Repository name for the repo field
 */
function bootstrapPreferencesFile(projectRoot, repoName) {
  // Runtime artifacts go in aicodepath-docs/, never in .aicodepath/ (framework source)
  const prefsDir = path.join(projectRoot, 'aicodepath-docs', 'preferences');
  const prefsFile = path.join(prefsDir, 'project-preferences.json');

  if (fs.existsSync(prefsFile)) {
    console.log('aicodepath-docs/preferences/project-preferences.json already exists (skipped)');
    return;
  }

  if (!fs.existsSync(prefsDir)) {
    fs.mkdirSync(prefsDir, { recursive: true });
  }

  const now = new Date().toISOString();
  const skeleton = {
    version: '2.0',
    repo: repoName || '',
    created_at: now,
    updated_at: now,
    rules: [],
    signalHistory: [],
    statistics: { totalRules: 0, totalSignals: 0, sessionsAnalyzed: 0, lastSessionId: null },
  };

  fs.writeFileSync(prefsFile, JSON.stringify(skeleton, null, 2) + '\n', 'utf8');
  console.log('Created aicodepath-docs/preferences/project-preferences.json');
  logger.info('Preferences file bootstrapped', { context: 'init', repo: repoName });
}

module.exports = ErrorHandler.wrapCLICommand('init', initCommandImpl);
module.exports.bootstrapPreferencesFile = bootstrapPreferencesFile;
module.exports.renderDocs = renderDocs;

if (require.main === module) {
  module.exports()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
