/**
 * z.ai Provider Adapter
 *
 * Detects and normalizes statusline data when Claude Code is routed through
 * the z.ai API gateway (which serves GLM models instead of Anthropic models).
 *
 * Detection criteria:
 *   - model.name starts with 'glm-'
 *   - ANTHROPIC_BASE_URL environment variable contains 'z.ai'
 *
 * Normalization:
 *   - rate_limits: always { five_hour: null, seven_day: null } (not exposed by z.ai)
 *   - cost_usd: always null (pricing not exposed by z.ai)
 */

'use strict';

const logger = require('../logger');

/**
 * Map a raw GLM model name to the display string used in the statusline.
 *
 * Known models get a canonical casing; all other glm-* names are uppercased.
 *
 * @param {string} rawName - e.g. 'glm-4.7'
 * @returns {string} - e.g. 'z.ai GLM-4.7'
 */
function toModelDisplay(rawName) {
  const known = {
    'glm-4.7': 'z.ai GLM-4.7',
    'glm-5.1': 'z.ai GLM-5.1',
  };

  if (known[rawName]) {
    return known[rawName];
  }

  // Generic fallback: uppercase the whole model name portion
  return 'z.ai ' + rawName.toUpperCase();
}

/**
 * Derive the short display label from the full display string.
 * Strips the 'z.ai ' prefix so only 'GLM-X.X' (or equivalent) remains.
 *
 * @param {string} display - e.g. 'z.ai GLM-4.7'
 * @returns {string} - e.g. 'GLM-4.7'
 */
function toModelDisplayShort(display) {
  return display.replace(/^z\.ai /, '');
}

const zaiAdapter = {
  /** Canonical provider name */
  name: 'z.ai',

  /**
   * Returns true when this adapter should handle the given statusline data.
   *
   * @param {object} data - Raw statusline JSON (may be partial / empty object)
   * @param {object} env  - Environment variables map (e.g. process.env)
   * @returns {boolean}
   */
  detect(data, env) {
    const modelName = data && data.model && data.model.name;
    if (modelName && modelName.startsWith('glm-')) {
      logger.debug('zai-adapter: detected via model name', { context: 'zai-adapter', model: modelName });
      return true;
    }

    const baseUrl = env && env.ANTHROPIC_BASE_URL;
    if (baseUrl && baseUrl.includes('z.ai')) {
      logger.debug('zai-adapter: detected via ANTHROPIC_BASE_URL', { context: 'zai-adapter', baseUrl });
      return true;
    }

    return false;
  },

  /**
   * Normalizes raw statusline data into the canonical shape consumed by the
   * statusline renderer.
   *
   * @param {object} data - Raw statusline JSON
   * @returns {object} Normalized statusline object
   */
  normalize(data) {
    const rawName = (data.model && data.model.name) || '';
    const display = toModelDisplay(rawName);
    const displayShort = toModelDisplayShort(display);

    // Prefer pre-computed used_percentage; fall back to token-ratio calculation
    let contextPercent = null;
    if (data.context_window) {
      if (data.context_window.used_percentage != null) {
        contextPercent = data.context_window.used_percentage;
      } else if (data.context_window.context_window_size && data.usage && data.usage.total_tokens) {
        contextPercent = (data.usage.total_tokens / data.context_window.context_window_size) * 100;
      }
    }

    const normalized = {
      provider: 'z.ai',
      model_display: display,
      model_display_short: displayShort,
      context_percent: contextPercent,
      rate_limits: {
        five_hour: null,
        seven_day: null,
      },
      cost_usd: null,
    };

    logger.debug('zai-adapter: normalized', { context: 'zai-adapter', normalized });
    return normalized;
  },
};

module.exports = zaiAdapter;
