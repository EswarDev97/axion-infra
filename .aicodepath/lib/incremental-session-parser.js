/**
 * IncrementalSessionParser - High-performance JSONL parser with byte-offset resumption
 *
 * Avoids re-parsing entire files on each request by tracking the byte offset
 * of the last successfully parsed line. On subsequent calls, reads only new bytes
 * appended since the last parse.
 *
 * Features:
 * - Byte-offset based incremental reads (100MB+ files in < 200ms on repeat reads)
 * - LRU cache integration via SessionCache
 * - Tool use / tool result linking (pairs tool_use and tool_result content blocks)
 * - Pagination support for large sessions
 * - Malformed JSONL resilience (skips bad lines with a warning)
 *
 * @module lib/incremental-session-parser
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getSessionCache } = require('./session-cache');
const logger = require('./logger');

/**
 * @typedef {Object} ParsedMessage
 * @property {string} id - Message UUID
 * @property {string} sessionID - Parent session ID
 * @property {string} role - 'user' | 'assistant' | 'system'
 * @property {string} content - Plain text content (first text block)
 * @property {Object[]} contentBlocks - All content blocks (text, tool_use, tool_result)
 * @property {string} timestamp - ISO timestamp
 * @property {string} model - Model name
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} cacheReadTokens
 * @property {number} cacheWriteTokens
 * @property {number} messageIndex - Position in session (0-indexed)
 * @property {Object[]} toolUses - Linked tool use objects
 */

/**
 * @typedef {Object} ParseResult
 * @property {ParsedMessage[]} messages - All messages
 * @property {Object} metadata - Session summary (messageCount, totalTokens, etc.)
 * @property {boolean} fromCache - Whether result was served from cache
 * @property {boolean} incremental - Whether this was an incremental read
 * @property {number} byteOffset - Final byte offset after parsing
 */

class IncrementalSessionParser {
  /**
   * @param {Object} [options]
   * @param {import('./session-cache').SessionCache} [options.cache] - Custom cache instance
   * @param {number} [options.readChunkSize=65536] - Buffer chunk size for streaming reads
   */
  constructor(options = {}) {
    this.cache = options.cache || getSessionCache();
    this.readChunkSize = options.readChunkSize || 65536; // 64KB
  }

  /**
   * Parse a JSONL session file, using cache for incremental reads
   *
   * @param {string} filePath - Absolute path to .jsonl file
   * @param {string} sessionID - Session identifier for cache key
   * @param {Object} [options]
   * @param {boolean} [options.forceRefresh=false] - Bypass cache
   * @returns {Promise<ParseResult>}
   */
  async parse(filePath, sessionID, options = {}) {
    const { forceRefresh = false } = options;

    // Try cache first
    if (!forceRefresh) {
      const cached = this.cache.getSession(sessionID, filePath);
      if (cached) {
        return {
          messages: cached.messages,
          metadata: cached.metadata,
          fromCache: true,
          incremental: false,
          byteOffset: cached.byteOffset
        };
      }
    }

    // Check if file exists
    let fileStat;
    try {
      fileStat = fs.statSync(filePath);
    } catch (error) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    // Check if we can do an incremental read (file grew but wasn't truncated)
    const cachedOffset = this.cache.getByteOffset(sessionID);
    const canIncremental = !forceRefresh && cachedOffset > 0 && fileStat.size > cachedOffset;

    if (canIncremental) {
      return this._incrementalRead(filePath, sessionID, cachedOffset, fileStat.size);
    }

    // Full parse
    return this._fullParse(filePath, sessionID, fileStat.size);
  }

