/**
 * Adapter Manager for Multi-AI Conversation Systems
 *
 * Manages multiple AI tool adapters, providing unified access
 * to sessions and messages across different AI tools.
 */

'use strict';

const { EventEmitter } = require('events');
const { ClaudeCodeAdapter } = require('./claude-code-adapter');
const logger = require('../logger');

class AdapterManager extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, import('./base-adapter').BaseAdapter>} */
    this.adapters = new Map();
    this._watchers = new Map();
    this._registerDefaultAdapters();
  }

  /**
   * Register the default set of adapters.
   */
  _registerDefaultAdapters() {
    this.register(new ClaudeCodeAdapter());
  }

  /**
   * Register an adapter with the manager.
   * @param {import('./base-adapter').BaseAdapter} adapter
   */
  register(adapter) {
    if (!adapter || typeof adapter.id === 'undefined') {
      throw new Error('Invalid adapter: missing id getter');
    }
    logger.info('Registering adapter', { context: 'adapter-manager', adapterID: adapter.id });
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Get a registered adapter by ID.
   * @param {string} id - Adapter identifier
   * @returns {import('./base-adapter').BaseAdapter|undefined}
   */
  getAdapter(id) {
    return this.adapters.get(id);
  }

  /**
   * Detect which adapters are active for the given project root.
   * @param {string} projectRoot - Absolute path to project root
   * @returns {Promise<Array<{adapter: BaseAdapter, result: Object}>>}
   */
  async detectAdapters(projectRoot) {
    const results = [];
    for (const adapter of this.adapters.values()) {
      try {
        const result = await adapter.detect(projectRoot);
        results.push({ adapter, result });
      } catch (err) {
        logger.warn('Adapter detect failed', {
          context: 'adapter-manager',
          adapterID: adapter.id,
          error: err.message
        });
      }
    }
    return results;
  }

  /**
   * Get all sessions across all adapters for a project root.
   * @param {string} projectRoot - Absolute path to project root
   * @returns {Promise<import('./base-adapter').Session[]>}
   */
  async getAllSessions(projectRoot) {
    const allSessions = [];
    for (const adapter of this.adapters.values()) {
      try {
        const sessions = await adapter.listSessions(projectRoot);
        allSessions.push(...sessions);
      } catch (err) {
        logger.warn('Adapter listSessions failed', {
          context: 'adapter-manager',
          adapterID: adapter.id,
          error: err.message
        });
      }
    }
    // Sort combined list by updatedAt descending
    allSessions.sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    return allSessions;
  }

  /**
   * Watch all adapters for a project root, proxying events.
   * @param {string} projectRoot - Absolute path to project root
   * @returns {Promise<void>}
   */
  async watchAll(projectRoot) {
    for (const adapter of this.adapters.values()) {
      try {
        const watcher = await adapter.watch(projectRoot);
        this._watchers.set(adapter.id, watcher);

        // Proxy watcher events, adding adapterID
        const proxyEvent = (eventName) => {
          watcher.on(eventName, (data) => {
            this.emit(eventName, { ...data, adapterID: adapter.id });
          });
        };

        proxyEvent('session_updated');
        proxyEvent('message_added');
        proxyEvent('session_discovered');

        logger.info('Started watching adapter', { context: 'adapter-manager', adapterID: adapter.id });
      } catch (err) {
        logger.warn('Adapter watch failed', {
          context: 'adapter-manager',
          adapterID: adapter.id,
          error: err.message
        });
      }
    }
  }

  /**
   * Close all active watchers and adapters.
   * @returns {Promise<void>}
   */
  async closeAll() {
    for (const [adapterID, watcher] of this._watchers.entries()) {
      try {
        if (typeof watcher.close === 'function') {
          await watcher.close();
        }
        logger.info('Closed watcher', { context: 'adapter-manager', adapterID });
      } catch (err) {
        logger.warn('Error closing watcher', {
          context: 'adapter-manager',
          adapterID,
          error: err.message
        });
      }
    }
    this._watchers.clear();

    for (const adapter of this.adapters.values()) {
      try {
        if (typeof adapter.close === 'function') {
          await adapter.close();
        }
      } catch (err) {
        logger.warn('Error closing adapter', {
          context: 'adapter-manager',
          adapterID: adapter.id,
          error: err.message
        });
      }
    }
  }
}

// Singleton instance
let _instance = null;

/**
 * Get the singleton AdapterManager instance.
 * @returns {AdapterManager}
 */
function getAdapterManager() {
  if (!_instance) {
    _instance = new AdapterManager();
  }
  return _instance;
}

module.exports = { AdapterManager, getAdapterManager };
