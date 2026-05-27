/**
 * Platform Utilities — cross-platform helpers for macOS, Linux, and Windows
 *
 * Provides safe wrappers for OS-specific operations:
 *   - findExecutable(): replaces `which` (Unix) / `where` (Windows)
 *   - findPython(): resolves python3/python with env-var override
 *
 * @module lib/platform-utils
 */

const { execSync } = require('child_process');

/**
 * Check whether an executable exists on PATH, cross-platform.
 *
 * On Unix/macOS uses `which`; on Windows uses `where`.
 * Returns true if found, false if not found or any error occurs.
 *
 * @param {string} name - Executable name (e.g. 'claude', 'python3')
 * @returns {boolean}
 */
function findExecutable(name) {
  const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the Python 3 executable name for the current platform.
 *
 * Resolution order:
 *   1. AICODEPATH_PYTHON env var (user override)
 *   2. 'python3'  (Linux / macOS standard)
 *   3. 'python'   (Windows Store Python 3 / some environments)
 *
 * Falls back to 'python3' if neither is found (caller handles the error).
 *
 * @returns {string} Executable name to pass to spawn/execFile
 */
function findPython() {
  if (process.env.AICODEPATH_PYTHON) {
    return process.env.AICODEPATH_PYTHON;
  }
  if (findExecutable('python3')) {
    return 'python3';
  }
  if (findExecutable('python')) {
    return 'python';
  }
  return 'python3'; // let the caller surface the "not found" error
}

module.exports = { findExecutable, findPython };
