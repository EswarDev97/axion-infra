/**
 * ConversationSearcher - Cross-conversation search engine
 *
 * Provides full-text and regex search across all AI conversation sessions.
 * Uses SQLite FTS5 for fast full-text search and regex for precise matching.
 *
 * @module lib/conversation-searcher
 */

'use strict';

const Database = require('better-sqlite3');
const { getDbPath } = require('./path-resolver');
const logger = require('./logger');

/**
 * @typedef {Object} SearchOptions
 * @property {string} query - Search query string
 * @property {boolean} [useRegex=false] - Use regex pattern matching
 * @property {boolean} [caseSensitive=false] - Case-sensitive search
 * @property {number} [maxResults=100] - Maximum results to return
 * @property {string} [adapterFilter] - Filter by adapter ID (e.g., 'claude-code')
 * @property {string} [roleFilter] - Filter by role ('user' or 'assistant')
 * @property {string} [modelFilter] - Filter by model name
 * @property {string} [beforeDate] - ISO timestamp - only search before this date
 * @property {string} [afterDate] - ISO timestamp - only search after this date
 * @property {string} [sessionID] - Limit search to specific session
 */

/**
 * @typedef {Object} ContentMatch
 * @property {string} blockType - 'text' | 'tool_use' | 'tool_result' | 'thinking'
 * @property {number} lineNo - Line number in content (1-indexed)
 * @property {string} lineText - Full line containing match
 * @property {number} colStart - Match start column (0-indexed)
 * @property {number} colEnd - Match end column (0-indexed)
 * @property {string} highlightedLine - Line with match highlighted using **bold**
 */

/**
 * @typedef {Object} MessageMatch
 * @property {string} messageID - Message ID
 * @property {number} messageIdx - Message index in session (0-indexed)
 * @property {string} sessionID - Parent session ID
 * @property {string} sessionName - Session name
 * @property {string} adapterID - Adapter ID
 * @property {string} role - 'user' | 'assistant'
 * @property {string} timestamp - ISO timestamp
 * @property {string} model - Model name
 * @property {ContentMatch[]} matches - Array of content matches in this message
 * @property {number} relevanceScore - BM25 relevance score (FTS only)
 */

class ConversationSearcher {
  constructor(dbPath = null) {
    this.dbPath = dbPath || getDbPath();
    this.db = null;
  }

  /**
   * Initialize database connection (lazy, read-only)
   * @private
   */
  _initDb() {
    if (!this.db) {
      this.db = new Database(this.dbPath, { readonly: true });
      this.db.pragma('journal_mode = WAL');
    }
  }

  /**
   * Execute search across all conversation sessions
   * @param {SearchOptions} options
   * @returns {Promise<MessageMatch[]>}
   */
  async search(options) {
    const startTime = Date.now();
    this._initDb();

    const {
      query,
      useRegex = false,
      caseSensitive = false,
      maxResults = 100,
      adapterFilter,
      roleFilter,
      modelFilter,
      beforeDate,
      afterDate,
      sessionID
    } = options;

    if (!query || query.trim().length === 0) {
      return [];
    }

    let results = [];

    try {
      if (useRegex) {
        results = this._regexSearch({
          query, caseSensitive, maxResults,
          adapterFilter, roleFilter, modelFilter,
          beforeDate, afterDate, sessionID
        });
      } else {
        results = this._ftsSearch({
          query, maxResults,
          adapterFilter, roleFilter, modelFilter,
          beforeDate, afterDate, sessionID
        });
      }

      const executionTime = Date.now() - startTime;

      this._recordSearch({
        query, useRegex, caseSensitive,
        adapterFilter, resultCount: results.length, executionTime
      });

      logger.info('Conversation search complete', {
        context: 'conversation-searcher',
        query,
        useRegex,
        resultCount: results.length,
        executionTimeMs: executionTime
      });

      return results;

    } catch (error) {
      logger.error('Search failed', {
        context: 'conversation-searcher',
        error: error.message,
        query,
        useRegex
      });
      throw error;
    }
  }

