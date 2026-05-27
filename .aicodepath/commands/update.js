#!/usr/bin/env node

/**
 * Update Command - Update AICodePath in a target project
 *
 * Uses rsync to add/update framework files without deleting
 * project-added customizations. Excludes config.json and codebase-map.md.
 *
 * @module commands/update
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../lib/logger');
const ErrorHandler = require('../lib/error-handler');

async function updateCommandImpl(targetPath, options = {}) {
  // Derive source root from this file's location:
  // commands/update.js → .aicodepath/ → project root
  const sourceRoot = options.source
    ? path.resolve(options.source)
    : path.resolve(path.join(__dirname, '..', '..'));

  const targetRoot = targetPath
    ? path.resolve(targetPath)
    : process.cwd();

  logger.info('Starting AICodePath update', {
    context: 'update',
    sourceRoot,
    targetRoot,
    dryRun: !!options.dryRun
  });

  // Sanity checks before spawning shell script
  const sourceAicodepath = path.join(sourceRoot, '.aicodepath');
  const targetAicodepath = path.join(targetRoot, '.aicodepath');

  if (!fs.existsSync(sourceAicodepath)) {
    throw new Error(`Source .aicodepath/ not found at: ${sourceAicodepath}`);
  }

  if (!fs.existsSync(targetAicodepath)) {
    throw new Error(
      `Target .aicodepath/ not found at: ${targetAicodepath}\n` +
      'Is AICodePath installed in the target project? Run install-v2.sh first.'
    );
  }

  const dbPath = path.join(targetRoot, 'aicodepath-docs', 'aicodepath.db');
  if (!fs.existsSync(dbPath)) {
    console.warn('⚠  Database not found at aicodepath-docs/aicodepath.db — migrations will be skipped');
    logger.warn('Database not found — migrations will be skipped', { context: 'update', dbPath });
  }

  const scriptPath = path.join(sourceAicodepath, 'scripts', 'update-aicodepath.sh');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Update script not found at: ${scriptPath}`);
  }

  // Build argument list for the shell script
  const args = ['--source', sourceRoot, targetRoot];
  if (options.dryRun) {
    args.push('--dry-run');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('bash', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: targetRoot
    });

    child.on('error', (err) => {
      logger.error('Update script failed to start', { context: 'update', error: err.message });
      reject(new Error(`Failed to start update script: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.info('Update completed successfully', { context: 'update', targetRoot });
        resolve({ success: true, targetRoot, sourceRoot });
      } else {
        reject(new Error(`Update script exited with code ${code}`));
      }
    });
  });
}

module.exports = ErrorHandler.wrapCLICommand('update', updateCommandImpl);

if (require.main === module) {
  const args = process.argv.slice(2);
  const targetPath = args.find(a => !a.startsWith('-'));
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-n'),
    source: (() => {
      const idx = args.indexOf('--source');
      return idx !== -1 ? args[idx + 1] : undefined;
    })()
  };
  module.exports(targetPath, options)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
