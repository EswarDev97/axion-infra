/**
 * Conversation Search API Routes
 *
 * Provides full-text and regex search across all AI conversation sessions.
 *
 * Routes:
 *   GET /api/conversations/search?q=<query>&regex=<bool>&...
 *   GET /api/conversations/search/suggestions?limit=10
 *   GET /api/conversations/search/stats
 */

'use strict';

const express = require('express');
const router = express.Router();
const ConversationSearcher = require('../../lib/conversation-searcher');
const logger = require('../../lib/logger');

/**
 * GET /api/conversations/search
 *
 * Search across all conversation sessions using FTS5 or regex.
 *
 * Query params:
 * - q          (string, required) Search query
 * - regex      (bool)   Use regex pattern matching (default: false)
 * - case       (bool)   Case-sensitive search (default: false)
 * - max        (int)    Max results, capped at 500 (default: 100)
 * - adapter    (string) Filter by adapter ID (e.g., 'claude-code')
 * - role       (string) Filter by role ('user' | 'assistant')
 * - model      (string) Filter by model name
 * - before     (string) ISO timestamp - search before this date
 * - after      (string) ISO timestamp - search after this date
 * - session    (string) Limit to specific session ID
 */
router.get('/search', async (req, res) => {
  let searcher;
  try {
    const {
      q: query,
      regex,
      case: caseSensitive,
      max,
      adapter,
      role,
      model,
      before,
      after,
      session
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Missing required parameter: q' });
    }

    const maxResults = Math.min(parseInt(max) || 100, 500);
    const useRegex = regex === 'true' || regex === '1';
    const isCaseSensitive = caseSensitive === 'true' || caseSensitive === '1';

    searcher = new ConversationSearcher();

    const results = await searcher.search({
      query,
      useRegex,
      caseSensitive: isCaseSensitive,
      maxResults,
      adapterFilter: adapter,
      roleFilter: role,
      modelFilter: model,
      beforeDate: before,
      afterDate: after,
      sessionID: session
    });

    res.json({
      query,
      useRegex,
      caseSensitive: isCaseSensitive,
      resultCount: results.length,
      results
    });

  } catch (error) {
    logger.error('Conversation search failed', {
      context: 'conversation-search-route',
      error: error.message
    });
    res.status(500).json({ error: error.message });
  } finally {
    if (searcher) try { searcher.close(); } catch (_) { /* ignore */ }
  }
});

/**
 * GET /api/conversations/search/suggestions
 *
 * Get recent search queries for autocomplete.
 *
 * Query params:
 * - limit (int) Max suggestions, capped at 50 (default: 10)
 */
router.get('/search/suggestions', async (req, res) => {
  let searcher;
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    searcher = new ConversationSearcher();
    const suggestions = searcher.getSearchSuggestions(limit);

    res.json({ suggestions });

  } catch (error) {
    logger.error('Failed to get search suggestions', {
      context: 'conversation-search-route',
      error: error.message
    });
    res.status(500).json({ error: error.message });
  } finally {
    if (searcher) try { searcher.close(); } catch (_) { /* ignore */ }
  }
});

/**
 * GET /api/conversations/search/stats
 *
 * Get aggregated search analytics from history.
 */
router.get('/search/stats', async (req, res) => {
  let searcher;
  try {
    searcher = new ConversationSearcher();
    const stats = searcher.getSearchStats();

    res.json(stats);

  } catch (error) {
    logger.error('Failed to get search stats', {
      context: 'conversation-search-route',
      error: error.message
    });
    res.status(500).json({ error: error.message });
  } finally {
    if (searcher) try { searcher.close(); } catch (_) { /* ignore */ }
  }
});

module.exports = router;
