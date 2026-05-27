/**
 * Graph Bridge — Node.js → ast_parser.py
 *
 * Invokes the Python AST/graph indexer (ast_parser.py) for graph indexing
 * operations used by post-commit hooks and incremental re-indexing.
 *
 * This is separate from python-bridge.js (diagram generators). Do NOT merge.
 *
 * @module hooks/lib/graph-bridge
 */

const fs = require('fs');
const { execFile } = require('child_process');
const path = require('path');
const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');
const { findPython } = require('../../lib/platform-utils');

/**
 * Resolved path to ast_parser.py.
 * Can be overridden via AICODEPATH_GRAPH_SCRIPT for testing.
 */
const SCRIPT_PATH = process.env.AICODEPATH_GRAPH_SCRIPT ||
  path.join(pathResolver.findProjectRoot(), '.aicodepath', 'generators', 'parsers', 'ast_parser.py');

/**
 * Python executable to use.
 * Resolved via platform-utils: checks AICODEPATH_PYTHON env var, then python3, then python.
 */
const PYTHON = findPython();

/**
 * Invoke ast_parser.py with given args. Returns parsed JSON or null on error.
 * Uses execFile (async with callback), NOT execFileSync.
 *
 * @param {string[]} args - CLI args like ['--index', '.', '--db-path', '/path/to/db']
 * @param {Object} options
 * @param {number} options.timeout - ms timeout (default: 30000)
 * @returns {Promise<Object|null>} - parsed JSON stats or null on failure
 */
async function invokePython(args, options = {}) {
  const timeout = options.timeout !== undefined ? options.timeout : 30000;

  return new Promise((resolve) => {
    const execOptions = { timeout };

    execFile(PYTHON, [SCRIPT_PATH, ...args], execOptions, (error, stdout, stderr) => {
      if (error) {
        // Covers: non-zero exit, timeout (ETIMEDOUT / SIGTERM), spawn failure
        if (error.killed || error.code === 'ETIMEDOUT') {
          logger.warn('graph-bridge: ast_parser.py timed out', {
            context: 'graph-bridge',
            timeout,
            args
          });
        } else {
          logger.warn('graph-bridge: ast_parser.py invocation failed', {
            context: 'graph-bridge',
            errorCode: error.code,
            message: error.message,
            stderr: stderr ? stderr.slice(0, 500) : ''
          });
        }
        return resolve(null);
      }

      // Exit code 0: attempt JSON parse
      try {
        const parsed = JSON.parse(stdout);
        return resolve(parsed);
      } catch (parseError) {
        logger.warn('graph-bridge: failed to parse ast_parser.py stdout as JSON', {
          context: 'graph-bridge',
          parseError: parseError.message,
          stdout: stdout ? stdout.slice(0, 200) : ''
        });
        return resolve(null);
      }
    });
  });
}

/**
 * Write graph-indexed.json flag file after a successful indexing run.
 * Uses AICODEPATH_GRAPH_FLAG_PATH env var override (for testing).
 *
 * @param {Object} stats - Parsed JSON stats from ast_parser.py
 */
function _writeGraphFlag(stats) {
  try {
    const flagPath = process.env.AICODEPATH_GRAPH_FLAG_PATH ||
      path.join(pathResolver.findProjectRoot(), 'aicodepath-docs', 'state', 'graph-indexed.json');
    fs.mkdirSync(path.dirname(flagPath), { recursive: true });
    fs.writeFileSync(flagPath, JSON.stringify({
      entities: stats.entities || 0,
      relations: stats.relations || 0,
      resolved: stats.resolved || 0,
      indexed_at: new Date().toISOString(),
    }, null, 2));
  } catch (e) {
    logger.warn('graph-bridge: failed to write graph-indexed.json', {
      context: 'graph-bridge',
      error: e.message,
    });
  }
}

/**
 * Convenience: trigger a diff-reindex (for post-commit hooks).
 * Passes --diff-reindex and --db-path to ast_parser.py.
 * Writes graph-indexed.json flag file on success.
 *
 * @param {string} dbPath - Absolute path to the SQLite graph DB
 * @param {Object} [options] - Optional timeout override
 * @returns {Promise<Object|null>}
 */
async function diffReindex(dbPath, options = {}) {
  const stats = await invokePython(['--diff-reindex', '--db-path', dbPath], options);
  if (stats !== null) {
    _writeGraphFlag(stats);
  }
  return stats;
}

/**
 * Convenience: reindex a single file.
 * Passes --reindex <filePath> and --db-path to ast_parser.py.
 *
 * @param {string} filePath - Absolute path to the source file to reindex
 * @param {string} dbPath - Absolute path to the SQLite graph DB
 * @param {Object} [options] - Optional timeout override
 * @returns {Promise<Object|null>}
 */
async function reindexFile(filePath, dbPath, options = {}) {
  return invokePython(['--reindex', filePath, '--db-path', dbPath], options);
}

module.exports = { invokePython, diffReindex, reindexFile };
