/**
 * Checkpoint Manager for AICodePath
 *
 * Provides checkpoint system for saving JSON snapshots after each stage completion,
 * enabling session recovery without data loss.
 *
 * Features:
 * - Save checkpoints with phase, stage, unit, state, and context
 * - Load checkpoints by ID or get latest
 * - List and filter checkpoints
 * - Automatic pruning of old checkpoints
 * - Git context integration
 *
 * @module lib/checkpoint-manager
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findProjectRoot, getDbPath } = require('./path-resolver');
const logger = require('./logger');

// WebSocket emitter for real-time dashboard updates
let wsEmitter = null;
try {
  wsEmitter = require('../hooks/lib/ws-emitter');
} catch (e) {
  // WebSocket emitter not available - non-fatal
}

/**
 * Generate unique checkpoint ID
 * Format: cp_<YYYYMMDD>_<HHMMSS>_<random5>
 *
 * @returns {string} Checkpoint ID
 */
function generateCheckpointId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7);

  return `cp_${datePart}_${timePart}_${randomPart}`;
}

/**
 * Get git context (branch and commit hash)
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Git context with branch and commit
 */
function getGitContext(projectRoot) {
  const context = {
    git_branch: null,
    git_commit: null
  };

  try {
    // Get current branch
    context.git_branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf8'
    }).trim();

    // Get current commit hash
    context.git_commit = execSync('git rev-parse --short HEAD', {
      cwd: projectRoot,
      encoding: 'utf8'
    }).trim();
  } catch (error) {
    // Not a git repo or git not available - non-fatal
    logger.debug('Could not get git context', { error: error.message });
  }

  return context;
}

/**
 * Get checkpoints directory path
 * Derives from database path - stored as sibling to DB
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string} Checkpoints directory path
 */
function getCheckpointsDir(projectRoot) {
  const dbPath = getDbPath(projectRoot);
  const dbDir = path.dirname(dbPath);
  return path.join(dbDir, 'checkpoints');
}

/**
 * Ensure checkpoints directory exists
 *
 * @param {string} checkpointsDir - Checkpoints directory path
 */
function ensureCheckpointsDir(checkpointsDir) {
  if (!fs.existsSync(checkpointsDir)) {
    fs.mkdirSync(checkpointsDir, { recursive: true });
    logger.debug('Created checkpoints directory', { path: checkpointsDir });
  }
}

/**
 * Read AICodePath version from .aicodepath/version file
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string} AICodePath version
 */
function getAICodePathVersion(projectRoot) {
  try {
    const versionFile = path.join(projectRoot, '.aicodepath', 'version');
    if (fs.existsSync(versionFile)) {
      return fs.readFileSync(versionFile, 'utf8').trim();
    }
  } catch (error) {
    logger.debug('Could not read version file', { error: error.message });
  }
  return '2.0.0'; // Default fallback
}

/**
 * Get project name from package.json or directory name
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string} Project name
 */
function getProjectName(projectRoot) {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.name) {
        return packageJson.name;
      }
    }
  } catch (error) {
    logger.debug('Could not read package.json', { error: error.message });
  }

  // Fallback to directory name
  return path.basename(projectRoot);
}

/**
 * Save checkpoint
 *
 * Creates a JSON snapshot of current session state with metadata.
 * Updates latest.json symlink to point to most recent checkpoint.
 *
 * @param {string} phase - Current phase (e.g., 'CONSTRUCTION', 'INCEPTION')
 * @param {string} stage - Current stage (e.g., 'unit-implementation', 'pre-flight')
 * @param {string} unit - Current unit being processed (e.g., 'auth-service')
 * @param {Object} state - Session state object
 * @param {Object} context - Additional context information
 * @param {string} startDir - Starting directory (defaults to process.cwd())
 * @returns {Object} Checkpoint object
 */
function saveCheckpoint(phase, stage, unit, state, context, startDir = process.cwd()) {
  try {
    const projectRoot = findProjectRoot(startDir);
    const checkpointsDir = getCheckpointsDir(projectRoot);

    ensureCheckpointsDir(checkpointsDir);

    // Generate checkpoint
    const checkpointId = generateCheckpointId();
    const timestamp = new Date().toISOString();
    const gitContext = getGitContext(projectRoot);
    const aicodePathVersion = getAICodePathVersion(projectRoot);
    const projectName = getProjectName(projectRoot);

    const checkpoint = {
      id: checkpointId,
      phase: phase || '',
      stage: stage || '',
      unit: unit || '',
      timestamp,
      state: state || {},
      context: context || {},
      metadata: {
        aicodepath_version: aicodePathVersion,
        project_name: projectName,
        git_branch: gitContext.git_branch,
        git_commit: gitContext.git_commit
      }
    };

    // Write checkpoint file
    const checkpointFile = path.join(checkpointsDir, `${checkpointId}.json`);
    fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2), 'utf8');

    // Update latest.json
    const latestFile = path.join(checkpointsDir, 'latest.json');
    fs.writeFileSync(latestFile, JSON.stringify(checkpoint, null, 2), 'utf8');

    logger.info('Checkpoint saved', {
      checkpointId,
      phase,
      stage,
      unit,
      file: checkpointFile
    });

    // Emit checkpoint event via WebSocket
    if (wsEmitter) {
      wsEmitter.emitCheckpoint({
        checkpointId,
        phase,
        stage,
        message: `Checkpoint saved: ${phase}/${stage}/${unit}`
      });
    }

    // Prune old checkpoints if needed
    pruneCheckpoints(50, startDir);

    return checkpoint;
  } catch (error) {
    logger.error('Failed to save checkpoint', {
      error: error.message,
      phase,
      stage,
      unit
    });
    // Return null instead of throwing - non-fatal
    return null;
  }
}

