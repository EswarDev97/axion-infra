/**
 * Claude Code Adapter for Multi-AI Conversation Systems
 *
 * Reads Claude Code session JSONL files from ~/.claude/projects/
 * and provides a unified interface for session and message access.
 */

'use strict';

const fsPromises = require('fs').promises;
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const readline = require('readline');

const { BaseAdapter, Session, Message, UsageStats } = require('./base-adapter');
const logger = require('../logger');

let _incrementalParser = null;
function getParser() {
  if (!_incrementalParser) {
    try {
      const IncrementalSessionParser = require('../incremental-session-parser');
      _incrementalParser = new IncrementalSessionParser();
    } catch (err) {
      logger.warn('IncrementalSessionParser unavailable', { context: 'claude-code-adapter', error: err.message });
    }
  }
  return _incrementalParser;
}
let _pricingCalculator = null;
function getPricingCalculator() {
  if (!_pricingCalculator) {
    try {
      _pricingCalculator = require('../pricing-calculator');
    } catch (err) {
      logger.warn('pricing-calculator unavailable', { context: 'claude-code-adapter', error: err.message });
    }
  }
  return _pricingCalculator;
}

class ClaudeCodeAdapter extends BaseAdapter {
  get id() { return 'claude-code'; }
  get name() { return 'Claude Code'; }
  get icon() { return 'C'; }

  /**
   * Detect if Claude Code sessions exist for the given project root.
   * @param {string} projectRoot - Absolute path to project root
   * @returns {Promise<{detected: boolean, sessionDir?: string}>}
   */
  async detect(projectRoot) {
    const claudeDir = path.join(projectRoot, '.claude');
    try {
      await fsPromises.access(claudeDir);
      const sessionDir = this._getSessionDir(projectRoot);
      return { detected: true, sessionDir };
    } catch {
      return { detected: false };
    }
  }

  /**
   * List all sessions for a project root.
   * @param {string} projectRoot - Absolute path to project root
   * @returns {Promise<Session[]>}
   */
  async listSessions(projectRoot) {
    try {
      const sessionDir = this._getSessionDir(projectRoot);
      let entries;
      try {
        entries = await fsPromises.readdir(sessionDir);
      } catch (err) {
        logger.warn('Could not read session dir', { context: 'claude-code-adapter', sessionDir, error: err.message });
        return [];
      }

      const jsonlFiles = entries.filter(f => f.endsWith('.jsonl'));
      const sessions = [];

      for (const file of jsonlFiles) {
        const filePath = path.join(sessionDir, file);
        try {
          const session = await this._parseSessionFile(filePath, { projectRoot });
          if (session) sessions.push(session);
        } catch (err) {
          logger.warn('Failed to parse session file', { context: 'claude-code-adapter', filePath, error: err.message });
        }
      }

      // Sort by updatedAt descending
      sessions.sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });

