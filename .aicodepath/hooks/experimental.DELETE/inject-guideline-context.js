#!/usr/bin/env node

/**
 * SubagentStart Hook - Inject Guideline Context
 *
 * Injects guideline and rule context into subagents when they start.
 * Ensures subagents have access to project standards and best practices.
 *
 * Event: SubagentStart
 * Matchers: Agent type names (e.g., "code-reviewer", "Plan", "Explore")
 *
 * Date: 2026-02-03
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot, guidelines } = require('../lib/path-resolver');

/**
 * Guideline context by agent type
 */
const AGENT_GUIDELINES = {
  'code-reviewer': [
    'coding-standards.json',
    'architecture-rules.json',
    'security-rules.json'
  ],
  'security-engineer': [
    'security-rules.json',
    'api-design-rules.json'
  ],
  'backend-architect': [
    'architecture-rules.json',
    'api-design-rules.json',
    'data-modeling-rules.json'
  ],
  'frontend-architect': [
    'architecture-rules.json',
    'coding-standards.json'
  ],
  'database-architect': [
    'data-modeling-rules.json',
    'architecture-rules.json'
  ],
  'devops-architect': [
    'devops-rules.json',
    'security-rules.json'
  ],
  'Plan': [
    'architecture-rules.json',
    'coding-standards.json'
  ],
  'Explore': [
    'architecture-rules.json'
  ]
};

/**
 * SubagentStart hook handler
 */
async function hook(hookInput) {
  const { arguments: args = {}, matcher } = hookInput;
  const agentType = matcher || args.agentType || 'unknown';

  console.log(`\n[SubagentStart] Injecting context into: ${agentType}`);

  try {
    const projectRoot = findProjectRoot(__dirname);
    const context = {
      agentType,
      guidelines: [],
      rules: [],
      projectInfo: {}
    };

    // 1. Load relevant guidelines
    console.log('   📋 Loading guidelines...');
    context.guidelines = await loadGuidelines(projectRoot, agentType);

    // 2. Load relevant rules
    console.log('   📜 Loading rules...');
    context.rules = await loadRules(projectRoot, agentType);

    // 3. Load project info
    console.log('   📦 Loading project info...');
    context.projectInfo = await loadProjectInfo(projectRoot);

    // 4. Build context message for subagent
    const contextMessage = buildContextMessage(context);

    console.log(`✅ Context injected: ${context.guidelines.length} guidelines, ${context.rules.length} rules`);

    // Return additional context that Claude will provide to the subagent
    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: contextMessage
      }
    };

  } catch (error) {
    console.error(`⚠️  Context injection error: ${error.message}`);

    // Return minimal context on error
    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `Context injection warning: ${error.message}`
      }
    };
  }
}

/**
 * Load relevant guidelines for agent type
 */
async function loadGuidelines(projectRoot, agentType) {
  const guidelineFiles = AGENT_GUIDELINES[agentType] || [];
  const loadedGuidelines = [];

  for (const file of guidelineFiles) {
    const guidelinePath = path.join(projectRoot, guidelines(), file);

    if (fs.existsSync(guidelinePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(guidelinePath, 'utf8'));
        loadedGuidelines.push({
          file,
          category: content.metadata?.category || 'general',
          ruleCount: Object.keys(content.rules || {}).length
        });
      } catch (error) {
        console.warn(`   ⚠️  Failed to load ${file}: ${error.message}`);
      }
    }
  }

  return loadedGuidelines;
}

/**
 * Load relevant rules for agent type
 */
async function loadRules(projectRoot, agentType) {
  const rulesDir = path.join(projectRoot, '.aicodepath', 'rules');

  if (!fs.existsSync(rulesDir)) {
    return [];
  }

  const loadedRules = [];

  // Map agent types to rule categories
  const ruleCategories = {
    'code-reviewer': ['common'],
    'backend-architect': ['construction', 'inception'],
    'frontend-architect': ['construction'],
    'database-architect': ['construction'],
    'Plan': ['inception', 'construction'],
    'Explore': ['common']
  };

  const categories = ruleCategories[agentType] || ['common'];

  for (const category of categories) {
    const categoryPath = path.join(rulesDir, category);

    if (fs.existsSync(categoryPath)) {
      const ruleFiles = fs.readdirSync(categoryPath)
        .filter(f => f.endsWith('.md'));

      loadedRules.push({
        category,
        fileCount: ruleFiles.length
      });
    }
  }

  return loadedRules;
}

/**
 * Load project info
 */
async function loadProjectInfo(projectRoot) {
  const info = {
    root: projectRoot,
    hasDatabase: false,
    hasGuidelines: false
  };

  // Check for database
  const dbPath = path.join(projectRoot, 'aicodepath-docs', 'aicodepath.db');
  info.hasDatabase = fs.existsSync(dbPath);

  // Check for guidelines
  const guidelinesDir = path.join(projectRoot, guidelines());
  info.hasGuidelines = fs.existsSync(guidelinesDir);

  return info;
}

/**
 * Build context message for subagent
 */
function buildContextMessage(context) {
  let message = `## AICodePath Context for ${context.agentType}\n\n`;

  // Guidelines
  if (context.guidelines.length > 0) {
    message += `**Guidelines Available**:\n`;
    context.guidelines.forEach(g => {
      message += `- ${g.file}: ${g.ruleCount} rules (${g.category})\n`;
    });
    message += '\n';
  }

  // Rules
  if (context.rules.length > 0) {
    message += `**Workflow Rules Available**:\n`;
    context.rules.forEach(r => {
      message += `- ${r.category}: ${r.fileCount} rule files\n`;
    });
    message += '\n';
  }

  // Project info
  message += `**Project Info**:\n`;
  message += `- Root: ${context.projectInfo.root}\n`;
  message += `- Database: ${context.projectInfo.hasDatabase ? 'Available' : 'Not found'}\n`;
  message += `- Guidelines: ${context.projectInfo.hasGuidelines ? 'Loaded' : 'Not found'}\n`;

  message += '\nRefer to these guidelines and rules when making decisions.';

  return message;
}

module.exports = { hook };

// CLI support
if (require.main === module) {
  const testInput = {
    arguments: {},
    matcher: 'code-reviewer'
  };

  hook(testInput)
    .then(result => {
      console.log('\nHook Result:');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('Hook failed:', error);
      process.exit(1);
    });
}