/**
 * Load checkpoint by ID
 *
 * @param {string} checkpointId - Checkpoint ID to load
 * @param {string} startDir - Starting directory (defaults to process.cwd())
 * @returns {Object|null} Checkpoint object or null if not found
 */
function loadCheckpoint(checkpointId, startDir = process.cwd()) {
  try {
    const projectRoot = findProjectRoot(startDir);
    const checkpointsDir = getCheckpointsDir(projectRoot);
    const checkpointFile = path.join(checkpointsDir, `${checkpointId}.json`);

    if (!fs.existsSync(checkpointFile)) {
      logger.debug('Checkpoint not found', { checkpointId, file: checkpointFile });
      return null;
    }

    const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));

    logger.debug('Checkpoint loaded', { checkpointId });
    return checkpoint;
  } catch (error) {
    logger.error('Failed to load checkpoint', {
      error: error.message,
      checkpointId
    });
    return null;
  }
}

/**
 * Get latest checkpoint
 *
 * @param {string} startDir - Starting directory (defaults to process.cwd())
 * @returns {Object|null} Latest checkpoint object or null if not found
 */
function getLatestCheckpoint(startDir = process.cwd()) {
  try {
    const projectRoot = findProjectRoot(startDir);
    const checkpointsDir = getCheckpointsDir(projectRoot);
    const latestFile = path.join(checkpointsDir, 'latest.json');

    if (!fs.existsSync(latestFile)) {
      logger.debug('No latest checkpoint found');
      return null;
    }

    const checkpoint = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

    logger.debug('Latest checkpoint loaded', { checkpointId: checkpoint.id });
    return checkpoint;
  } catch (error) {
    logger.error('Failed to load latest checkpoint', {
      error: error.message
    });
    return null;
  }
}

/**
 * List checkpoints with optional filtering
 *
 * @param {Object} options - Filter options
 * @param {string} options.phase - Filter by phase
 * @param {string} options.stage - Filter by stage
 * @param {string} options.unit - Filter by unit
 * @param {number} options.limit - Maximum number of checkpoints to return
 * @param {string} startDir - Starting directory (defaults to process.cwd())
 * @returns {Array<Object>} Array of checkpoint summaries
 */
function listCheckpoints(options = {}, startDir = process.cwd()) {
  try {
    const projectRoot = findProjectRoot(startDir);
    const checkpointsDir = getCheckpointsDir(projectRoot);

    if (!fs.existsSync(checkpointsDir)) {
      logger.debug('No checkpoints directory found');
      return [];
    }

    // Get all checkpoint files
    const files = fs.readdirSync(checkpointsDir)
      .filter(file => file.startsWith('cp_') && file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    // Load and filter checkpoints
    const checkpoints = [];
    for (const file of files) {
      try {
        const checkpointFile = path.join(checkpointsDir, file);
        const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));

        // Apply filters
        if (options.phase && checkpoint.phase !== options.phase) {
          continue;
        }
        if (options.stage && checkpoint.stage !== options.stage) {
          continue;
        }
        if (options.unit && checkpoint.unit !== options.unit) {
          continue;
        }

        // Create summary (omit large state/context for listing)
        checkpoints.push({
          id: checkpoint.id,
          phase: checkpoint.phase,
          stage: checkpoint.stage,
          unit: checkpoint.unit,
          timestamp: checkpoint.timestamp,
          git_branch: checkpoint.metadata?.git_branch,
          git_commit: checkpoint.metadata?.git_commit
        });

        // Apply limit
        if (options.limit && checkpoints.length >= options.limit) {
          break;
        }
      } catch (error) {
        logger.warn('Failed to parse checkpoint file', {
          file,
          error: error.message
        });
      }
    }

    logger.debug('Listed checkpoints', { count: checkpoints.length });
    return checkpoints;
  } catch (error) {
    logger.error('Failed to list checkpoints', {
      error: error.message
    });
    return [];
  }
}

/**
 * Prune old checkpoints
 *
 * Keeps only the most recent N checkpoints, deletes older ones.
 * Does not delete latest.json.
 *
 * @param {number} keepCount - Number of recent checkpoints to keep (default: 50)
 * @param {string} startDir - Starting directory (defaults to process.cwd())
 * @returns {number} Number of checkpoints pruned
 */
function pruneCheckpoints(keepCount = 50, startDir = process.cwd()) {
  try {
    const projectRoot = findProjectRoot(startDir);
    const checkpointsDir = getCheckpointsDir(projectRoot);

    if (!fs.existsSync(checkpointsDir)) {
      return 0;
    }

    // Get all checkpoint files (excluding latest.json)
    const files = fs.readdirSync(checkpointsDir)
      .filter(file => file.startsWith('cp_') && file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    // If under limit, nothing to prune
    if (files.length <= keepCount) {
      return 0;
    }

    // Delete older checkpoints
    const filesToDelete = files.slice(keepCount);
    let deletedCount = 0;

    for (const file of filesToDelete) {
      try {
        const filePath = path.join(checkpointsDir, file);
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (error) {
        logger.warn('Failed to delete checkpoint file', {
          file,
          error: error.message
        });
      }
    }

    if (deletedCount > 0) {
      logger.info('Pruned old checkpoints', {
        deleted: deletedCount,
        kept: keepCount
      });
    }

    return deletedCount;
  } catch (error) {
    logger.error('Failed to prune checkpoints', {
      error: error.message
    });
    return 0;
  }
}

module.exports = {
  saveCheckpoint,
  loadCheckpoint,
  getLatestCheckpoint,
  listCheckpoints,
  pruneCheckpoints
};