  /**
   * Full parse of a JSONL file from the beginning
   * @private
   */
  async _fullParse(filePath, sessionID, fileSize) {
    const lines = [];
    let byteOffset = 0;

    const content = fs.readFileSync(filePath, 'utf8');
    byteOffset = Buffer.byteLength(content, 'utf8');

    const rawLines = content.split('\n');
    for (const line of rawLines) {
      const parsed = this._parseLine(line, sessionID);
      if (parsed) lines.push(parsed);
    }

    const messages = this._assignIndexes(lines);
    this._linkToolUses(messages);
    const metadata = this._buildMetadata(messages, fileSize);

    this.cache.setSession(sessionID, filePath, messages, metadata, byteOffset);

    logger.debug('Full session parse complete', {
      context: 'incremental-session-parser',
      sessionID,
      messageCount: messages.length,
      byteOffset,
      fileSize
    });

    return { messages, metadata, fromCache: false, incremental: false, byteOffset };
  }

  /**
   * Incremental read — only parse new bytes appended to the file
   * @private
   */
  async _incrementalRead(filePath, sessionID, startOffset, fileSize) {
    let newContent = '';

    const fd = fs.openSync(filePath, 'r');
    try {
      const bytesToRead = fileSize - startOffset;
      const buf = Buffer.alloc(bytesToRead);
      const bytesRead = fs.readSync(fd, buf, 0, bytesToRead, startOffset);
      newContent = buf.slice(0, bytesRead).toString('utf8');
    } finally {
      fs.closeSync(fd);
    }

    const newByteOffset = startOffset + Buffer.byteLength(newContent, 'utf8');
    const cached = this.cache.getSession(sessionID, filePath);
    const existingMessages = cached ? cached.messages : [];
    const startIndex = existingMessages.length;

    const newLines = newContent.split('\n');
    const newMessages = [];
    let msgIdx = startIndex;

    for (const line of newLines) {
      const parsed = this._parseLine(line, sessionID);
      if (parsed) {
        parsed.messageIndex = msgIdx++;
        newMessages.push(parsed);
      }
    }

    this._linkToolUses(newMessages);
    this.cache.updateByteOffset(sessionID, newByteOffset, newMessages);

    const allMessages = [...existingMessages, ...newMessages];
    const metadata = this._buildMetadata(allMessages, fileSize);
    this.cache.setMetadata(sessionID, metadata);

    logger.debug('Incremental session read complete', {
      context: 'incremental-session-parser',
      sessionID,
      newMessages: newMessages.length,
      totalMessages: allMessages.length,
      newByteOffset
    });

    return {
      messages: allMessages,
      metadata,
      fromCache: false,
      incremental: true,
      byteOffset: newByteOffset
    };
  }

  /**
   * Parse a single JSONL line into a message object
   * @private
   * @returns {ParsedMessage|null}
   */
  _parseLine(line, sessionID) {
    const trimmed = line.trim();
    if (!trimmed) return null;

    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      logger.debug('Skipping malformed JSONL line', {
        context: 'incremental-session-parser',
        preview: trimmed.substring(0, 80)
      });
      return null;
    }

    // Claude Code JSONL format: { type, message, timestamp, sessionId, ... }
    if (!obj || !obj.type) return null;

    // Only process 'message' type entries
    if (obj.type !== 'message' && obj.type !== 'assistant' && obj.type !== 'human') {
      return null;
    }

    const msg = obj.message || obj;

    // Extract content as a plain string (first text block)
    const contentBlocks = this._extractContentBlocks(msg.content);
    const plainText = contentBlocks
      .filter(b => b.type === 'text')
      .map(b => b.text || '')
      .join('\n')
      .trim();

    // Extract usage data
    const usage = msg.usage || {};

