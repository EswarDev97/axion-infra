#!/usr/bin/env node
/**
 * Documentation Phase Skill Suggester Hook
 *
 * Suggests appropriate skills when documentation is needed:
 * - aicodepath-readme-crafter: When README creation/update is needed
 *
 * Triggered: When README operations are detected or documentation is requested
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const ErrorHandler = require('../lib/error-handler');
const { FileSystemError } = require('../lib/errors');

/**
 * Get current phase from state file or database.
 * Returns the phase string (lowercase) or empty string if unknown.
 */
function getCurrentPhase(projectRoot) {
  // Try file first (fast path)
  const stateFile = path.join(projectRoot, 'aicodepath-docs', 'aicodepath-state.md');
  if (fs.existsSync(stateFile)) {
    try {
      const content = fs.readFileSync(stateFile, 'utf-8');
      const phaseMatch = content.match(/\*\*Phase\*\*:\s*([^\n*]+)/);
      if (phaseMatch) {
        return phaseMatch[1].toLowerCase();
      }
    } catch (err) { /* fall through to DB */ }
  }

  // Fallback: Read from database
  try {
    const { getDbPath } = require('../lib/path-resolver');
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) return '';
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT value FROM session_state WHERE key = ?').get('current_phase');
    db.close();
    if (!row) return '';
    const phase = JSON.parse(row.value);
    const phaseStr = (typeof phase === 'object' && phase._value) ? phase._value : phase;
    return String(phaseStr).toLowerCase();
  } catch (err) {
    return '';
  }
}

/**
 * Detect if README is being accessed
 */
function detectReadmeOperation(params) {
  if (!params || !params.file_path) return false;

  const filePath = params.file_path.toLowerCase();
  return filePath.endsWith('readme.md') ||
         filePath.endsWith('readme.txt') ||
         filePath.endsWith('readme');
}

/**
 * Check if README exists and when it was last updated
 */
function analyzeReadme(projectRoot) {
  const readmePath = path.join(projectRoot, 'README.md');

  if (!fs.existsSync(readmePath)) {
    return { exists: false, daysOld: null };
  }

  try {
    const stats = fs.statSync(readmePath);
    const content = fs.readFileSync(readmePath, 'utf-8');
    const daysOld = Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24));

    // Simple quality check - is it too short?
    const isTooShort = content.length < 500;

    return {
      exists: true,
      daysOld,
      isTooShort,
      lineCount: content.split('\n').length
    };
  } catch (err) {
    return { exists: false, daysOld: null };
  }
}

/**
 * Detect if user is asking about documentation
 */
function mentionsDocumentation(message) {
  if (!message) return false;

  const keywords = [
    'readme', 'documentation', 'document',
    'how to use', 'getting started', 'installation',
    'setup guide', 'user guide', 'docs'
  ];

  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Main hook implementation
 */
async function documentSkillSuggesterImpl(params) {
  const projectRoot = findProjectRoot(process.cwd());
  const suggestions = [];

  const isReadmeOp = detectReadmeOperation(params);
  const mentionsDocs = mentionsDocumentation(params.user_message);
  const readme = analyzeReadme(projectRoot);

  // Suggest README crafter if:
  // 1. README is being accessed
  // 2. User mentions documentation
  // 3. README doesn't exist
  // 4. README is too short (likely placeholder)

  if (isReadmeOp) {
    suggestions.push({
      skill: 'aicodepath-readme-crafter',
      reason: 'README detected - craft comprehensive documentation',
      command: '/aicodepath-readme-crafter',
      icon: '📖',
      priority: 'high'
    });
  } else if (mentionsDocs) {
    suggestions.push({
      skill: 'aicodepath-readme-crafter',
      reason: 'Documentation request detected - create professional README',
      command: '/aicodepath-readme-crafter',
      icon: '📖',
      priority: 'high'
    });
  } else if (!readme.exists) {
    suggestions.push({
      skill: 'aicodepath-readme-crafter',
      reason: 'No README found - create one for better project documentation',
      command: '/aicodepath-readme-crafter',
      icon: '📖',
      priority: 'medium'
    });
  } else if (readme.isTooShort) {
    suggestions.push({
      skill: 'aicodepath-readme-crafter',
      reason: `README is minimal (${readme.lineCount} lines) - enhance it`,
      command: '/aicodepath-readme-crafter',
      icon: '📖',
      priority: 'low'
    });
  }

  // Return suggestions if any
  if (suggestions.length > 0) {
    const message = formatSuggestions(suggestions);
    return {
      proceed: true,
      message,
      suggestions
    };
  }

  return { proceed: true };
}

/**
 * Format suggestions for display
 */
function formatSuggestions(suggestions) {
  const lines = [];

  lines.push('\n💡 Documentation Suggestion\n');

  suggestions.forEach((s, idx) => {
    lines.push(`${s.icon} **${s.skill}**`);
    lines.push(`${s.reason}`);
    lines.push(`Command: \`${s.command}\``);
    lines.push('');
  });

  lines.push('Good documentation helps users and contributors understand your project.\n');

  return lines.join('\n');
}

module.exports = {
  hook: ErrorHandler.wrapHook('document-skill-suggester', documentSkillSuggesterImpl)
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(documentSkillSuggesterImpl, { name: 'document-skill-suggester' });
}