      return sessions;
    } catch (err) {
      logger.error('listSessions failed', { context: 'claude-code-adapter', projectRoot, error: err.message });
      return [];
    }
  }

  /**
   * Get all messages for a session.
   * sessionID encodes the file path as: 'claude-code:<filePath>'
   * @param {string} sessionID - Session identifier
   * @returns {Promise<Message[]>}
   */
  async getMessages(sessionID, options = {}) {
    const filePath = this._sessionIDToPath(sessionID);
    if (!filePath) {
      logger.warn('Invalid sessionID format', { context: 'claude-code-adapter', sessionID });
      return [];
    }

    // Use incremental parser when available (cache-aware, byte-offset based)
    const parser = getParser();
    if (parser) {
      try {
        const { limit, offset: pageOffset, forceRefresh } = options;
        if (limit !== undefined) {
          const page = await parser.getPage(filePath, sessionID, limit, pageOffset || 0);
          return page.messages;
        }
        const result = await parser.parse(filePath, sessionID, { forceRefresh });
        return result.messages;
      } catch (err) {
        logger.warn('IncrementalSessionParser failed, falling back to readline', {
          context: 'claude-code-adapter', sessionID, error: err.message
        });
      }
    }

    // Fallback: full readline parse
    const messages = [];
    let lineNumber = 0;
    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
      for await (const line of rl) {
        lineNumber++;
        const trimmed = line.trim();
        if (!trimmed) continue;
        let json;
        try {
          json = JSON.parse(trimmed);
        } catch {
          logger.warn('Malformed JSONL line', { context: 'claude-code-adapter', filePath, lineNumber });
          continue;
        }
        const message = this._parseMessage(sessionID, json, lineNumber);
        if (message) messages.push(message);
      }
    } catch (err) {
      logger.error('getMessages failed', { context: 'claude-code-adapter', sessionID, error: err.message });
    }
    return messages;
  }

  /**
   * Get a paginated slice of messages for a session (uses incremental parser).
   * @param {string} sessionID
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<{messages: Array, total: number, hasMore: boolean, metadata: Object}>}
   */
  async getMessagePage(sessionID, limit = 100, offset = 0) {
    const filePath = this._sessionIDToPath(sessionID);
    if (!filePath) return { messages: [], total: 0, hasMore: false };

    const parser = getParser();
    if (parser) {
      try {
        return await parser.getPage(filePath, sessionID, limit, offset);
      } catch (err) {
        logger.warn('getMessagePage incremental parse failed', {
          context: 'claude-code-adapter', sessionID, error: err.message
        });
      }
    }

    // Fallback: load all then slice
    const all = await this.getMessages(sessionID);
    return {
      messages: all.slice(offset, offset + limit),
      total: all.length,
      hasMore: offset + limit < all.length,
      metadata: {}
    };
  }

  /**
   * Get incremental parser cache statistics.
   * @returns {Object|null}
   */
  getCacheStats() {
    const parser = getParser();
    return parser ? parser.getCacheStats() : null;
  }

  /**
   * Get aggregated usage statistics for a session.
   * @param {string} sessionID - Session identifier
   * @returns {Promise<UsageStats>}
   */
  async getUsage(sessionID) {
    const messages = await this.getMessages(sessionID);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheWriteTokens = 0;

    for (const msg of messages) {
      const usage = msg.tokenUsage || {};
      totalInputTokens += (usage.inputTokens || 0);
      totalOutputTokens += (usage.outputTokens || 0);
      totalCacheReadTokens += (usage.cacheReadTokens || 0);
      totalCacheWriteTokens += (usage.cacheWriteTokens || 0);
    }

    const estimatedCost = this._calculateCost({
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: totalCacheReadTokens,
      cacheWriteTokens: totalCacheWriteTokens
    });

    return new UsageStats({
      sessionID,
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalCacheWriteTokens,
      estimatedCost,
      messageCount: messages.length
    });
  }

  /**
   * Watch a project root for session changes.
   * @param {string} projectRoot - Absolute path to project root
   * @returns {Promise<EventEmitter & {close: Function}>}
   */
  async watch(projectRoot) {
    const emitter = new EventEmitter();
    const sessionDir = this._getSessionDir(projectRoot);

    let chokidar;
    try {
      chokidar = require('chokidar');
    } catch (err) {
      logger.warn('chokidar not available, file watching disabled', { context: 'claude-code-adapter', error: err.message });
      emitter.close = () => {};
      return emitter;
    }

    let watcher;
    try {
      watcher = chokidar.watch(path.join(sessionDir, '*.jsonl'), {
        persistent: false,
        ignoreInitial: true
      });

      watcher.on('change', (filePath) => {
        const sessionID = this._pathToSessionID(filePath);
        emitter.emit('session_updated', { sessionID, filePath, adapterID: this.id });
        emitter.emit('message_added', { sessionID, filePath, adapterID: this.id });
      });

      watcher.on('add', (filePath) => {
        const sessionID = this._pathToSessionID(filePath);
        emitter.emit('session_discovered', { sessionID, filePath, adapterID: this.id });
      });

      watcher.on('error', (err) => {
        logger.warn('File watcher error', { context: 'claude-code-adapter', error: err.message });
      });

    } catch (err) {
      logger.warn('Failed to start file watcher', { context: 'claude-code-adapter', error: err.message });
    }

    emitter.close = () => {
      if (watcher) {
        watcher.close().catch(err => {
          logger.warn('Error closing watcher', { context: 'claude-code-adapter', error: err.message });
        });
      }
    };

    return emitter;
  }

  /**
   * Compute the session directory path for a project root.
   * Claude Code stores sessions at ~/.claude/projects/-<path-with-dashes>/
   * @param {string} projectRoot - Absolute path to project root
   * @returns {string}
   */
  _getSessionDir(projectRoot) {
    const dirName = '-' + projectRoot.split('/').join('-');
    return path.join(os.homedir(), '.claude', 'projects', dirName);
  }

  /**
   * Convert a session file path to a session ID.
   * @param {string} filePath
   * @returns {string}
   */
  _pathToSessionID(filePath) {
    return 'claude-code:' + filePath;
  }

  /**
   * Extract file path from session ID.
   * @param {string} sessionID
   * @returns {string|null}
   */
  _sessionIDToPath(sessionID) {
    if (typeof sessionID === 'string' && sessionID.startsWith('claude-code:')) {
      return sessionID.slice('claude-code:'.length);
    }
    return null;
  }

  /**
   * Parse a JSONL session file to extract session metadata.
   * @param {string} filePath - Path to .jsonl file
   * @param {Object} projectMeta - { projectRoot }
   * @returns {Promise<Session|null>}
   */
  async _parseSessionFile(filePath, projectMeta = {}) {
    try {
      const stat = await fsPromises.stat(filePath);
      const now = Date.now();
      const modifiedMs = stat.mtimeMs;
      const isActive = (now - modifiedMs) < 5 * 60 * 1000; // modified < 5 min ago

      const content = await fsPromises.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      let createdAt = stat.birthtime || stat.ctime;
      let updatedAt = stat.mtime;
      let messageCount = 0;

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json && json.timestamp) {
            updatedAt = json.timestamp;
          }
          if (json && json.message) {
            messageCount++;
          }
        } catch {
          // Skip malformed lines
        }
      }

      if (lines.length > 0) {
        try {
          const firstJson = JSON.parse(lines[0]);
          if (firstJson && firstJson.timestamp) {
            createdAt = firstJson.timestamp;
          }
        } catch { /* ignore */ }
      }

      const fileName = path.basename(filePath, '.jsonl');
      const sessionID = this._pathToSessionID(filePath);
      const durationMs = new Date(updatedAt).getTime() - new Date(createdAt).getTime();

      return new Session({
        id: sessionID,
        adapterID: this.id,
        adapterName: this.name,
        adapterIcon: this.icon,
        name: fileName,
        slug: fileName,
        createdAt,
        updatedAt,
        duration: Math.max(0, Math.round(durationMs / 1000)),
        isActive,
        totalTokens: 0,
        estimatedCost: 0,
        messageCount,
        filePath,
        worktreeName: projectMeta.worktreeName || '',
        worktreePath: projectMeta.projectRoot || ''
      });
    } catch (err) {
      logger.warn('_parseSessionFile failed', { context: 'claude-code-adapter', filePath, error: err.message });
      return null;
    }
  }

  /**
   * Parse a single JSONL line into a Message object.
   * @param {string} sessionID
   * @param {Object} json - Parsed JSON object
   * @param {number} lineNumber
   * @returns {Message|null}
   */
  _parseMessage(sessionID, json, lineNumber) {
    if (!json || typeof json !== 'object') return null;

    let role, contentRaw, timestamp, model, usage;

    if (json.message && json.message.role) {
      role = json.message.role;
      contentRaw = json.message.content;
      timestamp = json.timestamp || json.message.timestamp;
      model = json.message.model || '';
      usage = json.message.usage || json.usage || {};
    } else if (json.role) {
      role = json.role;
      contentRaw = json.content;
      timestamp = json.timestamp;
      model = json.model || '';
      usage = json.usage || {};
    } else {
      return null;
    }

    if (!role) return null;

    const content = this._extractContent(contentRaw);
    const toolUses = this._extractToolUses(contentRaw);
    const thinkingBlocks = this._extractThinking(contentRaw);
    const contentBlocks = Array.isArray(contentRaw) ? contentRaw : [];

    const tokenUsage = {
      inputTokens: usage.input_tokens || usage.inputTokens || 0,
      outputTokens: usage.output_tokens || usage.outputTokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || usage.cacheReadTokens || 0,
      cacheWriteTokens: usage.cache_creation_input_tokens || usage.cacheWriteTokens || 0
    };

    const msgId = require('crypto').createHash('sha256')
      .update(sessionID + ':' + lineNumber)
      .digest('hex')
      .slice(0, 16);

    return new Message({
      id: msgId,
      sessionID,
      role,
      content,
      timestamp: timestamp || new Date().toISOString(),
      model,
      tokenUsage,
      toolUses,
      thinkingBlocks,
      contentBlocks
    });
  }

  /**
   * Extract text content from a message content field.
   * @param {string|Array} content
   * @returns {string}
   */
  _extractContent(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';

    return content
      .filter(block => block && block.type === 'text')
      .map(block => block.text || '')
      .join('\n');
  }

  /**
   * Extract tool_use blocks from message content.
   * @param {string|Array} content
   * @returns {Array}
   */
  _extractToolUses(content) {
    if (!Array.isArray(content)) return [];
    return content.filter(block => block && block.type === 'tool_use');
  }

  /**
   * Extract thinking blocks from message content.
   * @param {string|Array} content
   * @returns {Array}
   */
  _extractThinking(content) {
    if (!Array.isArray(content)) return [];
    return content.filter(block => block && block.type === 'thinking');
  }

  /**
   * Calculate cost from token counts using pricing-calculator.
   * @param {Object} tokens
   * @param {string} [modelId] - Model ID for accurate tier pricing; defaults to Sonnet
   * @returns {number} cost in USD
   */
  _calculateCost({ inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0 }, modelId = 'claude-sonnet-4-6') {
    const calc = getPricingCalculator();
    if (calc) {
      return calc.calculateCost(
        { inputTokens, outputTokens, cacheRead: cacheReadTokens, cacheWrite: cacheWriteTokens },
        modelId
      );
    }
    // Fallback: Sonnet rates if pricing-calculator unavailable
    return (
      (inputTokens / 1_000_000) * 3.0 +
      (outputTokens / 1_000_000) * 15.0 +
      (cacheReadTokens / 1_000_000) * 0.30 +
      (cacheWriteTokens / 1_000_000) * 3.75
    );
  }
}

module.exports = { ClaudeCodeAdapter };
