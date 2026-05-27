#!/usr/bin/env node
/**
 * Plans Format Migration: v1 → v2
 *
 * Upgrades a tasks.md file from the old 3-column format to the new
 * 5-column format with DoD and Status columns.
 *
 * v1 format: | Task | Content | Depends |
 * v2 format: | Task | Content | DoD | Depends | Status |
 *
 * Usage:
 *   node .aicodepath/scripts/migrate-plans-v1-to-v2.js [path/to/tasks.md]
 *
 * Defaults to the active task file in aicodepath-docs/task/ if no path provided.
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');

const DEFAULT_TASKS_FILE = 'aicodepath-docs/task/';

function detectFormat(content) {
  const headerMatch = content.match(/^\|([^|]+)\|([^|]+)\|([^|]+)\|/m);
  if (!headerMatch) return null;
  const cols = headerMatch[0].split('|').map((c) => c.trim()).filter(Boolean);
  if (cols.length === 3) return 'v1';
  if (cols.length === 5) return 'v2';
  return 'unknown';
}

function migrateV1ToV2(content) {
  const lines = content.split('\n');
  const result = [];
  let inTable = false;
  let headerProcessed = false;

  for (const line of lines) {
    if (!inTable && line.trim().startsWith('|')) {
      inTable = true;
    }

    if (!inTable) {
      result.push(line);
      continue;
    }

    // Separator row
    if (/^\|[-| ]+\|$/.test(line.trim())) {
      if (!headerProcessed) {
        result.push('| Task | Content | DoD | Depends | Status |');
        result.push('|------|---------|-----|---------|--------|');
        headerProcessed = true;
      }
      continue;
    }

    // Header row — skip (already written above)
    if (!headerProcessed && line.trim().startsWith('|')) {
      continue;
    }

    // Data row
    if (line.trim().startsWith('|')) {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length === 3) {
        const [task, content2, depends] = cols;
        result.push(`| ${task} | ${content2} | _Passes tests and matches spec_ | ${depends || '—'} | TODO |`);
      } else {
        result.push(line);
      }
      continue;
    }

    // Non-table line ends table
    inTable = false;
    headerProcessed = false;
    result.push(line);
  }

  return result.join('\n');
}

function main() {
  const projectRoot = findProjectRoot(process.cwd());
  const targetArg = process.argv[2];
  const tasksPath = targetArg
    ? path.resolve(targetArg)
    : path.join(projectRoot, DEFAULT_TASKS_FILE);

  if (!fs.existsSync(tasksPath)) {
    logger.info(`Tasks file not found: ${tasksPath}`, { context: 'migrate-plans' });
    process.exit(1);
  }

  const content = fs.readFileSync(tasksPath, 'utf-8');
  const format = detectFormat(content);

  if (format === 'v2') {
    logger.info('Already in v2 format — no migration needed', { context: 'migrate-plans' });
    process.exit(0);
  }

  if (format !== 'v1') {
    logger.info(`Unknown format detected (${format}) — cannot migrate`, { context: 'migrate-plans' });
    process.exit(1);
  }

  // Backup original
  const backupPath = `${tasksPath}.v1.bak`;
  fs.writeFileSync(backupPath, content, 'utf-8');
  logger.info(`Backup written to ${backupPath}`, { context: 'migrate-plans' });

  const migrated = migrateV1ToV2(content);
  fs.writeFileSync(tasksPath, migrated, 'utf-8');
  logger.info(`Migration complete: ${tasksPath}`, { context: 'migrate-plans' });
  logger.info('Review the DoD column — auto-generated placeholders need real acceptance criteria', { context: 'migrate-plans' });
}

main();