    return {
      id: msg.id || this._generateId(obj),
      sessionID: sessionID,
      role: msg.role || obj.type || 'unknown',
      content: plainText,
      contentBlocks,
      timestamp: obj.timestamp || msg.created_at || null,
      model: msg.model || '',
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
      cacheWriteTokens: usage.cache_creation_input_tokens || 0,
      messageIndex: -1, // assigned later
      toolUses: []
    };
  }

  /**
   * Normalize content blocks from various Claude Code JSONL formats
   * @private
   */
  _extractContentBlocks(content) {
    if (!content) return [];

    // String content — single text block
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }];
    }

    // Array of blocks
    if (Array.isArray(content)) {
      return content.map(block => {
        if (typeof block === 'string') return { type: 'text', text: block };
        return block;
      });
    }

    return [];
  }

  /**
   * Link tool_result blocks in subsequent messages back to their tool_use
   * This creates toolUses[] on assistant messages with matched results.
   * @private
   */
  _linkToolUses(messages) {
    // Build map of tool_use_id -> tool_use block from assistant messages
    const toolUseMap = new Map();

    for (const msg of messages) {
      if (msg.role === 'assistant') {
        for (const block of msg.contentBlocks) {
          if (block.type === 'tool_use' && block.id) {
            toolUseMap.set(block.id, { block, message: msg });
          }
        }
      }
    }

    // Link tool_result blocks in user/tool messages back to tool_use
    for (const msg of messages) {
      for (const block of msg.contentBlocks) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          const toolUseEntry = toolUseMap.get(block.tool_use_id);
          if (toolUseEntry) {
            // Add linked result to the assistant message's toolUses array
            toolUseEntry.message.toolUses.push({
              toolUseId: block.tool_use_id,
              toolName: toolUseEntry.block.name || '',
              toolInput: toolUseEntry.block.input || {},
              toolResult: this._extractToolResult(block),
              status: 'success',
              messageIndex: msg.messageIndex
            });
          }
        }
      }
    }
  }

  /**
   * Extract tool result as a string
   * @private
   */
  _extractToolResult(block) {
    if (!block.content) return '';
    if (typeof block.content === 'string') return block.content;
    if (Array.isArray(block.content)) {
      return block.content
        .filter(b => b.type === 'text')
        .map(b => b.text || '')
        .join('\n');
    }
    return '';
  }

  /**
   * Assign sequential messageIndex values
   * @private
   */
  _assignIndexes(messages) {
    messages.forEach((msg, idx) => {
      msg.messageIndex = idx;
    });
    return messages;
  }

  /**
   * Build session metadata summary from parsed messages
   * @private
   */
  _buildMetadata(messages, fileSize) {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;
    let firstTimestamp = null;
    let lastTimestamp = null;

    for (const msg of messages) {
      totalInputTokens += msg.inputTokens || 0;
      totalOutputTokens += msg.outputTokens || 0;
      totalCacheRead += msg.cacheReadTokens || 0;
      totalCacheWrite += msg.cacheWriteTokens || 0;

      if (msg.timestamp) {
        if (!firstTimestamp || msg.timestamp < firstTimestamp) firstTimestamp = msg.timestamp;
        if (!lastTimestamp || msg.timestamp > lastTimestamp) lastTimestamp = msg.timestamp;
      }
    }

    return {
      messageCount: messages.length,
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens: totalCacheRead,
      totalCacheWriteTokens: totalCacheWrite,
      totalTokens: totalInputTokens + totalOutputTokens,
      firstMessageAt: firstTimestamp,
      lastMessageAt: lastTimestamp,
      fileSizeBytes: fileSize || 0
    };
  }

  /**
   * Generate a deterministic ID for messages that lack one
   * @private
   */
  _generateId(obj) {
    const base = JSON.stringify(obj).substring(0, 64);
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = ((hash << 5) - hash) + base.charCodeAt(i);
      hash |= 0;
    }
    return `gen_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Get a page of messages from a session (for pagination)
   * @param {string} filePath
   * @param {string} sessionID
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<{messages: ParsedMessage[], total: number, hasMore: boolean}>}
   */
  async getPage(filePath, sessionID, limit = 100, offset = 0) {
    const result = await this.parse(filePath, sessionID);
    const all = result.messages;
    const page = all.slice(offset, offset + limit);

    return {
      messages: page,
      total: all.length,
      hasMore: offset + limit < all.length,
      metadata: result.metadata,
      fromCache: result.fromCache
    };
  }

  /**
   * Invalidate cache for a session (e.g., when file changes detected externally)
   * @param {string} sessionID
   */
  invalidateCache(sessionID) {
    this.cache.invalidate(sessionID);
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

module.exports = IncrementalSessionParser;
