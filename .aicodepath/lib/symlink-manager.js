/**
 * Symlink Manager - Create per-file symlinks for skills and agents
 *
 * Creates symlinks from <target>/.claude/skills/ and <target>/.claude/agents/
 * to <target>/.aicodepath/skills/ and <target>/.aicodepath/agents/ respectively.
 *
 * @module lib/symlink-manager
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('./path-resolver');

/**
 * Create or update a single symlink with Windows fallback
 *
 * @param {string} source - Source file path (symlink target)
 * @param {string} target - Symlink path to create
 * @returns {string} Result: 'created', 'unchanged', 'copied', or 'skipped'
 */
function createOrUpdateSymlink(source, target) {
  const sourceIsDir = fs.statSync(source).isDirectory();

  try {
    const existing = fs.readlinkSync(target);
    if (existing === source) return 'unchanged';
    fs.unlinkSync(target); // Stale symlink
  } catch (e) {
    if (e.code === 'ENOENT') {
      // Target doesn't exist, proceed to create
    } else if (e.code === 'EINVAL') {
      // Target exists but is a plain file or directory (Windows copy fallback) — re-copy
      if (sourceIsDir) {
        // Guard: if target resolves to the same real path as source (e.g. target is inside
        // a directory-level symlink pointing back at source), do nothing — already linked.
        try {
          if (fs.realpathSync(source) === fs.realpathSync(target)) return 'unchanged';
        } catch (_) { /* can't resolve — proceed */ }
        fs.rmSync(target, { recursive: true, force: true });
        fs.cpSync(source, target, { recursive: true });
      } else {
        fs.copyFileSync(source, target);
      }
      return 'copied';
    } else {
      return 'skipped';
    }
  }

  try {
    fs.symlinkSync(source, target);
    return 'created';
  } catch (e) {
    if (e.code === 'EPERM') {
      // Windows requires Developer Mode or elevated privileges for symlinks;
      // fall back to a plain file/directory copy so init still works without elevation.
      if (sourceIsDir) {
        fs.mkdirSync(target, { recursive: true });
        fs.cpSync(source, target, { recursive: true });
      } else {
        fs.copyFileSync(source, target);
      }
      return 'copied';
    }
    throw e;
  }
}

/**
 * Symlink all files in a skill directory
 *
 * @param {string} skillDir - Source skill directory
 * @param {string} targetSkillDir - Target .claude/skills/<name>/ directory
 * @returns {Object} Stats for this skill
 */
function symlinkSkillDir(skillDir, targetSkillDir) {
  const stats = { created: 0, unchanged: 0, copied: 0, skipped: 0 };

  fs.mkdirSync(targetSkillDir, { recursive: true });

  const entries = fs.readdirSync(skillDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(skillDir, entry.name);
    const targetPath = path.join(targetSkillDir, entry.name);

    if (entry.isFile()) {
      const result = createOrUpdateSymlink(sourcePath, targetPath);
      stats[result]++;
    } else if (entry.isDirectory()) {
      // Symlink entire subdirectory (references/, scripts/, templates/)
      const result = createOrUpdateSymlink(sourcePath, targetPath);
      stats[result]++;
    }
  }

  return stats;
}

/**
 * Symlink all skills to target project's .claude/skills/
 *
 * @param {string} targetProjectRoot - Absolute path to target project root
 * @returns {Object} Summary { created, unchanged, copied, skipped, skillCount }
 */
function symlinkSkills(targetProjectRoot) {
  const skillsSource = path.join(targetProjectRoot, '.aicodepath', 'skills');
  const skillsTarget = path.join(targetProjectRoot, '.claude', 'skills');

  if (!fs.existsSync(skillsSource)) {
    throw new Error(`Skills directory not found: ${skillsSource}`);
  }

  fs.mkdirSync(skillsTarget, { recursive: true });

  const totals = { created: 0, unchanged: 0, copied: 0, skipped: 0, skillCount: 0 };

  const entries = fs.readdirSync(skillsSource, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'roles') continue; // Skip roles directory (handled by symlinkAgents)

    const skillDir = path.join(skillsSource, entry.name);
    // Verify it contains a SKILL.md
    if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) continue;

    const targetSkillDir = path.join(skillsTarget, entry.name);
    const stats = symlinkSkillDir(skillDir, targetSkillDir);

    totals.created += stats.created;
    totals.unchanged += stats.unchanged;
    totals.copied += stats.copied;
    totals.skipped += stats.skipped;
    totals.skillCount++;
  }

  return totals;
}

/**
 * Symlink all agents to target project's .claude/agents/
 *
 * @param {string} targetProjectRoot - Absolute path to target project root
 * @returns {Object} Summary { created, unchanged, copied, skipped, agentCount }
 */
function symlinkAgents(targetProjectRoot) {
  const agentsSource = path.join(targetProjectRoot, '.aicodepath', 'agents');
  const agentsTarget = path.join(targetProjectRoot, '.claude', 'agents');

  if (!fs.existsSync(agentsSource)) {
    return { created: 0, unchanged: 0, copied: 0, skipped: 0, agentCount: 0 };
  }

  fs.mkdirSync(agentsTarget, { recursive: true });

  const totals = { created: 0, unchanged: 0, copied: 0, skipped: 0, agentCount: 0 };

  const entries = fs.readdirSync(agentsSource, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const sourcePath = path.join(agentsSource, entry.name);
    const targetPath = path.join(agentsTarget, entry.name);
    const result = createOrUpdateSymlink(sourcePath, targetPath);

    totals[result]++;
    totals.agentCount++;
  }

  return totals;
}

module.exports = {
  symlinkSkills,
  symlinkAgents,
  createOrUpdateSymlink
};
