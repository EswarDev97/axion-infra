'use strict';

/**
 * SuggesterLock — parallel-write serialization for DOMAIN_MAPPING, taxonomy,
 * using-aicodepath, and plugin.json during concurrent agent-creator improve loops.
 *
 * Usage:
 *   const lock = new SuggesterLock();            // defaults via pathResolver
 *   const lock = new SuggesterLock({ lockFile, queueFile, projectRoot }); // injected (tests)
 *
 *   await lock.acquireLock();
 *   lock.queueEdit({ targetFile, targetPath, value, mergeStrategy });
 *   await lock.releaseLock();
 *   // ... after all writers complete:
 *   await lock.applyBatchMerge();
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('./path-resolver');
const logger = require('./logger');

const POLL_INTERVAL_MS = 50;
const CONTEXT = 'suggester-lock';

class SuggesterLock {
  constructor(config = {}) {
    const root = config.projectRoot || pathResolver.findProjectRoot();
    const generatedDir = config.generatedDir
      || path.join(root, '.aicodepath', 'generated');

    this.lockFile = config.lockFile
      || path.join(generatedDir, '.suggester.lock');
    this.queueFile = config.queueFile
      || path.join(generatedDir, '.suggester-queue.jsonl');
  }

  // ── Lock lifecycle ────────────────────────────────────────────────────────

  /**
   * Acquire the file lock.  Retries every POLL_INTERVAL_MS until timeoutMs
   * elapses.  Automatically removes stale locks whose holder PID is dead.
   */
  async acquireLock(timeoutMs = 30000) {
    const start = Date.now();
    const lockData = JSON.stringify({ pid: process.pid, acquired: start });

    while (true) {
      try {
        fs.writeFileSync(this.lockFile, lockData, { flag: 'wx' });
        logger.info('Lock acquired', { context: CONTEXT, pid: process.pid });
        return;
      } catch (writeErr) {
        if (writeErr.code !== 'EEXIST') throw writeErr;

        // Check for stale lock (holder process dead); removes it if so
        const staleRemoved = this._checkAndRemoveStaleLock();

        if (!staleRemoved) {
          if (Date.now() - start > timeoutMs) {
            throw new Error(`Lock timeout after ${timeoutMs}ms — ${this.lockFile}`);
          }
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
        // If stale lock was removed, loop immediately to retry writeFileSync
      }
    }
  }

  /**
   * Release the file lock.  ENOENT is treated as idempotent (already released).
   */
  async releaseLock() {
    try {
      fs.unlinkSync(this.lockFile);
      logger.info('Lock released', { context: CONTEXT, pid: process.pid });
    } catch (e) {
      if (e.code === 'ENOENT') return; // idempotent — already released
      logger.warn(`Failed to release lock: ${e.message}`, { context: CONTEXT });
      throw e;
    }
  }

  // ── Queue ─────────────────────────────────────────────────────────────────

  /**
   * Append one edit record to the queue file.
   * Must be called while the lock is held.
   *
   * @param {{ targetFile: string, targetPath: string, value: *, mergeStrategy: string }} edit
   */
  queueEdit(edit) {
    fs.appendFileSync(this.queueFile, JSON.stringify(edit) + '\n', 'utf8');
  }

  // ── Merge ─────────────────────────────────────────────────────────────────

  /**
   * Read the queue, group edits by targetFile, apply file-type-aware merges,
   * then clear the queue.  Call once after all concurrent writers have released.
   */
  async applyBatchMerge() {
    if (!fs.existsSync(this.queueFile)) return;

    const raw = fs.readFileSync(this.queueFile, 'utf8').trim();
    if (!raw) return;

    const edits = raw.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    // Group by targetFile, preserving insertion order within each file
    const byFile = new Map();
    for (const edit of edits) {
      if (!byFile.has(edit.targetFile)) byFile.set(edit.targetFile, []);
      byFile.get(edit.targetFile).push(edit);
    }

    for (const [targetFile, fileEdits] of byFile) {
      let content = fs.existsSync(targetFile)
        ? fs.readFileSync(targetFile, 'utf8')
        : '';

      for (const edit of fileEdits) {
        content = this._applyEdit(content, edit);
      }

      fs.writeFileSync(targetFile, content, 'utf8');
      logger.info(`Merged ${fileEdits.length} edit(s) → ${path.basename(targetFile)}`, { context: CONTEXT });
    }

    fs.writeFileSync(this.queueFile, '', 'utf8'); // clear queue
  }

  // ── Private: edit dispatch ────────────────────────────────────────────────

  _applyEdit(content, edit) {
    const { targetPath, value } = edit;

    if (targetPath === '.agents') return this._applyJsonAgentsEdit(content, value);
    if (targetPath === 'table-row') return this._applyMarkdownTableEdit(content, value);
    if (targetPath.startsWith('DOMAIN_MAPPING.')) return this._applyDomainMappingEdit(content, targetPath, value);

    logger.warn(`Unknown targetPath "${targetPath}" — edit skipped`, { context: CONTEXT });
    return content;
  }

  /** JSON pack manifest: parse → push to .agents array → re-serialise. */
  _applyJsonAgentsEdit(content, value) {
    const obj = JSON.parse(content);
    if (!Array.isArray(obj.agents)) obj.agents = [];
    obj.agents.push(value);
    return JSON.stringify(obj, null, 2);
  }

  /** Markdown table: append a new row at the end of the file. */
  _applyMarkdownTableEdit(content, value) {
    return content.trimEnd() + '\n' + value + '\n';
  }

  /**
   * JS DOMAIN_MAPPING: regex-guarded array append for a named key.
   * Creates the key if it does not already exist.
   */
  _applyDomainMappingEdit(content, targetPath, value) {
    const keyName = targetPath.replace('DOMAIN_MAPPING.', '');
    const existingKeyRegex = new RegExp(`(['"]{1}${keyName}['"]{1}:\\s*\\[)([^\\]]*)(\\])`);

    if (existingKeyRegex.test(content)) {
      // Append to existing array entry
      return content.replace(existingKeyRegex, (match, open, existing, close) => {
        const trimmed = existing.trim();
        const newEntry = `"${value}"`;
        return `${open}${trimmed ? `${trimmed}, ${newEntry}` : newEntry}${close}`;
      });
    }

    // Key absent — insert new entry before the DOMAIN_MAPPING closing brace
    return content.replace(
      /(const DOMAIN_MAPPING\s*=\s*\{)([\s\S]*?)(\n\};)/,
      (match, open, body, close) => {
        const trimmedBody = body.trimEnd();
        const separator = trimmedBody.endsWith(',') ? '' : ',';
        return `${open}${trimmedBody}${separator}\n  "${keyName}": ["${value}"]${close}`;
      }
    );
  }

  // ── Private: crash recovery ───────────────────────────────────────────────

  /**
   * Read the lock file and remove it if the holder PID is no longer alive.
   * Returns true if a stale lock was successfully removed.
   */
  _checkAndRemoveStaleLock() {
    try {
      const raw = fs.readFileSync(this.lockFile, 'utf8');
      const { pid } = JSON.parse(raw);

      if (!pid || this._isProcessAlive(pid)) return false;

      logger.warn(`Removing stale lock held by dead PID ${pid}`, { context: CONTEXT });
      try {
        fs.unlinkSync(this.lockFile);
        return true;
      } catch (unlinkErr) {
        if (unlinkErr.code === 'ENOENT') return true; // already gone — treat as removed
        logger.warn(`Could not remove stale lock: ${unlinkErr.message}`, { context: CONTEXT });
        return false;
      }
    } catch (readErr) {
      // Lock file disappeared between the EEXIST check and this read — no action needed
      logger.info(`Lock file unreadable during stale check (may have been released): ${readErr.message}`, { context: CONTEXT });
      return false;
    }
  }

  _isProcessAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return e.code !== 'ESRCH'; // ESRCH = no such process = dead
    }
  }
}

module.exports = SuggesterLock;
