#!/usr/bin/env node
/**
 * Monorepo Skill Suggester Hook
 *
 * PostToolUse hook that detects monorepo patterns and suggests:
 * - git-monorepo-config: During PRE-FLIGHT/INCEPTION when monorepo structure
 *   detected but services.yaml is missing
 * - gcp-monorepo-deploy: During OPERATIONS when services.yaml exists but
 *   cloudbuild.yaml is missing
 *
 * Triggered: After Write|Edit and Bash operations
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const ErrorHandler = require('../lib/error-handler');

/**
 * Get current AIDLC phase.
 * Tries state file first (fast path), falls back to database.
 * @returns {string|null} Phase name or null
 */
function getCurrentPhase(projectRoot) {
  // Fast path: state file
  const stateFile = path.join(projectRoot, 'aicodepath-docs', 'aicodepath-state.md');
  if (fs.existsSync(stateFile)) {
    try {
      const content = fs.readFileSync(stateFile, 'utf-8');
      const phaseMatch = content.match(/\*\*Phase\*\*:\s*([^\n*]+)/);
      if (phaseMatch) {
        return phaseMatch[1].toLowerCase().trim();
      }
    } catch (err) { /* fall through to DB */ }
  }

  // Fallback: database
  try {
    const { getDbPath } = require('../lib/path-resolver');
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) return null;
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT value FROM session_state WHERE key = ?').get('current_phase');
    db.close();
    if (!row) return null;
    const phase = JSON.parse(row.value);
    const phaseStr = (typeof phase === 'object' && phase._value) ? phase._value : phase;
    return String(phaseStr).toLowerCase().trim();
  } catch (err) {
    return null;
  }
}

/**
 * Check if the current phase is PRE-FLIGHT or INCEPTION.
 */
function isEarlyPhase(phase) {
  if (!phase) return false;
  return phase.includes('pre-flight') || phase.includes('inception');
}

/**
 * Check if the current phase is OPERATIONS.
 */
function isOperationsPhase(phase) {
  if (!phase) return false;
  return phase.includes('operations');
}

/**
 * Detect monorepo structure by looking for multiple service directories
 * or multiple package manager files.
 */
function detectMonorepoStructure(projectRoot) {
  // Check for common monorepo service directories
  const serviceDirs = ['services', 'apps', 'packages', 'modules', 'microservices'];
  for (const dir of serviceDirs) {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const subdirs = entries.filter(e => e.isDirectory());
        if (subdirs.length >= 2) {
          return { detected: true, reason: `Found ${subdirs.length} subdirectories in ${dir}/` };
        }
      } catch (err) { /* continue checking */ }
    }
  }

  // Check for multiple package manager files at depth 2+
  const packageFiles = ['package.json', 'go.mod', 'requirements.txt', 'pom.xml', 'build.gradle', 'pyproject.toml'];
  let packageCount = 0;

  for (const pkgFile of packageFiles) {
    try {
      // Check depth 1 subdirectories
      const rootEntries = fs.readdirSync(projectRoot, { withFileTypes: true });
      for (const entry of rootEntries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const candidatePath = path.join(projectRoot, entry.name, pkgFile);
          if (fs.existsSync(candidatePath)) {
            packageCount++;
          }
        }
      }
    } catch (err) { /* continue */ }
  }

  if (packageCount >= 2) {
    return { detected: true, reason: `Found ${packageCount} package manager files in subdirectories` };
  }

  return { detected: false, reason: null };
}

/**
 * Check if services.yaml exists in the project.
 */
function hasServicesManifest(projectRoot) {
  return fs.existsSync(path.join(projectRoot, 'services.yaml'));
}

/**
 * Check if cloudbuild.yaml exists at the project root.
 */
function hasCloudBuildConfig(projectRoot) {
  return fs.existsSync(path.join(projectRoot, 'cloudbuild.yaml'));
}

/**
 * Format suggestions for display.
 */
function formatSuggestions(suggestions) {
  const lines = [];

  lines.push('\nRecommended Skills for This Phase\n');

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

  lines.push('You can continue without these, but they may improve your workflow.\n');

  return lines.join('\n');
}

/**
 * Main hook implementation
 */
async function monorepoSkillSuggesterImpl(params) {
  const projectRoot = findProjectRoot(process.cwd());
  const phase = getCurrentPhase(projectRoot);

  // Only suggest in relevant phases
  if (!isEarlyPhase(phase) && !isOperationsPhase(phase)) {
    return { proceed: true };
  }

  const suggestions = [];

  // PRE-FLIGHT/INCEPTION: Suggest git-monorepo-config
  if (isEarlyPhase(phase)) {
    const monorepo = detectMonorepoStructure(projectRoot);
    if (monorepo.detected && !hasServicesManifest(projectRoot)) {
      suggestions.push({
        skill: 'aicodepath-git-monorepo-config',
        reason: `Monorepo detected (${monorepo.reason}) but services.yaml is missing. Configure Git for multi-service development.`,
        command: '/aicodepath-git-monorepo-config --full-setup',
        icon: 'GIT',
        priority: 'high'
      });
    }
  }

  // OPERATIONS: Suggest gcp-monorepo-deploy
  if (isOperationsPhase(phase)) {
    if (hasServicesManifest(projectRoot) && !hasCloudBuildConfig(projectRoot)) {
      suggestions.push({
        skill: 'aicodepath-gcp-monorepo-deploy',
        reason: 'services.yaml exists but no Cloud Build configuration found. Set up GCP deployment pipelines.',
        command: '/aicodepath-gcp-monorepo-deploy --setup',
        icon: 'GCP',
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

module.exports = {
  hook: ErrorHandler.wrapHook('monorepo-skill-suggester', monorepoSkillSuggesterImpl)
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(monorepoSkillSuggesterImpl, { name: 'monorepo-skill-suggester' });
}
