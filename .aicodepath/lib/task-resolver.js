/**
 * Task Resolver
 *
 * Resolves the active task file from the aicodepath-docs/task/ directory.
 * Used by plan-loader, plans-watcher, and orchestrate commands.
 *
 * Resolution order:
 *   1. CR-slug match (if crSlug provided or found in session state)
 *   2. Most-recent-by-date (sort by YYYY-MM-DD prefix descending)
 *   3. Among multiple matches, pick highest mtime
 *
 * No database dependency — uses only fs, path, and path-resolver.
 *
 * @module lib/task-resolver
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('./path-resolver');

const TASK_DIR = path.join('aicodepath-docs', 'task');
const TASK_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})-(.+)-tasks\.md$/;

/**
 * Get the task directory path for a given project root.
 * @param {string} [projectRoot]
 * @returns {string}
 */
function getTaskDir(projectRoot) {
  const root = projectRoot || pathResolver.findProjectRoot();
  return path.join(root, TASK_DIR);
}

/**
 * Read all task files from the directory, parsed with date and slug.
 * @param {string} taskDir
 * @returns {Array<{filename: string, absPath: string, date: string, slug: string, mtime: number}>}
 */
function readTaskFiles(taskDir) {
  if (!fs.existsSync(taskDir)) return [];

  const entries = fs.readdirSync(taskDir);
  const files = [];

  for (const filename of entries) {
    const match = TASK_FILE_PATTERN.exec(filename);
    if (!match) continue;

    const absPath = path.join(taskDir, filename);
    const stat = fs.statSync(absPath);

    files.push({
      filename,
      absPath,
      date: match[1],
      slug: match[2],
      mtime: stat.mtimeMs,
    });
  }

  return files;
}

/**
 * Resolve the active task file path.
 *
 * @param {Object} [options]
 * @param {string} [options.projectRoot] - Override project root (for testing)
 * @param {string} [options.crSlug] - CR slug to match (e.g., 'tasks-path-mismatch-fix')
 * @returns {string|null} Absolute path to active task file, or null if none found
 */
function resolveActiveTaskFile(options = {}) {
  const taskDir = getTaskDir(options.projectRoot);
  const files = readTaskFiles(taskDir);

  if (files.length === 0) return null;

  // Strategy 1: CR-slug match
  if (options.crSlug) {
    const matches = files.filter(f => f.slug.includes(options.crSlug));
    if (matches.length === 1) return matches[0].absPath;
    if (matches.length > 1) {
      // Multiple matches — pick most recent mtime
      matches.sort((a, b) => b.mtime - a.mtime);
      return matches[0].absPath;
    }
  }

  // Strategy 2: Most recent by date prefix, then mtime as tiebreaker
  files.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.mtime - a.mtime;
  });

  return files[0].absPath;
}

/**
 * List all task files in the task directory, sorted by date prefix descending.
 *
 * @param {Object} [options]
 * @param {string} [options.projectRoot] - Override project root (for testing)
 * @param {string} [options.filterSlug] - Optional slug to filter matches
 * @returns {string[]} Array of absolute paths
 */
function listTaskFiles(options = {}) {
  const taskDir = getTaskDir(options.projectRoot);
  let files = readTaskFiles(taskDir);

  if (options.filterSlug) {
    files = files.filter(f => f.slug.includes(options.filterSlug));
  }

  // Sort by date descending, mtime as tiebreaker
  files.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.mtime - a.mtime;
  });

  return files.map(f => f.absPath);
}

module.exports = { resolveActiveTaskFile, listTaskFiles };
