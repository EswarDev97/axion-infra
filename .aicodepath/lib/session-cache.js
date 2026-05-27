/**
 * SessionCache - LRU cache for AI conversation session data
 *
 * Provides two-tier caching:
 * - Metadata cache: Session metadata (lightweight, TTL-based)
 * - Content cache: Full parsed messages (heavy, LRU eviction)
 *
 * Prevents redundant re-parsing of large JSONL files by tracking
 * file modification times and byte offsets.
 *
 * @module lib/session-cache
 */

'use strict';

const fs = require('fs');
const logger = require('./logger');

/**
 * Simple LRU cache backed by a Map (insertion-order preserving)
 */
class LRUCache {
  /**
   * @param {number} maxSize - Maximum number of entries
   */
  constructor(maxSize) {
    this.maxSize = maxSize;
    this._map = new Map();
  }

  get size() {
    return this._map.size;
  }

  /**
   * Get an entry (refreshes LRU position)
   * @param {string} key
   * @returns {*} Stored value or undefined
   */
  get(key) {
    if (!this._map.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }

  /**
   * Set an entry, evicting LRU if at capacity
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this.maxSize) {
      // Delete oldest (first) entry
      const oldestKey = this._map.keys().next().value;
      this._map.delete(oldestKey);
    }
    this._map.set(key, value);
  }

  /**
   * Check if key exists (does NOT refresh LRU position)
   * @param {string} key
   */
  has(key) {
    return this._map.has(key);
  }

  /**
   * Remove an entry
   * @param {string} key
   */
  delete(key) {
    this._map.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this._map.clear();
  }

  /**
   * Iterate over entries (oldest-first)
   */
  entries() {
    return this._map.entries();
  }
}

/**
 * @typedef {Object} CachedSession
 * @property {string} sessionID - Session identifier
 * @property {string} filePath - Absolute path to JSONL file
 * @property {number} fileSize - File size at last parse (bytes)
 * @property {number} mtimeMs - File modification time at last parse (ms)
 * @property {number} byteOffset - Byte offset after last complete parse
 * @property {Object[]} messages - Parsed messages array
 * @property {Object} metadata - Session metadata (name, messageCount, etc.)
 * @property {number} cachedAt - Timestamp when cached (Date.now())
 */

/**
 * @typedef {Object} CacheStats
 * @property {number} hits - Total cache hits
 * @property {number} misses - Total cache misses
 * @property {number} staleHits - Times stale entry was detected and invalidated
 * @property {number} evictions - LRU evictions due to capacity
 * @property {number} size - Current entries in cache
 * @property {number} maxSize - Maximum capacity
 */

class SessionCache {
  /**
   * @param {Object} options
   * @param {number} [options.maxSessions=128] - Max sessions in content cache
   * @param {number} [options.maxMetadata=512] - Max entries in metadata cache
   * @param {number} [options.metadataTtlMs=60000] - Metadata TTL in milliseconds
   */
  constructor(options = {}) {
    const {
      maxSessions = 128,
      maxMetadata = 512,
      metadataTtlMs = 60 * 1000  // 1 minute
    } = options;

    this._contentCache = new LRUCache(maxSessions);
    this._metadataCache = new LRUCache(maxMetadata);
    this._metadataTtlMs = metadataTtlMs;

    this._stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      evictions: 0
    };
  }

  /**
   * Get cached session content if file is unchanged
   * @param {string} sessionID
   * @param {string} filePath - Path to JSONL file for staleness check
   * @returns {CachedSession|null} Cached session or null if stale/missing
   */
  getSession(sessionID, filePath) {
    const entry = this._contentCache.get(sessionID);

    if (!entry) {
      this._stats.misses++;
      return null;
    }

    // Check if file has been modified since last cache
    if (this._isStale(entry, filePath)) {
      this._stats.staleHits++;
      this._contentCache.delete(sessionID);
      return null;
    }

    this._stats.hits++;
    return entry;
  }

