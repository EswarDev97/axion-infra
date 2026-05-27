#!/usr/bin/env node
/**
 * Automatic Workflow Router
 *
 * Automatically routes to appropriate AIDLC phase after preflight passes.
 * Detects project type (brownfield/greenfield) and starts at correct entry point.
 *
 * Flow:
 * 1. Preflight passes
 * 2. Check for existing workflow state
 * 3. If no state: detect project type
 * 4. Route to appropriate phase:
 *    - Greenfield → PRE-FLIGHT (requirements)
 *    - Brownfield → INCEPTION (reverse engineering or requirements)
 * 5. Create initial state file
 * 6. Load phase-specific context
 *
 * @module lib/auto-workflow-router
 */

const fs = require('fs');
const path = require('path');
const { detectProjectType, determineStartingPhase } = require('./project-type-detector');
const logger = require('./logger');

/**
 * Skill routing exclusion map.
 *
 * Prevents false skill matches when a user message contains ambiguous terms.
 * Each key is a skill/phase name; values are keyword arrays that disqualify
 * auto-routing to that skill even if the primary trigger matches.
 *
 * Example: "implement a plan to visit friends" should NOT trigger
 * aicodepath-implement — the word "plan" in the exclusion list blocks it.
 *
 * Format: { skillName: [excludeKeyword, ...] }
 */
const EXCLUSION_KEYWORDS = {
  'aicodepath-implement': ['plan to', 'plan for visiting', 'plan for meeting', 'i plan to'],
  'aicodepath-tdd':       ['test the waters', 'testing the idea', 'test drive'],
  'aicodepath-brainstorm':['already brainstormed', 'skip brainstorm', 'no brainstorm'],
  'aicodepath-swarm':     ['bee swarm', 'insect swarm', 'swarm of'],
  'aicodepath-debug':     ['debug mode', 'debug-mode attached'],
  'aicodepath-release':   ['press release', 'news release', 'media release'],
  'aicodepath-work':      ['work out', 'workout', 'at work', 'going to work'],
  'INCEPTION':            ['inception movie', 'the inception', 'film inception'],
  'CONSTRUCTION':         ['under construction sign', 'construction paper', 'construction toy'],
};

/**
 * Check whether a user message should exclude routing to a particular skill/phase.
 *
 * @param {string} message       - User message or prompt text
 * @param {string} skillOrPhase  - Skill name or phase (key in EXCLUSION_KEYWORDS)
 * @returns {boolean} true if the route should be excluded (message is a false match)
 */
