#!/usr/bin/env node
/**
 * Inception Phase Skill Suggester Hook
 *
 * Suggests appropriate skills during the INCEPTION phase:
 * - aicodepath-mental-model: When analyzing code changes or commits
 * - codebase-pattern-finder: When performing brownfield analysis
 *
 * Triggered: When entering INCEPTION phase or when relevant operations are detected
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const ErrorHandler = require('../lib/error-handler');
const { FileSystemError } = require('../lib/errors');

/**
 * Detect if this is a brownfield project
 */
function isBrownfieldProject(projectRoot) {
  // Check for existing code directories
  const codeIndicators = [
    'src', 'lib', 'app', 'server', 'client',
    'package.json', 'go.mod', 'requirements.txt', 'pom.xml'
  ];

  return codeIndicators.some(indicator => {
    const fullPath = path.join(projectRoot, indicator);
    return fs.existsSync(fullPath);
  });
}

/**
 * Check if git operations involving commits/diffs are happening
 */
function detectGitOperation(params) {
  if (!params || !params.tool_input) return null;

  const command = params.tool_input.command || '';

  // Detect git show, git diff, git log operations
  if (command.includes('git show') ||
      command.includes('git diff') ||
      command.includes('git log')) {
    return 'commit-analysis';
  }

  return null;
}

/**
 * Check if we're in inception phase.
 * Tries state file first (fast path), falls back to database.
 */
function isInceptionPhase(projectRoot) {
  // Try file first (fast path)
  const stateFile = path.join(projectRoot, 'aicodepath-docs', 'aicodepath-state.md');
  if (fs.existsSync(stateFile)) {
    try {
      const content = fs.readFileSync(stateFile, 'utf-8');
      const phaseMatch = content.match(/\*\*Phase\*\*:\s*([^\n*]+)/);
      if (phaseMatch) {
        return phaseMatch[1].toLowerCase().includes('inception');
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
    return String(phaseStr).toLowerCase().includes('inception');
  } catch (err) {
    return false;
  }
}

/**
 * Main hook implementation
 */
async function inceptionSkillSuggesterImpl(params) {
  const projectRoot = findProjectRoot(process.cwd());
  const isBrownfield = isBrownfieldProject(projectRoot);
  const inInception = isInceptionPhase(projectRoot);
  const gitOp = detectGitOperation(params);

  const suggestions = [];

  // Suggest mental-model for git operations during inception
  if (gitOp === 'commit-analysis' && inInception) {
    suggestions.push({
      skill: 'aicodepath-mental-model',
      reason: 'Understanding code changes is easier with mental models',
      command: '/aicodepath-mental-model',
      icon: '🧠'
    });
  }

  // Suggest codebase-pattern-finder for brownfield projects
  if (isBrownfield && inInception) {
    const reverseEngDir = path.join(projectRoot, 'aicodepath-docs', 'inception', 'reverse-engineering');

    if (!fs.existsSync(reverseEngDir)) {
      suggestions.push({
        skill: 'aicodepath-codebase-pattern-finder',
        reason: 'Brownfield project detected - analyze existing patterns',
        command: '/aicodepath-codebase-pattern-finder',
        icon: '🔍'
      });
    }

    // Suggest brownfield-readiness scan when RE artifacts exist but report hasn't been generated
    const readinessReportPath = path.join(projectRoot, 'aicodepath-docs', 'brownfield-readiness-report.md');
    if (fs.existsSync(reverseEngDir) && !fs.existsSync(readinessReportPath)) {
      suggestions.push({
        skill: 'aicodepath-brownfield-readiness',
        reason: 'RE complete — run AI-Readiness scan before first feature sprint',
        command: '/aicodepath-brownfield-readiness',
        icon: '🏥',
        priority: 'high'
      });
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

  lines.push('\n💡 Helpful Skills for This Phase\n');
  lines.push('The following skills can help you with this task:\n');

  suggestions.forEach((s, idx) => {
    lines.push(`${idx + 1}. ${s.icon} **${s.skill}**`);
    lines.push(`   ${s.reason}`);
    lines.push(`   Command: \`${s.command}\``);
    lines.push('');
  });

  lines.push('These are suggestions - feel free to continue without them.\n');

  return lines.join('\n');
}

module.exports = {
  hook: ErrorHandler.wrapHook('inception-skill-suggester', inceptionSkillSuggesterImpl)
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(inceptionSkillSuggesterImpl, { name: 'inception-skill-suggester' });
}
