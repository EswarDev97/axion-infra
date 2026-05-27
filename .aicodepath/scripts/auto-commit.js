#!/usr/bin/env node

/**
 * AICodePath Auto-Commit Script
 *
 * Usage:
 *   node scripts/auto-commit.js --checkpoint=design|code|test [--unit=unit-name] [--cr=CR-001] [--message="..."]
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { findProjectRoot, hooks, lib } = require('../lib/path-resolver');

// Resolve hook and lib paths using path-resolver
const preCommitValidatorPath = path.join(hooks(), 'pre-commit-validator.js');
let kbSyncPath = path.join(lib(), 'kb-sync.js');

// Fallback to .aicodepath/lib if path-resolver returned an unexpected location
if (!fs.existsSync(kbSyncPath)) {
  const projectRoot = findProjectRoot();
  kbSyncPath = path.join(projectRoot, '.aicodepath', 'lib', 'kb-sync.js');
}

const {
  validateStagedFiles,
  formatResults,
  generateAuditEntry,
} = require(preCommitValidatorPath);
const { syncCommitToKB, logActivityToKB } = require(kbSyncPath);

function parseArgs(argv) {
  const args = {};
  argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value === undefined ? true : value;
    }
  });
  return args;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function ensureGitRepo(root) {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: root, stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function stagePaths(root, pathsToStage) {
  for (const p of pathsToStage) {
    if (fs.existsSync(path.join(root, p))) {
      spawnSync('git', ['add', '--', p], { cwd: root, stdio: 'ignore' });
    }
  }
}

function stageAll(root) {
  spawnSync('git', ['add', '-A'], { cwd: root, stdio: 'ignore' });
}

function getCommitHash(root) {
  return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
}

function updateContextState(root, commitHash, commitMessage) {
  const contextPath = path.join(root, 'aicodepath-docs', 'context-state.json');
  const context = readJson(contextPath);
  if (!context) {
    return;
  }

  context.lastUpdated = new Date().toISOString();
  context.lastCommit = {
    hash: commitHash,
    message: commitMessage,
    timestamp: new Date().toISOString(),
  };

  writeJson(contextPath, context);
}

function updateImplementationStatus(root, unitName, commitHash) {
  const statusPath = path.join(root, 'aicodepath-docs', 'implementation-status.json');
  const status = readJson(statusPath);
  if (!status || !unitName) {
    return;
  }

  status.lastUpdated = new Date().toISOString();
  const unit = (status.units || []).find((u) => u.name === unitName || u.id === unitName);
  if (unit) {
    if (!Array.isArray(unit.commits)) {
      unit.commits = [];
    }
    if (!unit.commits.includes(commitHash)) {
      unit.commits.push(commitHash);
    }
  }

  writeJson(statusPath, status);
}

function buildCommitMessage(checkpoint, crNumber, unit, messageOverride) {
  if (messageOverride) {
    return messageOverride;
  }
  if (checkpoint === 'design') {
    return `docs(${crNumber}/${unit}): add design artifacts`;
  }
  if (checkpoint === 'code') {
    return `feat(${crNumber}/${unit}): implement ${unit || 'feature'}`;
  }
  return `test(${crNumber}): verify build and tests pass`;
}

function resolveUnit(args, implementationStatus) {
  if (args.unit) {
    return args.unit;
  }
  if (implementationStatus?.currentUnit) {
    return implementationStatus.currentUnit;
  }
  const inProgress = (implementationStatus?.units || []).find((u) => u.status === 'in_progress');
  return inProgress?.name || inProgress?.id || '';
}

function resolveCrNumber(args, contextState, implementationStatus) {
  if (args.cr) {
    return args.cr;
  }
  if (contextState?.project?.crNumber) {
    return contextState.project.crNumber;
  }
  if (implementationStatus?.crNumber) {
    return implementationStatus.crNumber;
  }
  return 'cr-XXX';
}

async function main() {
  const args = parseArgs(process.argv);
  const checkpoint = args.checkpoint || args.type;
  const root = findProjectRoot();

  if (!checkpoint || !['design', 'code', 'test'].includes(checkpoint)) {
    console.error('Usage: --checkpoint=design|code|test');
    process.exit(1);
  }

  if (!ensureGitRepo(root)) {
    console.error('Not a git repository.');
    process.exit(1);
  }

  const aicodepathDocsDir = path.join(root, 'aicodepath-docs');
  if (!fs.existsSync(aicodepathDocsDir)) {
    fs.mkdirSync(aicodepathDocsDir, { recursive: true });
  }

  const contextState = readJson(path.join(root, 'aicodepath-docs', 'context-state.json'));
  const implementationStatus = readJson(
    path.join(root, 'aicodepath-docs', 'implementation-status.json')
  );
  const unitName = resolveUnit(args, implementationStatus);
  const crNumber = resolveCrNumber(args, contextState, implementationStatus);
  const commitMessage = buildCommitMessage(checkpoint, crNumber, unitName || 'unit', args.message);

  if ((checkpoint === 'design' || checkpoint === 'code') && !unitName) {
    console.error('Unit name required for design/code checkpoints. Use --unit=unit-name.');
    process.exit(1);
  }

  if (checkpoint === 'design') {
    const base = `aicodepath-docs/construction/${unitName}`;
    stagePaths(root, [
      `${base}/functional-design`,
      `${base}/nfr-design`,
      `${base}/database-design`,
      `${base}/infrastructure-design`,
      `${base}/ai-implementation`,
      'aicodepath-docs/aicodepath-state.md',
      'aicodepath-docs/context-state.json',
      'aicodepath-docs/implementation-status.json',
    ]);
  } else if (checkpoint === 'code') {
    stageAll(root);
    stagePaths(root, [
      'aicodepath-docs/context-state.json',
      'aicodepath-docs/implementation-status.json',
    ]);
  } else {
    stagePaths(root, [
      'aicodepath-docs/tests.json',
      'aicodepath-docs/implementation-status.json',
      'aicodepath-docs/context-state.json',
      'aicodepath-docs/aicodepath-state.md',
    ]);
  }

  const validation = await validateStagedFiles(root);
  if (!validation.commitAllowed) {
    console.error(formatResults(validation));
    process.exit(1);
  }

  const auditPath = path.join(root, 'aicodepath-docs', 'audit.md');
  const auditEntry = generateAuditEntry(validation, commitMessage);
  fs.appendFileSync(auditPath, auditEntry);

  const commitResult = spawnSync('git', ['commit', '-m', commitMessage], {
    cwd: root,
    stdio: 'inherit',
  });
  if (commitResult.status !== 0) {
    process.exit(commitResult.status || 1);
  }

  const commitHash = getCommitHash(root);
  updateContextState(root, commitHash, commitMessage);
  updateImplementationStatus(root, unitName, commitHash);

  // Issue 2 Fix: Sync commit to Knowledge Base
  try {
    const syncResult = await syncCommitToKB(root, {
      commitHash,
      commitMessage,
      checkpoint,
      unit: unitName,
    });

    if (syncResult) {
      console.log(`[auto-commit] KB synced: ${commitHash.slice(0, 7)}`);
    } else {
      console.warn('[auto-commit] KB sync skipped (KB not initialized)');
    }
  } catch (syncError) {
    // KB sync failure should not fail the commit
    console.warn('[auto-commit] KB sync failed:', syncError.message);
  }

  console.log(`[auto-commit] Checkpoint ${checkpoint} completed: ${commitHash.slice(0, 7)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
