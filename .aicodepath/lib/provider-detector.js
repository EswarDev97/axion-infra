'use strict';

const logger = require('./logger');
const adapters = [
  require('./providers/zai-adapter'),
  require('./providers/anthropic-adapter'),
];

/**
 * Inspect statusline data and environment variables to determine which
 * provider adapter should handle the data.
 *
 * The adapter list is ordered so that more-specific providers are evaluated
 * first (z.ai) and the catch-all fallback (anthropic) is last.
 *
 * @param {object} data - Raw statusline JSON from Claude Code
 * @param {object} [env] - Environment variables map; defaults to process.env
 * @returns {object} The matched provider adapter
 */
function detectProvider(data, env) {
  const e = env || process.env;
  for (const adapter of adapters) {
    if (adapter.detect(data, e)) {
      logger.debug('provider-detector: matched', { context: 'provider-detector', provider: adapter.name });
      return adapter;
    }
  }
}

/**
 * Detect the provider from statusline data and return the normalized shape.
 *
 * @param {object} data - Raw statusline JSON from Claude Code
 * @param {object} [env] - Environment variables map; defaults to process.env
 * @returns {object} Normalized statusline object produced by the matched adapter
 */
function normalizeStatuslineData(data, env) {
  const adapter = detectProvider(data, env);
  return adapter.normalize(data);
}

module.exports = { detectProvider, normalizeStatuslineData };
