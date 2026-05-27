'use strict';

const EventEmitter = require('events');
const fsModule = require('fs');
const logger = require('./logger');

/**
 * TieredWatcher - Hot/Cold Tier File Watching
 *
 * Hot tier: real-time file watching via chokidar
 * Cold tier: setInterval-based polling
 * Auto-demotion: hot paths idle > hotTierTimeout ms
 * Auto-promotion: cold paths promoted on notifyAccess()
 */
class TieredWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxHotPaths: options.maxHotPaths !== undefined ? options.maxHotPaths : 50,
      pollingInterval: options.pollingInterval !== undefined ? options.pollingInterval : 10000,
      hotTierTimeout: options.hotTierTimeout !== undefined ? options.hotTierTimeout : 600000,
      promoteOnAccess: options.promoteOnAccess !== undefined ? options.promoteOnAccess : true,
    };
    this.hotWatcher = null;
    this.hotPaths = new Map();
    this.coldPaths = new Map();
    this.pollingTimer = null;
    this._initHotWatcher();
    this._startColdPolling();
  }

  _initHotWatcher() {
    let chokidar;
    try {
      chokidar = require('chokidar');
    } catch (_err) {
      logger.warn('chokidar not available - hot tier falls back to cold polling', {
        context: 'tiered-watcher',
      });
      this.hotWatcher = null;
      return;
    }
    try {
      this.hotWatcher = chokidar.watch([], {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100,
        },
      });
      this.hotWatcher.on('change', (filePath, stats) => {
        if (this.hotPaths.has(filePath)) {
          const entry = this.hotPaths.get(filePath);
          entry.lastAccess = Date.now();
          entry.stats = stats || null;
        }
        this.emit('changed', { path: filePath, stats: stats || null, tier: 'hot' });
      });
      this.hotWatcher.on('add', (filePath, stats) => {
        this.emit('added', { path: filePath, stats: stats || null, tier: 'hot' });
      });
      this.hotWatcher.on('unlink', (filePath) => {
        this.hotPaths.delete(filePath);
        this.emit('removed', { path: filePath, tier: 'hot' });
      });
      this.hotWatcher.on('error', (err) => {
        logger.error('chokidar watcher error', { context: 'tiered-watcher', error: err.message });
      });
      logger.info('Hot tier watcher initialised (chokidar)', { context: 'tiered-watcher' });
    } catch (err) {
      logger.warn('Failed to create chokidar watcher - falling back to cold polling', {
        context: 'tiered-watcher',
        error: err.message,
      });
      this.hotWatcher = null;
    }
  }

  _startColdPolling() {
    this.pollingTimer = setInterval(async () => {
      await this._pollColdPaths();
      this._checkHotTierDemotion();
      this._checkFdUsage();
    }, this.options.pollingInterval);
    if (this.pollingTimer.unref) {
      this.pollingTimer.unref();
    }
  }

  async _pollColdPaths() {
    const paths = Array.from(this.coldPaths.keys());
    for (const filePath of paths) {
      if (!this.coldPaths.has(filePath)) continue;
      const entry = this.coldPaths.get(filePath);
      const now = Date.now();
      try {
        const newStats = await fsModule.promises.stat(filePath);
        const prevStats = entry.stats;
        entry.lastPoll = now;
        if (prevStats === null || newStats.mtimeMs !== prevStats.mtimeMs || newStats.size !== prevStats.size) {
          entry.stats = newStats;
          this.emit('changed', { path: filePath, stats: newStats, tier: 'cold' });
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          this.coldPaths.delete(filePath);
          this.emit('removed', { path: filePath, tier: 'cold' });
        } else {
          logger.warn('Error polling cold path', {
            context: 'tiered-watcher',
            path: filePath,
            error: err.message,
          });
        }
      }
    }
  }

  _checkHotTierDemotion() {
    const now = Date.now();
    const todemote = [];
    for (const [filePath, entry] of this.hotPaths.entries()) {
      if (now - entry.lastAccess > this.options.hotTierTimeout) {
        todemote.push(filePath);
      }
    }
    for (const filePath of todemote) {
      this.promoteToCold(filePath).catch((err) => {
        logger.warn('Failed to demote hot path to cold', {
          context: 'tiered-watcher',
          path: filePath,
          error: err.message,
        });
      });
    }
  }

  _checkFdUsage() {
    if (typeof process.getActiveResources !== 'function') return;
    try {
      const resources = process.getActiveResources();
      const fsEvents = resources.filter((r) => r === 'FSEvent' || r === 'FSWatcher').length;
      const limit = 1000;
      if (fsEvents / limit > 0.8) {
        logger.warn('File descriptor pressure detected - demoting oldest hot paths', {
          context: 'tiered-watcher',
          fsEvents,
          limit,
        });
        this._demoteOldestHotPaths(5);
      }
    } catch (_err) {}
  }

  _demoteOldestHotPaths(count) {
    const sorted = Array.from(this.hotPaths.entries()).sort(([, a], [, b]) => a.lastAccess - b.lastAccess);
    const toDemote = sorted.slice(0, count).map(([p]) => p);
    for (const filePath of toDemote) {
      this.promoteToCold(filePath).catch((err) => {
        logger.warn('Failed to demote oldest hot path', {
          context: 'tiered-watcher',
          path: filePath,
          error: err.message,
        });
      });
    }
  }

  async addPath(filePath, tier = 'auto') {
    const resolvedTier = tier === "auto" ? (this.hotPaths.size < this.options.maxHotPaths ? "hot" : "cold") : tier;
    if (resolvedTier === "hot") {
      if (this.hotWatcher === null) {
        logger.debug('Hot watcher unavailable - adding to cold tier', { context: 'tiered-watcher', path: filePath });
        await this._addToCold(filePath);
        return;
      }
      if (this.hotPaths.size >= this.options.maxHotPaths && !this.hotPaths.has(filePath)) {
        await this._addToCold(filePath);
        return;
      }
      await this._addToHot(filePath);
    } else {
      await this._addToCold(filePath);
    }
  }

  async _addToHot(filePath) {
    if (this.hotPaths.has(filePath)) return;
    let stats = null;
    try { stats = await fsModule.promises.stat(filePath); } catch (_err) {}
    const now = Date.now();
    this.hotPaths.set(filePath, { addedAt: now, lastAccess: now, stats });
    if (this.hotWatcher) { this.hotWatcher.add(filePath); }
    logger.debug('Path added to hot tier', { context: 'tiered-watcher', path: filePath });
  }

  async _addToCold(filePath) {
    if (this.coldPaths.has(filePath)) return;
    let stats = null;
    try { stats = await fsModule.promises.stat(filePath); } catch (_err) {}
    const now = Date.now();
    this.coldPaths.set(filePath, { addedAt: now, lastPoll: now, stats });
    logger.debug('Path added to cold tier', { context: 'tiered-watcher', path: filePath });
  }

  promoteToHot(filePath) {
    if (this.hotPaths.has(filePath)) return { tier: 'hot', success: true, reason: 'already_hot' };
    if (this.hotPaths.size >= this.options.maxHotPaths) return { tier: 'cold', success: false, reason: 'hot_tier_full' };
    if (this.hotWatcher === null) return { tier: 'cold', success: false, reason: 'hot_watcher_unavailable' };
    const coldEntry = this.coldPaths.get(filePath);
    if (coldEntry) { this.coldPaths.delete(filePath); }
    const now = Date.now();
    const stats = coldEntry ? coldEntry.stats : null;
    this.hotPaths.set(filePath, { addedAt: now, lastAccess: now, stats });
    this.hotWatcher.add(filePath);
    this.emit('promoted', { path: filePath, tier: 'hot' });
    logger.debug('Path promoted to hot tier', { context: 'tiered-watcher', path: filePath });
    return { tier: 'hot', success: true };
  }

  async promoteToCold(filePath) {
    if (this.hotPaths.has(filePath)) {
      const hotEntry = this.hotPaths.get(filePath);
      this.hotPaths.delete(filePath);
      if (this.hotWatcher) {
        try { await this.hotWatcher.unwatch(filePath); } catch (err) {
          logger.warn('Failed to unwatch hot path', { context: 'tiered-watcher', path: filePath, error: err.message });
        }
      }
      if (!this.coldPaths.has(filePath)) {
        const now = Date.now();
        this.coldPaths.set(filePath, { addedAt: now, lastPoll: now, stats: hotEntry.stats });
      }
      this.emit('promoted', { path: filePath, tier: 'cold' });
      logger.debug('Path demoted to cold tier', { context: 'tiered-watcher', path: filePath });
    } else {
      await this._addToCold(filePath);
    }
    return { tier: 'cold', success: true };
  }

  removePath(filePath) {
    if (this.hotPaths.has(filePath)) {
      this.hotPaths.delete(filePath);
      if (this.hotWatcher) {
        try { this.hotWatcher.unwatch(filePath); } catch (err) {
          logger.warn('Failed to unwatch path on removal', { context: 'tiered-watcher', path: filePath, error: err.message });
        }
      }
      logger.debug('Path removed from hot tier', { context: 'tiered-watcher', path: filePath });
    }
    if (this.coldPaths.has(filePath)) {
      this.coldPaths.delete(filePath);
      logger.debug('Path removed from cold tier', { context: 'tiered-watcher', path: filePath });
    }
  }

  notifyAccess(filePath) {
    if (this.hotPaths.has(filePath)) {
      this.hotPaths.get(filePath).lastAccess = Date.now();
      return;
    }
    if (this.coldPaths.has(filePath) && this.options.promoteOnAccess) {
      this.promoteToHot(filePath);
    }
  }

  getStats() {
    return {
      hot: { count: this.hotPaths.size, max: this.options.maxHotPaths, paths: Array.from(this.hotPaths.keys()) },
      cold: { count: this.coldPaths.size, paths: Array.from(this.coldPaths.keys()) },
    };
  }

  async close() {
    if (this.pollingTimer) { clearInterval(this.pollingTimer); this.pollingTimer = null; }
    if (this.hotWatcher) {
      try { await this.hotWatcher.close(); } catch (err) {
        logger.warn('Error closing hot watcher', { context: 'tiered-watcher', error: err.message });
      }
      this.hotWatcher = null;
    }
    this.hotPaths.clear();
    this.coldPaths.clear();
    logger.info('TieredWatcher closed', { context: 'tiered-watcher' });
  }
}

let instance = null;
function getTieredWatcher(options) {
  if (!instance) instance = new TieredWatcher(options);
  return instance;
}

module.exports = { TieredWatcher, getTieredWatcher };