  /**
   * Store a parsed session in cache
   * @param {string} sessionID
   * @param {string} filePath
   * @param {Object[]} messages
   * @param {Object} metadata
   * @param {number} byteOffset - Final byte offset after parsing
   */
  setSession(sessionID, filePath, messages, metadata, byteOffset) {
    let fileSize = 0;
    let mtimeMs = 0;

    try {
      const stat = fs.statSync(filePath);
      fileSize = stat.size;
      mtimeMs = stat.mtimeMs;
    } catch (error) {
      logger.debug('Could not stat file for cache', {
        context: 'session-cache',
        filePath,
        error: error.message
      });
    }

    const prevSize = this._contentCache.size;

    this._contentCache.set(sessionID, {
      sessionID,
      filePath,
      fileSize,
      mtimeMs,
      byteOffset,
      messages,
      metadata,
      cachedAt: Date.now()
    });

    if (this._contentCache.size <= prevSize && prevSize >= this._contentCache.maxSize) {
      this._stats.evictions++;
    }
  }

  /**
   * Update the byte offset for a session (after incremental read)
   * @param {string} sessionID
   * @param {number} newByteOffset
   * @param {Object[]} additionalMessages - New messages to append
   */
  updateByteOffset(sessionID, newByteOffset, additionalMessages = []) {
    const entry = this._contentCache.get(sessionID);
    if (!entry) return;

    entry.byteOffset = newByteOffset;
    entry.messages = [...entry.messages, ...additionalMessages];
    entry.metadata.messageCount = entry.messages.length;

    // Re-set to refresh LRU position
    this._contentCache.set(sessionID, entry);
  }

  /**
   * Get the stored byte offset for incremental parsing
   * @param {string} sessionID
   * @returns {number} Byte offset or 0 if not cached
   */
  getByteOffset(sessionID) {
    const entry = this._contentCache.get(sessionID);
    return entry ? entry.byteOffset : 0;
  }

  /**
   * Invalidate a session from cache
   * @param {string} sessionID
   */
  invalidate(sessionID) {
    this._contentCache.delete(sessionID);
    this._metadataCache.delete(sessionID);
  }

  /**
   * Get cached metadata for a session
   * @param {string} sessionID
   * @returns {Object|null} Metadata or null if expired/missing
   */
  getMetadata(sessionID) {
    const entry = this._metadataCache.get(sessionID);
    if (!entry) return null;

    // TTL-based expiry for metadata
    if (Date.now() - entry.cachedAt > this._metadataTtlMs) {
      this._metadataCache.delete(sessionID);
      return null;
    }

    return entry.data;
  }

  /**
   * Store session metadata
   * @param {string} sessionID
   * @param {Object} metadata
   */
  setMetadata(sessionID, metadata) {
    this._metadataCache.set(sessionID, {
      data: metadata,
      cachedAt: Date.now()
    });
  }

  /**
   * Check if a cached entry is stale by comparing file mtime
   * @private
   */
  _isStale(entry, filePath) {
    if (!filePath || !entry.filePath) return false;

    try {
      const stat = fs.statSync(filePath);
      return stat.mtimeMs !== entry.mtimeMs;
    } catch {
      // File no longer exists — treat as stale
      return true;
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    this._contentCache.clear();
    this._metadataCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {CacheStats}
   */
  getStats() {
    const hitRate = this._stats.hits + this._stats.misses > 0
      ? (this._stats.hits / (this._stats.hits + this._stats.misses)) * 100
      : 0;

    return {
      ...this._stats,
      size: this._contentCache.size,
      maxSize: this._contentCache.maxSize,
      metadataSize: this._metadataCache.size,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
}

// Module-level singleton
let _instance = null;

/**
 * Get the singleton SessionCache instance
 * @param {Object} [options] - Options (only used on first call)
 * @returns {SessionCache}
 */
function getSessionCache(options) {
  if (!_instance) {
    _instance = new SessionCache(options);
  }
  return _instance;
}

/**
 * Reset the singleton (for testing)
 */
function resetSessionCache() {
  _instance = null;
}

module.exports = { SessionCache, LRUCache, getSessionCache, resetSessionCache };
