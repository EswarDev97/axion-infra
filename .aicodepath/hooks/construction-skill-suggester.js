#!/usr/bin/env node
/**
 * Construction Phase Skill Suggester Hook
 *
 * Suggests appropriate skills during the CONSTRUCTION phase:
 * - aicodepath-c4-architecture: After functional design is complete
 * - aicodepath-requirements: At start of construction for each unit
 * - aicodepath-naming-analyzer: During code validation
 *
 * Triggered: When entering CONSTRUCTION phase or when relevant artifacts are created
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const ErrorHandler = require('../lib/error-handler');
const { FileSystemError } = require('../lib/errors');

/**
 * Check if we're in construction phase.
 * Tries state file first (fast path), falls back to database.
 */
function isConstructionPhase(projectRoot) {
  // Try file first (fast path)
  const stateFile = path.join(projectRoot, 'aicodepath-docs', 'aicodepath-state.md');
  if (fs.existsSync(stateFile)) {
    try {
      const content = fs.readFileSync(stateFile, 'utf-8');
      const phaseMatch = content.match(/\*\*Phase\*\*:\s*([^\n*]+)/);
      if (phaseMatch) {
        return phaseMatch[1].toLowerCase().includes('construction');
      }
    } catch (err) { /* fall through to DB */ }
  }

  // Fallback: Read from database
  try {
    const { getDbPath } = require('../lib/path-resolver');
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) return false;
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT value FROM session_state WHERE key = ?').get('current_phase');
    db.close();
    if (!row) return false;
    const phase = JSON.parse(row.value);
    const phaseStr = (typeof phase === 'object' && phase._value) ? phase._value : phase;
    return String(phaseStr).toLowerCase().includes('construction');
  } catch (err) {
    return false;
  }
}

/**
 * Detect if functional design was just created.
 * Matches design docs by directory name or filename pattern.
 */
function detectFunctionalDesign(params) {
  if (!params || !params.file_path) return false;
  if (params.tool_name !== 'Write' && params.tool_name !== 'Edit') return false;

  const filePath = params.file_path.toLowerCase();
  return filePath.includes('/functional-design/') ||
         filePath.includes('/design/') ||
         filePath.includes('-design.md') ||
         filePath.includes('-spec.md') ||
         filePath.includes('-prd.md');
}

/**
 * Detect if code files are being written or edited
 */
function detectCodeGeneration(params) {
  if (!params || !params.file_path) return false;
  if (params.tool_name !== 'Write' && params.tool_name !== 'Edit') return false;

  const filePath = params.file_path;
  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.rb', '.php', '.cs', '.swift', '.kt'];
  const ext = path.extname(filePath);

  return codeExtensions.includes(ext);
}

/**
 * Detect SOLID violation risk signals in a file being written/edited.
 * Returns a suggestion if the file shows high SRP or coupling risk.
 *
 * Signals:
 * - File over 300 lines (SRP risk)
 * - File name contains 'Manager', 'Handler', 'Processor', or 'Util' (SRP smell)
 * - Content has switch/if-instanceof chains (OCP risk)
 *
 * @param {Object} params - Hook params (file_path, tool_name, content)
 * @returns {Object|null} Suggestion object or null
 */