  /**
   * FTS5 full-text search using Porter stemming and BM25 ranking
   * @private
   */
  _ftsSearch(options) {
    const {
      query, maxResults,
      adapterFilter, roleFilter, modelFilter,
      beforeDate, afterDate, sessionID
    } = options;

    const ftsQuery = this._buildFTSQuery(query);
    const whereClauses = [];
    const params = { ftsQuery, maxResults };

    if (adapterFilter) {
      whereClauses.push('s.adapter_id = $adapterFilter');
      params.adapterFilter = adapterFilter;
    }
    if (roleFilter) {
      whereClauses.push('m.role = $roleFilter');
      params.roleFilter = roleFilter;
    }
    if (modelFilter) {
      whereClauses.push('m.model = $modelFilter');
      params.modelFilter = modelFilter;
    }
    if (beforeDate) {
      whereClauses.push('m.timestamp < $beforeDate');
      params.beforeDate = beforeDate;
    }
    if (afterDate) {
      whereClauses.push('m.timestamp > $afterDate');
      params.afterDate = afterDate;
    }
    if (sessionID) {
      whereClauses.push('m.session_id = $sessionID');
      params.sessionID = sessionID;
    }

    const andClause = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

    // Check if FTS table exists
    const ftsExists = this._tableExists('ai_messages_fts');
    if (!ftsExists) {
      // Fall back to LIKE search if FTS index not yet created
      return this._likeSearch(options);
    }

    const sql = `
      SELECT
        m.id AS message_id,
        m.session_id,
        m.role,
        m.timestamp,
        m.model,
        m.content,
        m.line_number,
        s.name AS session_name,
        s.adapter_id,
        fts.rank AS relevance_score
      FROM ai_messages_fts fts
      JOIN ai_messages m ON m.rowid = fts.rowid
      JOIN ai_sessions s ON s.id = m.session_id
      WHERE fts MATCH $ftsQuery
      ${andClause}
      ORDER BY fts.rank
      LIMIT $maxResults
    `;

    try {
      const rows = this.db.prepare(sql).all(params);
      return rows.map(row => this._buildMessageMatch(row, query, false));
    } catch (err) {
      logger.warn('FTS5 search failed, falling back to LIKE', {
        context: 'conversation-searcher',
        error: err.message
      });
      return this._likeSearch(options);
    }
  }

  /**
   * LIKE-based search fallback when FTS5 index is unavailable
   * @private
   */
  _likeSearch(options) {
    const {
      query, maxResults,
      adapterFilter, roleFilter, modelFilter,
      beforeDate, afterDate, sessionID
    } = options;

    const whereClauses = ["m.content LIKE $likeQuery"];
    const params = { likeQuery: `%${query}%`, maxResults };

    if (adapterFilter) { whereClauses.push('s.adapter_id = $adapterFilter'); params.adapterFilter = adapterFilter; }
    if (roleFilter) { whereClauses.push('m.role = $roleFilter'); params.roleFilter = roleFilter; }
    if (modelFilter) { whereClauses.push('m.model = $modelFilter'); params.modelFilter = modelFilter; }
    if (beforeDate) { whereClauses.push('m.timestamp < $beforeDate'); params.beforeDate = beforeDate; }
    if (afterDate) { whereClauses.push('m.timestamp > $afterDate'); params.afterDate = afterDate; }
    if (sessionID) { whereClauses.push('m.session_id = $sessionID'); params.sessionID = sessionID; }

    const sql = `
      SELECT
        m.id AS message_id,
        m.session_id,
        m.role,
        m.timestamp,
        m.model,
        m.content,
        m.line_number,
        s.name AS session_name,
        s.adapter_id,
        0 AS relevance_score
      FROM ai_messages m
      JOIN ai_sessions s ON s.id = m.session_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY m.timestamp DESC
      LIMIT $maxResults
    `;

    const rows = this.db.prepare(sql).all(params);
    return rows.map(row => this._buildMessageMatch(row, query, false));
  }

