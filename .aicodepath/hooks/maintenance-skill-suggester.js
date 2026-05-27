#!/usr/bin/env node
/**
 * Maintenance Phase Skill Suggester Hook
 *
 * Suggests appropriate skills during the MAINTENANCE/OPERATIONS phase:
 * - aicodepath-dependency-updater: When dependencies are mentioned or periodically
 *
 * Note: aicodepath-reducing-entropy is manual-only (not suggested automatically)
 *
 * Triggered: When dependency-related operations are detected
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
 * Detect if dependency files are being accessed
 */
function detectDependencyOperation(params) {
  if (!params || !params.file_path) return false;

  const filePath = params.file_path.toLowerCase();
  const dependencyFiles = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'requirements.txt',
    'pipfile',
    'go.mod',
    'go.sum',
    'pom.xml',
    'build.gradle',
    'cargo.toml'
  ];

  return dependencyFiles.some(dep => filePath.endsWith(dep));
}

/**
 * Detect if user message mentions dependencies
 */
function mentionsDependencies(message) {
  if (!message) return false;

  const keywords = [
    'dependency', 'dependencies', 'update', 'upgrade',
    'npm', 'yarn', 'pip', 'cargo', 'maven', 'gradle',
    'package', 'version', 'outdated', 'security',
    'vulnerability', 'cve'
  ];

  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Check when dependencies were last updated
 */
function getDependencyUpdateAge(projectRoot) {
  const lockFiles = [
    'package-lock.json',
    'yarn.lock',
    'Pipfile.lock',
    'go.sum',
    'Cargo.lock'
  ];

  let mostRecentUpdate = 0;

  for (const lockFile of lockFiles) {
    const fullPath = path.join(projectRoot, lockFile);
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath);
        if (stats.mtimeMs > mostRecentUpdate) {
          mostRecentUpdate = stats.mtimeMs;
        }
      } catch (err) {
        // Ignore errors
      }
    }
  }

  if (mostRecentUpdate === 0) return null;

  const daysSinceUpdate = (Date.now() - mostRecentUpdate) / (1000 * 60 * 60 * 24);
  return Math.floor(daysSinceUpdate);
}

/**
 * Main hook implementation
 */
async function maintenanceSkillSuggesterImpl(params) {
  const projectRoot = findProjectRoot(process.cwd());
  const suggestions = [];

  // Check for dependency-related operations
  const isDependencyOp = detectDependencyOperation(params);
  const mentionsDeps = mentionsDependencies(params.user_message);
  const daysOld = getDependencyUpdateAge(projectRoot);

  // Suggest dependency updater if:
  // 1. Dependency files are being accessed
  // 2. User mentions dependencies
  // 3. Dependencies haven't been updated in 30+ days
  if (isDependencyOp || mentionsDeps) {
    suggestions.push({
      skill: 'aicodepath-dependency-updater',
      reason: 'Dependency-related operation detected - check for updates',
      command: '/aicodepath-dependency-updater',
      icon: '📦',
      priority: 'medium'
    });
  } else if (daysOld !== null && daysOld > 30) {
    suggestions.push({
      skill: 'aicodepath-dependency-updater',
      reason: `Dependencies haven't been updated in ${daysOld} days - consider updating`,
      command: '/aicodepath-dependency-updater',
      icon: '📦',
      priority: 'low'
    });
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

  lines.push('\n💡 Maintenance Suggestion\n');

  suggestions.forEach((s, idx) => {
    lines.push(`${s.icon} **${s.skill}**`);
    lines.push(`${s.reason}`);
    lines.push(`Command: \`${s.command}\``);
    lines.push('');
  });

  lines.push('This is optional - continue with your current task if preferred.\n');

  return lines.join('\n');
}

module.exports = {
  hook: ErrorHandler.wrapHook('maintenance-skill-suggester', maintenanceSkillSuggesterImpl)
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(maintenanceSkillSuggesterImpl, { name: 'maintenance-skill-suggester' });
}
