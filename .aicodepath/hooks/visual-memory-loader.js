#!/usr/bin/env node
/**
 * Visual Memory Loader Hook
 * Loads visual diagrams into Claude Code context at session start
 *
 * Features:
 * - Dynamic token budget calculation
 * - Relevance-based diagram selection
 * - Context-aware prioritization
 * - Automatic staleness checking
 *
 * This hook writes schema and ER diagram context to .claude/rules/schema-context.md
 * so Claude Code natively auto-loads it when editing data-layer files.
 *
 * Note: appendToSystemPrompt is NOT a valid Claude Code hook field.
 * The valid mechanism for SessionStart is to write path-specific rule files
 * that Claude Code loads natively, and return a systemMessage for user feedback.
 *
 * @module hooks/visual-memory-loader
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const VisualMemoryQuery = require('../lib/visual-memory-query');
const VisualMemoryWriter = require('../lib/visual-memory-writer');

/**
 * Main hook function for SessionStart
 * @param {Object} context - Hook context from Claude Code
 */
async function hook(context = {}) {
  const projectRoot = findProjectRoot(process.cwd());
  const memoryDir = path.join(projectRoot, 'aicodepath-docs', 'memory');

  // Check if visual memory is initialized
  if (!fs.existsSync(memoryDir) || !fs.existsSync(path.join(memoryDir, 'index.json'))) {
    // Visual memory not initialized yet - skip silently
    return {
      success: true,
      message: '',
    };
  }

  const query = new VisualMemoryQuery(projectRoot);

  try {
    // Calculate dynamic token budget
    const tokenBudget = query.calculateTokenBudget({
      usedTokens: context.usedTokens || 0,
      reservePercent: 70 // Reserve 70% for code and conversation
    });

    // Get relevant diagrams based on context.
    // ER and class diagrams are excluded from session start to save tokens:
    // - ER diagrams are served on-demand via .claude/rules/schema-context.md (path-scoped rule)
    // - Class diagrams are large and rarely needed upfront
    const contextInfo = buildContextInfo(context, projectRoot);
    const result = query.getDiagramsForContext({
      tokenBudget,
      context: contextInfo,
      includeStale: false,
      minRelevance: 10,
      maxDiagrams: 10,
      excludeTypes: ['er', 'class', 'c4']
    });

    query.close();

    if (result.diagrams.length === 0) {
      return {
        success: true,
        message: '',
      };
    }

    // Format diagrams content
    const diagramContent = formatDiagramsForPrompt(result);

    // Write ER diagrams to .claude/rules/schema-context.md for native loading
    writeSchemaContextRule(projectRoot, result, diagramContent);

    // Build status message
    const statusMessage = buildStatusMessage(result);

    return {
      success: true,
      message: statusMessage,
      metadata: {
        diagramsLoaded: result.diagrams.length,
        tokensUsed: result.metadata.tokensUsed,
        tokenBudget: result.metadata.tokenBudget
      }
    };

  } catch (error) {
    query.close();
    return {
      success: false,
      error: error.message,
      message: `Visual Memory loading failed: ${error.message}`,
    };
  }
}

/**
 * Write ER diagram content to .claude/rules/schema-context.md
 * This ensures Claude Code natively loads schema context when editing data-layer files.
 *
 * @param {string} projectRoot - Project root directory
 * @param {Object} result - Diagram query result
 * @param {string} diagramContent - Formatted diagram content
 */
function writeSchemaContextRule(projectRoot, result, diagramContent) {
  try {
    // Only write if we have ER diagrams
    const erDiagrams = result.diagrams.filter(d => d.diagram_type === 'er');
    if (erDiagrams.length === 0) return;

    const rulesDir = path.join(projectRoot, '.claude', 'rules');
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }

    // Build ER-specific content for schema context
    const lines = [];
    lines.push('---');
    lines.push('paths:');
    lines.push('  - "src/**/repositories/**"');
    lines.push('  - "src/**/models/**"');
    lines.push('  - "src/**/entities/**"');
    lines.push('  - "src/**/queries/**"');
    lines.push('  - "src/**/dao/**"');
    lines.push('  - "src/**/mappers/**"');
    lines.push('  - "src/**/controllers/**"');
    lines.push('  - "**/*.repository.*"');
    lines.push('  - "**/*.model.*"');
    lines.push('  - "**/*.entity.*"');
    lines.push('  - "**/*.query.*"');
    lines.push('  - "**/*.prisma"');
    lines.push('  - "**/migrations/**"');
    lines.push('---');
    lines.push('');
    lines.push('# Database Schema Reference');
    lines.push('');
    lines.push('IMPORTANT: When writing data-layer code, you MUST use ONLY the tables and');
    lines.push('columns defined below. Do NOT invent or assume column names.');
    lines.push('');

    for (const diagram of erDiagrams) {
      lines.push(`## ${diagram.title}`);
      lines.push('');

      if (diagram.description) {
        lines.push(diagram.description);
        lines.push('');
      }

      let content = diagram.mermaid_content;
      if (Buffer.isBuffer(content)) content = content.toString('utf8');
      if (content && typeof content === 'string') {
        lines.push('```mermaid');
        lines.push(content);
        lines.push('```');
        lines.push('');
      }
    }

    const cachePath = path.join(rulesDir, 'schema-context.md');
    fs.writeFileSync(cachePath, lines.join('\n'), 'utf8');
  } catch {
    // Non-critical - schema-context-hook.js will handle discovery as fallback
  }
}