function shouldExcludeRoute(message, skillOrPhase) {
  const exclusions = EXCLUSION_KEYWORDS[skillOrPhase];
  if (!exclusions) return false;
  const lower = message.toLowerCase();
  return exclusions.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Filter a list of candidate skill names against exclusion keywords.
 *
 * @param {string[]} candidates - Skill names to check
 * @param {string}   message    - User message
 * @returns {string[]} Skills that are NOT excluded
 */
function filterExcludedRoutes(candidates, message) {
  return candidates.filter((skill) => !shouldExcludeRoute(message, skill));
}

/**
 * Check if workflow state already exists
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Object} State check result
 */
function checkExistingState(projectRoot) {
  const stateFilePath = path.join(projectRoot, 'aicodepath-docs', 'aicodepath-state.md');
  const exists = fs.existsSync(stateFilePath);

  if (exists) {
    try {
      const content = fs.readFileSync(stateFilePath, 'utf-8');
      const phaseMatch = content.match(/Current Phase\*{0,2}:\s*\*{0,2}\s*\*\*([^*]+)\*\*/);
      const stageMatch = content.match(/Current Stage\*{0,2}:\s*\*{0,2}\s*\*\*([^*]+)\*\*/);
      const typeMatch = content.match(/Project Type\*{0,2}:\s*\*{0,2}\s*\*\*([^*]+)\*\*/);

      return {
        exists: true,
        phase: phaseMatch ? phaseMatch[1] : null,
        stage: stageMatch ? stageMatch[1] : null,
        projectType: typeMatch ? typeMatch[1].toLowerCase() : null
      };
    } catch (err) {
      logger.error('Failed to read existing state', {
        context: 'auto-workflow-router',
        error: err.message
      });
      return { exists: false, phase: null, stage: null, projectType: null };
    }
  }

  return { exists: false, phase: null, stage: null, projectType: null };
}

/**
 * Create initial workflow state file
 *
 * @param {string} projectRoot - Project root directory
 * @param {Object} detection - Project type detection result
 * @param {Object} routing - Phase routing result
 * @returns {Object} Creation result
 */
function createInitialState(projectRoot, detection, routing) {
  const docsDir = path.join(projectRoot, 'aicodepath-docs');
  const stateFilePath = path.join(docsDir, 'aicodepath-state.md');

  try {
    // Ensure directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const stageLabel = routing.skipTo || 'initialization';

    const stateContent = `# AICodePath State Tracking

## Project Information
- **Project Type**: ${detection.type.charAt(0).toUpperCase() + detection.type.slice(1)}
- **Start Date**: ${timestamp}
- **Detection Confidence**: ${detection.confidence}%
- **Source Files Detected**: ${detection.sourceFiles}
- **Languages**: ${detection.languages.length > 0 ? detection.languages.join(', ') : 'None'}
- **Build Systems**: ${detection.buildSystems.length > 0 ? detection.buildSystems.join(', ') : 'None'}

## Current Workflow State
- **Current Phase**: **${routing.phase}**
- **Current Stage**: **${stageLabel}**
- **Reason**: ${routing.reason}

## Workflow History
### ${timestamp}
- Session started with automatic routing
- Detected ${detection.type} project (${detection.confidence}% confidence)
- Routed to ${routing.phase} phase

## Stage Progress
_Will be updated as workflow progresses_

---
*Last Updated: ${timestamp}*
*Automatic workflow routing enabled*
`;

    fs.writeFileSync(stateFilePath, stateContent, 'utf-8');

    logger.info('Initial state file created', {
      context: 'auto-workflow-router',
      path: stateFilePath,
      phase: routing.phase,
      type: detection.type
    });

    return {
      success: true,
      path: stateFilePath,
      phase: routing.phase,
      stage: stageLabel
    };
  } catch (err) {
    logger.error('Failed to create initial state file', {
      context: 'auto-workflow-router',
      error: err.message,
      stack: err.stack
    });

    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Load phase-specific context files
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} phase - Phase to load context for
 * @returns {Array<string>} List of loaded context file paths
 */
/**
 * Resolve a rule file path — project override takes precedence over framework.
 * Override location:  <projectRoot>/.aicodepath-overrides/rules/<relPath>
 * Framework fallback: <projectRoot>/.aicodepath/rules/<relPath>
 *
 * @param {string} projectRoot
 * @param {string} relPath - path relative to the rules/ directory (e.g. 'core/preamble.md')
 * @returns {string} absolute path to use
 */
function resolveRulePath(projectRoot, relPath) {
  const overridePath = path.join(projectRoot, '.aicodepath-overrides', 'rules', relPath);
  if (fs.existsSync(overridePath)) return overridePath;
  return path.join(projectRoot, '.aicodepath', 'rules', relPath);
}

function loadPhaseContext(projectRoot, phase) {
  const loadedFiles = [];

  // Always load preamble (override wins if present)
  if (fs.existsSync(resolveRulePath(projectRoot, 'core/preamble.md'))) {
    loadedFiles.push('rules/core/preamble.md');
  }

  // Load phase-specific file (override wins if present)
  const phaseFileName = phase.toLowerCase().replace(/\s+/g, '-');
  if (fs.existsSync(resolveRulePath(projectRoot, `core/${phaseFileName}.md`))) {
    loadedFiles.push(`rules/core/${phaseFileName}.md`);
  }

  // Load adaptive routing (override wins if present)
  if (fs.existsSync(resolveRulePath(projectRoot, 'core/adaptive-routing.md'))) {
    loadedFiles.push('rules/core/adaptive-routing.md');
  }

  logger.info('Phase context loaded', {
    context: 'auto-workflow-router',
    phase,
    filesLoaded: loadedFiles.length,
    files: loadedFiles
  });

  return loadedFiles;
}

/**
 * Generate routing summary message for user
 *
 * @param {Object} detection - Project type detection result
 * @param {Object} routing - Phase routing result
 * @param {Array<string>} contextFiles - Loaded context files
 * @returns {string} Formatted summary message
 */
function generateRoutingSummary(detection, routing, contextFiles) {
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('🧭 Automatic Workflow Routing');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  // Project type detection
  lines.push(`📦 Project Type: **${detection.type.toUpperCase()}**`);
  lines.push(`   Confidence: ${detection.confidence}%`);
  lines.push(`   Source Files: ${detection.sourceFiles}`);
  if (detection.languages.length > 0) {
    lines.push(`   Languages: ${detection.languages.join(', ')}`);
  }
  if (detection.buildSystems.length > 0) {
    lines.push(`   Build Systems: ${detection.buildSystems.join(', ')}`);
  }
  lines.push('');

  // Routing decision
  lines.push(`🎯 Starting Phase: **${routing.phase}**`);
  lines.push(`   ${routing.reason}`);
  if (routing.skipTo) {
    lines.push(`   Entry Point: ${routing.skipTo}`);
  }
  lines.push('');

  // Loaded context
  if (contextFiles.length > 0) {
    lines.push('📋 Loaded Workflow Context:');
    contextFiles.forEach(file => {
      lines.push(`   ✓ ${file}`);
    });
    lines.push('');
  }

  // Next steps
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('📍 Next Steps:');

  if (detection.type === 'greenfield') {
    lines.push('1. I\'ll help you gather requirements for your new project');
    lines.push('2. Tell me what you want to build or what problem to solve');
    lines.push('3. Example: "I want to build a REST API for a todo app"');
  } else {
    if (routing.skipTo === 'reverse-engineering') {
      lines.push('1. I\'ll analyze your existing codebase');
      lines.push('2. Document architecture and patterns');
      lines.push('3. Then proceed to requirements for new features');
    } else {
      lines.push('1. Existing codebase already documented');
      lines.push('2. Ready to gather requirements for new features');
      lines.push('3. Tell me what you want to add or improve');
    }
  }

  lines.push('───────────────────────────────────────────────────────────');
  lines.push('');

  return lines.join('\n');
}

/**
 * Execute automatic workflow routing
 *
 * Main entry point called after preflight passes.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Routing execution result
 */
function executeAutoRouting(projectRoot) {
  logger.info('Starting automatic workflow routing', {
    context: 'auto-workflow-router',
    projectRoot
  });

  try {
    // Step 1: Check for existing state
    const existingState = checkExistingState(projectRoot);

    if (existingState.exists) {
      logger.info('Existing workflow state found - skipping auto-routing', {
        context: 'auto-workflow-router',
        phase: existingState.phase,
        stage: existingState.stage,
        projectType: existingState.projectType
      });

      return {
        success: true,
        action: 'resume',
        message: 'Existing workflow state detected. Use /aicodepath-resume to continue.',
        state: existingState
      };
    }

    // Step 2: Detect project type
    const detection = detectProjectType(projectRoot);

    // Step 3: Determine starting phase
    const routing = determineStartingPhase(projectRoot, detection);

    // Step 4: Create initial state file
    const stateResult = createInitialState(projectRoot, detection, routing);

    if (!stateResult.success) {
      throw new Error(`Failed to create state file: ${stateResult.error}`);
    }

    // Step 5: Load phase-specific context
    const contextFiles = loadPhaseContext(projectRoot, routing.phase);

    // Step 6: Generate summary message
    const summary = generateRoutingSummary(detection, routing, contextFiles);

    logger.info('Automatic workflow routing completed', {
      context: 'auto-workflow-router',
      type: detection.type,
      phase: routing.phase,
      stateFile: stateResult.path
    });

    return {
      success: true,
      action: 'routed',
      projectType: detection.type,
      phase: routing.phase,
      stage: routing.skipTo || 'initialization',
      stateFile: stateResult.path,
      contextFiles,
      summary,
      detection,
      routing
    };
  } catch (err) {
    logger.error('Automatic workflow routing failed', {
      context: 'auto-workflow-router',
      error: err.message,
      stack: err.stack
    });

    return {
      success: false,
      action: 'failed',
      error: err.message,
      summary: `⚠️ Auto-routing failed: ${err.message}\nPlease use /aicodepath-init to manually initialize.`
    };
  }
}

module.exports = {
  executeAutoRouting,
  checkExistingState,
  createInitialState,
  loadPhaseContext,
  generateRoutingSummary,
  shouldExcludeRoute,
  filterExcludedRoutes,
  EXCLUSION_KEYWORDS,
};