  /**
   * Regex pattern search — slower but more precise
   * @private
   */
  _regexSearch(options) {
    const {
      query, caseSensitive, maxResults,
      adapterFilter, roleFilter, modelFilter,
      beforeDate, afterDate, sessionID
    } = options;

    let regex;
    try {
      regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${error.message}`);
    }

    const whereClauses = [];
    const params = {};

    if (adapterFilter) { whereClauses.push('s.adapter_id = $adapterFilter'); params.adapterFilter = adapterFilter; }
    if (roleFilter) { whereClauses.push('m.role = $roleFilter'); params.roleFilter = roleFilter; }
    if (modelFilter) { whereClauses.push('m.model = $modelFilter'); params.modelFilter = modelFilter; }
    if (beforeDate) { whereClauses.push('m.timestamp < $beforeDate'); params.beforeDate = beforeDate; }
    if (afterDate) { whereClauses.push('m.timestamp > $afterDate'); params.afterDate = afterDate; }
    if (sessionID) { whereClauses.push('m.session_id = $sessionID'); params.sessionID = sessionID; }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT
        m.id AS message_id,
        m.session_id,
        m.role,
        m.timestamp,
        m.model,
        m.content,
        m.line_number,
        s.name AS session_name,
        s.adapter_id
      FROM ai_messages m
      JOIN ai_sessions s ON s.id = m.session_id
      ${whereClause}
      ORDER BY m.timestamp DESC
    `;

    const rows = this.db.prepare(sql).all(params);
    const results = [];

    for (const row of rows) {
      if (results.length >= maxResults) break;

      const content = row.content || '';
      regex.lastIndex = 0;
      if (!regex.test(content)) continue;
      regex.lastIndex = 0;

      const messageMatch = this._buildMessageMatch(row, query, true, regex);
      if (messageMatch.matches.length > 0) {
        results.push(messageMatch);
      }
    }

    return results;
  }

  /**
   * Build FTS5 MATCH query with special character escaping
   * @private
   */
  _buildFTSQuery(query) {
    // Escape FTS5 special characters
    const escaped = query
      .replace(/"/g, '""')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\^/g, '\\^')
      .replace(/\*/g, '\\*')
      .replace(/:/g, '\\:');

    // Phrase search for multi-word queries
    if (escaped.includes(' ')) {
      return `"${escaped}"`;
    }

    // Prefix matching for single words (finds "test" in "testing")
    return `${escaped}*`;
  }

  /**
   * Build a MessageMatch result from a DB row
   * @private
   */
  _buildMessageMatch(row, query, isRegex, regex = null) {
    const content = row.content || '';

    const matches = isRegex
      ? this._extractRegexMatches(content, regex)
      : this._extractFTSMatches(content, query);

    return {
      messageID: row.message_id,
      messageIdx: row.line_number || 0,
      sessionID: row.session_id,
      sessionName: row.session_name || '',
      adapterID: row.adapter_id,
      role: row.role,
      timestamp: row.timestamp,
      model: row.model || '',
      matches,
      relevanceScore: row.relevance_score || 0
    };
  }

  /**
   * Extract regex matches with line/column info
   * @private
   */
  _extractRegexMatches(content, regex) {
    const matches = [];
    const lines = content.split('\n');

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const lineText = lines[lineNo];
      regex.lastIndex = 0;

      let match;
      while ((match = regex.exec(lineText)) !== null) {
        matches.push({
          blockType: 'text',
          lineNo: lineNo + 1,
          lineText,
          colStart: match.index,
          colEnd: match.index + match[0].length,
          highlightedLine: this._highlightMatch(lineText, match.index, match.index + match[0].length)
        });

        // Prevent infinite loop on zero-width matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    }

    return matches;
  }

  /**
   * Extract FTS matches using simple substring search
   * @private
   */
  _extractFTSMatches(content, query) {
    const matches = [];
    const lines = content.split('\n');
    const queryLower = query.toLowerCase();

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const lineText = lines[lineNo];
      const lineLower = lineText.toLowerCase();

      let startIdx = 0;
      while ((startIdx = lineLower.indexOf(queryLower, startIdx)) !== -1) {
        const endIdx = startIdx + query.length;

        matches.push({
          blockType: 'text',
          lineNo: lineNo + 1,
          lineText,
          colStart: startIdx,
          colEnd: endIdx,
          highlightedLine: this._highlightMatch(lineText, startIdx, endIdx)
        });

        startIdx = endIdx;
      }
    }

    return matches;
  }

  /**
   * Highlight a match range in a line using **bold** markers
   * @private
   */
  _highlightMatch(lineText, startCol, endCol) {
    const before = lineText.substring(0, startCol);
    const match = lineText.substring(startCol, endCol);
    const after = lineText.substring(endCol);
    return `${before}**${match}**${after}`;
  }

  /**
   * Record a search in ai_search_history (non-blocking, uses separate write connection)
   * @private
   */
  _recordSearch(data) {
    try {
      const writeDb = new Database(this.dbPath);
      writeDb.prepare(`
        INSERT INTO ai_search_history
        (query, use_regex, case_sensitive, adapter_filter, result_count, execution_time_ms)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.query,
        data.useRegex ? 1 : 0,
        data.caseSensitive ? 1 : 0,
        data.adapterFilter || null,
        data.resultCount,
        data.executionTime
      );
      writeDb.close();
    } catch (error) {
      logger.debug('Failed to record search history', {
        context: 'conversation-searcher',
        error: error.message
      });
    }
  }

  /**
   * Check whether a table exists in the database
   * @private
   */
  _tableExists(tableName) {
    try {
      const row = this.db.prepare(
        `SELECT name FROM sqlite_master WHERE type IN ('table','shadow') AND name = ?`
      ).get(tableName);
      return !!row;
    } catch {
      return false;
    }
  }

  /**
   * Get recent search queries for autocomplete suggestions
   * @param {number} limit - Max suggestions to return
   * @returns {string[]}
   */
  getSearchSuggestions(limit = 10) {
    this._initDb();

    try {
      const rows = this.db.prepare(`
        SELECT DISTINCT query
        FROM ai_search_history
        WHERE result_count > 0
        ORDER BY searched_at DESC
        LIMIT ?
      `).all(limit);
      return rows.map(r => r.query);
    } catch {
      return [];
    }
  }

  /**
   * Get search analytics from history
   * @returns {Object}
   */
  getSearchStats() {
    this._initDb();

    try {
      return this.db.prepare(`
        SELECT
          COUNT(*) as total_searches,
          COUNT(DISTINCT query) as unique_queries,
          AVG(result_count) as avg_results,
          AVG(execution_time_ms) as avg_execution_time_ms,
          SUM(CASE WHEN use_regex THEN 1 ELSE 0 END) as regex_searches,
          SUM(CASE WHEN result_count = 0 THEN 1 ELSE 0 END) as zero_result_searches
        FROM ai_search_history
      `).get();
    } catch {
      return {
        total_searches: 0,
        unique_queries: 0,
        avg_results: 0,
        avg_execution_time_ms: 0,
        regex_searches: 0,
        zero_result_searches: 0
      };
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = ConversationSearcher;