/**
 * Build context information from session state
 */
function buildContextInfo(context, projectRoot) {
  const contextInfo = {
    files: [],
    keywords: [],
    currentUnit: null,
    diagramTypes: []
  };

  // Extract context from working directory
  const cwd = context.cwd || process.cwd();
  const relativeCwd = path.relative(projectRoot, cwd);

  // If we're in a unit directory, extract unit name
  const unitMatch = relativeCwd.match(/src[\\/]([^[\\/]+)/);
  if (unitMatch) {
    contextInfo.currentUnit = unitMatch[1];
    contextInfo.keywords.push(unitMatch[1]);
  }

  // Add common keywords based on directory
  if (relativeCwd.includes('auth')) {
    contextInfo.keywords.push('auth', 'authentication', 'security');
    contextInfo.diagramTypes.push('sequence');
  }
  if (relativeCwd.includes('database') || relativeCwd.includes('db')) {
    contextInfo.keywords.push('database', 'schema', 'data');
    contextInfo.diagramTypes.push('er');
  }
  if (relativeCwd.includes('api') || relativeCwd.includes('controller')) {
    contextInfo.keywords.push('api', 'endpoint', 'service');
    contextInfo.diagramTypes.push('sequence', 'flowchart');
  }
  if (relativeCwd.includes('model') || relativeCwd.includes('entity')) {
    contextInfo.keywords.push('model', 'entity', 'domain');
    contextInfo.diagramTypes.push('class', 'er');
  }

  // Extract recently modified files (if available from context)
  if (context.recentFiles) {
    contextInfo.files = context.recentFiles;
  }

  return contextInfo;
}

/**
 * Format diagrams for system prompt injection
 */
function formatDiagramsForPrompt(result) {
  const lines = [];

  lines.push('');
  lines.push('# Visual Memory - Architecture Context');
  lines.push('');
  lines.push('The following diagrams provide visual context about the codebase architecture.');
  lines.push(`Loaded ${result.diagrams.length} diagram(s) using ${result.metadata.tokensUsed}/${result.metadata.tokenBudget} available tokens.`);
  lines.push('');

  // Group by type for better organization
  const byType = {};
  for (const diagram of result.diagrams) {
    const type = diagram.diagram_type;
    if (!byType[type]) byType[type] = [];
    byType[type].push(diagram);
  }

  // Add diagrams by type
  for (const [type, diagrams] of Object.entries(byType)) {
    lines.push(`## ${capitalize(type)} Diagrams`);
    lines.push('');

    for (const diagram of diagrams) {
      lines.push(`### ${diagram.title}`);

      if (diagram.description) {
        lines.push(diagram.description);
        lines.push('');
      }

      // Add metadata
      lines.push(`*Scope: ${diagram.scope}${diagram.unit_name ? ` (${diagram.unit_name})` : ''} | Confidence: ${Math.round(diagram.confidence * 100)}% | Priority: ${diagram.priority}*`);
      lines.push('');

      // Add diagram (guard against Buffer/null from DB)
      let content = diagram.mermaid_content;
      if (Buffer.isBuffer(content)) content = content.toString('utf8');
      if (!content || typeof content !== 'string') continue;

      lines.push('```mermaid');
      lines.push(content);
      lines.push('```');
      lines.push('');

      // Add source files reference
      const sourceFiles = JSON.parse(diagram.source_files || '[]');
      if (sourceFiles.length > 0) {
        lines.push(`*Source files: ${sourceFiles.slice(0, 3).join(', ')}${sourceFiles.length > 3 ? '...' : ''}*`);
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('**How to use these diagrams:**');
  lines.push('- Reference these diagrams when discussing architecture');
  lines.push('- Update diagrams when making structural changes');
  lines.push('- Keep diagrams synchronized with code changes');
  lines.push('');

  return lines.join('\n');
}

/**
 * Build status message for user
 */
function buildStatusMessage(result) {
  const lines = ['Visual Memory Loaded'];

  if (result.diagrams.length > 0) {
    lines.push(`  ✓ ${result.diagrams.length} diagram(s) loaded`);
    lines.push(`  ✓ ${result.metadata.tokensUsed}/${result.metadata.tokenBudget} tokens used`);

    // Group by type
    const byType = {};
    for (const diagram of result.diagrams) {
      const type = diagram.diagram_type;
      byType[type] = (byType[type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(byType)) {
      lines.push(`    • ${count} ${type} diagram${count > 1 ? 's' : ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Export for Claude Code hooks system
module.exports = { hook };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(hook, { name: 'visual-memory-loader' });
}