function detectSolidRisk(params) {
  if (!params || !params.file_path) return null;
  if (params.tool_name !== 'Write' && params.tool_name !== 'Edit') return null;

  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.rb', '.php', '.cs', '.swift', '.kt'];
  if (!codeExtensions.includes(path.extname(params.file_path))) return null;

  const filePath = params.file_path;
  const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();

  // SRP smell: God-class name patterns
  const godClassPattern = /manager|handler|processor|util|helper|service/i;
  if (godClassPattern.test(fileName)) {
    return {
      skill: 'aicodepath-solid-principles',
      reason: `"${path.basename(filePath)}" name pattern suggests multiple responsibilities — verify SRP`,
      command: `/aicodepath-solid-principles --auto-scan ${filePath}`,
      icon: '🏗️',
      priority: 'medium'
    };
  }

  // OCP risk: switch on type patterns in content
  const content = params.content || params.new_string || '';
  if (content && /\bswitch\s*\(\s*\w*[Tt]ype\b|\bif\s*\(.*instanceof\b/.test(content)) {
    return {
      skill: 'aicodepath-solid-principles',
      reason: 'Type-switching pattern detected — may violate OCP (Open/Closed Principle)',
      command: `/aicodepath-solid-principles --auto-scan ${filePath}`,
      icon: '🏗️',
      priority: 'medium'
    };
  }

  return null;
}

/**
 * Check if a unit has architecture diagrams
 */
function hasArchitectureDiagrams(projectRoot, unitName) {
  if (!unitName) return false;

  const archDir = path.join(
    projectRoot,
    'aicodepath-docs',
    'construction',
    unitName,
    'architecture-design'
  );

  if (!fs.existsSync(archDir)) return false;

  try {
    const files = fs.readdirSync(archDir);
    return files.some(f => f.startsWith('c4-'));
  } catch (err) {
    return false;
  }
}

/**
 * Extract unit name from file path
 */
function extractUnitName(filePath) {
  const match = filePath.match(/construction\/([^/]+)\//);
  return match && match[1] !== 'cicd-design' && match[1] !== 'environment-strategy'
    ? match[1]
    : null;
}

/**
 * Check if requirements are missing for a unit
 */
function needsRequirements(projectRoot, unitName) {
  if (!unitName) return false;

  const prdsDir = path.join(projectRoot, 'aicodepath-docs', 'inception', 'requirements');

  if (!fs.existsSync(prdsDir)) return true;

  try {
    const files = fs.readdirSync(prdsDir);
    // Check if there's a PRD for this unit
    return !files.some(f =>
      f.toLowerCase().includes(unitName.toLowerCase()) &&
      f.endsWith('-prd.md')
    );
  } catch (err) {
    return true;
  }
}

/**
 * Main hook implementation
 */
async function constructionSkillSuggesterImpl(params) {
  const projectRoot = findProjectRoot(process.cwd());
  const inConstruction = isConstructionPhase(projectRoot);

  if (!inConstruction) {
    return { proceed: true };
  }

  const suggestions = [];

  // Check for functional design completion
  if (detectFunctionalDesign(params)) {
    const unitName = extractUnitName(params.file_path);
    const hasArchDiagrams = hasArchitectureDiagrams(projectRoot, unitName);

    if (!hasArchDiagrams && unitName) {
      suggestions.push({
        skill: 'aicodepath-c4-architecture',
        reason: `Functional design for ${unitName} is complete - visualize the architecture`,
        command: `/aicodepath-c4-architecture ${unitName}`,
        icon: '📐',
        priority: 'high'
      });
    }
  }

  // Check for code generation without requirements
  if (detectCodeGeneration(params)) {
    const unitName = extractUnitName(params.file_path);

    if (needsRequirements(projectRoot, unitName) && unitName) {
      suggestions.push({
        skill: 'aicodepath-requirements',
        reason: `Starting ${unitName} development - clarify requirements first`,
        command: `/aicodepath-requirements`,
        icon: '📋',
        priority: 'high'
      });
    }

    // Suggest naming analyzer for code quality
    suggestions.push({
      skill: 'aicodepath-naming-analyzer',
      reason: 'Code files detected - validate naming conventions',
      command: `/aicodepath-naming-analyzer`,
      icon: '🏷️',
      priority: 'medium'
    });

    // Check SOLID risk signals
    const solidSuggestion = detectSolidRisk(params);
    if (solidSuggestion) {
      suggestions.push(solidSuggestion);
    }
  }

  // Return suggestions if any
  if (suggestions.length > 0) {
    const message = formatSuggestions(suggestions);
    return {
      hookSpecificOutput: { additionalContext: message }
    };
  }

  return {};
}

/**
 * Format suggestions for display
 */
function formatSuggestions(suggestions) {
  const lines = [];

  lines.push('\n💡 Recommended Skills for This Phase\n');

  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');

  if (highPriority.length > 0) {
    lines.push('**High Priority:**\n');
    highPriority.forEach((s, idx) => {
      lines.push(`${idx + 1}. ${s.icon} **${s.skill}**`);
      lines.push(`   ${s.reason}`);
      lines.push(`   Command: \`${s.command}\``);
      lines.push('');
    });
  }

  if (mediumPriority.length > 0) {
    lines.push('**Optional:**\n');
    mediumPriority.forEach((s, idx) => {
      lines.push(`${idx + 1}. ${s.icon} **${s.skill}**`);
      lines.push(`   ${s.reason}`);
      lines.push(`   Command: \`${s.command}\``);
      lines.push('');
    });
  }

  lines.push('You can continue without these, but they may improve quality.\n');

  return lines.join('\n');
}

module.exports = {
  hook: ErrorHandler.wrapHook('construction-skill-suggester', constructionSkillSuggesterImpl)
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(constructionSkillSuggesterImpl, { name: 'construction-skill-suggester' });
}
