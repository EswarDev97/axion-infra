/**
 * Path Resolver for AICodePath v2.0
 *
 * Provides consistent path resolution for all AICodePath directories
 * in the consolidated .aicodepath/ structure.
 *
 * Usage:
 *   const { hooks, rules, lib } = require('./path-resolver');
 *   const hooksDir = hooks(); // Returns /project-root/.aicodepath/hooks
 *   const libDir = lib('/path/to/project'); // Explicit project root
 */

const fs = require('fs');
const path = require('path');

// Cache for performance (avoid repeated file system checks)
const cache = {
  projectRoot: new Map(),
  aicodePathRoot: new Map()
};

/**
 * Find project root by walking up directory tree
 *
 * Uses a two-pass algorithm to handle monorepo structures correctly:
 * 1. Environment variable override (AICODEPATH_PROJECT_ROOT) - highest priority
 * 2. Pass 1: Walk up looking for .aicodepath/ directory (definitive AICodePath marker)
 * 3. Pass 2 (fallback): Walk up looking for package.json, .git, or CLAUDE.md
 *
 * This ensures that in a monorepo where services have their own package.json,
 * findProjectRoot() returns the monorepo root (where .aicodepath/ lives) instead
 * of stopping at the service-level package.json.
 *
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to project root
 * @throws {Error} - If no root marker found before reaching filesystem root
 */
function findProjectRoot(startDir = process.cwd()) {
  // 1. Environment variable override (highest priority)
  if (process.env.AICODEPATH_PROJECT_ROOT) {
    const envRoot = path.resolve(process.env.AICODEPATH_PROJECT_ROOT);
    cache.projectRoot.set(startDir, envRoot);
    return envRoot;
  }

  // Check cache
  if (cache.projectRoot.has(startDir)) {
    return cache.projectRoot.get(startDir);
  }

  let currentDir = path.resolve(startDir);
  const fsRoot = path.parse(currentDir).root;

  // Pass 1: Walk up looking for .aicodepath/ directory (definitive AICodePath marker)
  // This ensures monorepo services don't stop at their own package.json
  let dir = currentDir;
  while (dir !== fsRoot) {
    const aicodePathDir = path.join(dir, '.aicodepath');
    if (fs.existsSync(aicodePathDir)) {
      try {
        if (fs.statSync(aicodePathDir).isDirectory()) {
          cache.projectRoot.set(startDir, dir);
          return dir;
        }
      } catch (e) { /* stat failed, continue */ }
    }
    dir = path.dirname(dir);
  }

  // Pass 2: Fall back to original markers (package.json, .git, CLAUDE.md)
  while (currentDir !== fsRoot) {
    if (fs.existsSync(path.join(currentDir, 'package.json')) ||
        fs.existsSync(path.join(currentDir, '.git')) ||
        fs.existsSync(path.join(currentDir, 'CLAUDE.md'))) {
      cache.projectRoot.set(startDir, currentDir);
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Reached filesystem root without finding marker
  throw new Error(
    `Could not find project root from ${startDir}. ` +
    `Looking for .aicodepath/, package.json, .git, or CLAUDE.md`
  );
}

/**
 * Get AICodePath root directory (.aicodepath/)
 *
 * All AICodePath tooling is consolidated in .aicodepath/ directory.
 *
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to .aicodepath directory
 */
function getAicodePathRoot(startDir = process.cwd()) {
  // Check cache first
  const cacheKey = startDir || process.cwd();
  if (cache.aicodePathRoot.has(cacheKey)) {
    return cache.aicodePathRoot.get(cacheKey);
  }

  // Find project root
  const projectRoot = findProjectRoot(startDir);

  // AICodePath v2.0 always uses .aicodepath/ directory
  const aicodePathRoot = path.join(projectRoot, '.aicodepath');

  // Cache result
  cache.aicodePathRoot.set(cacheKey, aicodePathRoot);

  return aicodePathRoot;
}

/**
 * Resolve path relative to .aicodepath root
 *
 * If path is absolute, returns it unchanged.
 * Otherwise, resolves relative to .aicodepath/ directory.
 *
 * @param {string} relativePath - Path to resolve
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute resolved path
 */
function resolvePath(relativePath, startDir = process.cwd()) {
  // If path is already absolute, return as-is
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }

  // Get .aicodepath root directory
  const aicodePathRoot = getAicodePathRoot(startDir);

  // Resolve relative to .aicodepath/ directory
  return path.resolve(aicodePathRoot, relativePath);
}

/**
 * Get hooks directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to hooks directory
 */
function hooks(startDir = process.cwd()) {
  return resolvePath('hooks', startDir);
}

/**
 * Get rules directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to rules directory
 */
function rules(startDir = process.cwd()) {
  return resolvePath('rules', startDir);
}

/**
 * Get guidelines directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to guidelines directory
 */
function guidelines(startDir = process.cwd()) {
  return resolvePath('guidelines', startDir);
}

/**
 * Get lib directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to lib directory
 */
function lib(startDir = process.cwd()) {
  return resolvePath('lib', startDir);
}

/**
 * Get scripts directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to scripts directory
 */
function scripts(startDir = process.cwd()) {
  return resolvePath('scripts', startDir);
}

/**
 * Get db directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to db directory
 */
function db(startDir = process.cwd()) {
  return resolvePath('db', startDir);
}

/**
 * Get templates directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to templates directory
 */
function templates(startDir = process.cwd()) {
  return resolvePath('templates', startDir);
}

/**
 * Get state-templates directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to state-templates directory
 */
function stateTemplates(startDir = process.cwd()) {
  return resolvePath('state-templates', startDir);
}

/**
 * Get skills directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to skills directory
 */
function skills(startDir = process.cwd()) {
  return resolvePath('skills', startDir);
}

/**
 * Get agents directory path
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to agents directory
 */
function agents(startDir = process.cwd()) {
  return resolvePath('agents', startDir);
}

/**
 * Get database file path
 * Supports AICODEPATH_DB_PATH env var override for testing and custom deployments.
 * @param {string} startDir - Directory to start search from (defaults to process.cwd())
 * @returns {string} - Absolute path to aicodepath.db file
 */
function getDbPath(startDir = process.cwd()) {
  if (process.env.AICODEPATH_DB_PATH) {
    return path.resolve(process.env.AICODEPATH_DB_PATH);
  }
  const projectRoot = findProjectRoot(startDir);
  return path.join(projectRoot, 'aicodepath-docs', 'aicodepath.db');
}

/**
 * Clear all cached path resolutions.
 * Useful for testing or when the project structure changes.
 */
function clearCache() {
  cache.projectRoot.clear();
  cache.aicodePathRoot.clear();
}

// Exports
module.exports = {
  findProjectRoot,
  getAicodePathRoot,
  resolvePath,
  hooks,
  rules,
  guidelines,
  lib,
  scripts,
  db,
  templates,
  stateTemplates,
  skills,
  agents,
  getDbPath,
  clearCache
};
