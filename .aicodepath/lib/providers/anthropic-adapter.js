/**
 * Anthropic Provider Adapter
 *
 * Detects and normalizes statusline data from the Anthropic API.
 * This adapter is the final fallback — it matches any data shape that
 * does not belong to a more specific provider.
 */

'use strict';

const logger = require('../logger');

/**
 * Provider adapter for the Anthropic API.
 *
 * @type {{ name: string, detect: Function, normalize: Function }}
 */
const anthropicAdapter = {
  name: 'anthropic',

  /**
   * Always returns true — Anthropic is the final fallback provider.
   *
   * @param {object} _data - Parsed statusline JSON (unused for detection)
   * @param {object} _env  - Process environment (unused for detection)
   * @returns {boolean}
   */
  detect(_data, _env) {
    return true;
  },

  /**
   * Normalize raw Anthropic statusline JSON into the canonical shape.
   *
   * @param {object} data - Raw parsed statusline JSON from Claude Code
   * @returns {{
   *   provider: string,
   *   model_display: string|undefined,
   *   model_display_short: string|undefined,
   *   context_percent: number|undefined,
   *   rate_limits: { five_hour: number|undefined, seven_day: number|undefined },
   *   cost_usd: number|undefined
   * }}
   */
  normalize(data) {
    logger.info('anthropic-adapter: normalizing statusline data', { context: 'anthropic-adapter' });

    const displayName = data.model && data.model.display_name;
    const modelDisplayShort = displayName
      ? displayName.replace(/^Claude\s+/i, '')
      : undefined;

    return {
      provider: 'anthropic',
      model_display: displayName || undefined,
      model_display_short: modelDisplayShort,
      context_percent: data.context_window && data.context_window.used_percentage,
      rate_limits: {
        five_hour:
          data.rate_limits &&
          data.rate_limits.five_hour &&
          data.rate_limits.five_hour.used_percentage,
        seven_day:
          data.rate_limits &&
          data.rate_limits.seven_day &&
          data.rate_limits.seven_day.used_percentage,
      },
      cost_usd: data.cost && data.cost.total_cost_usd,
    };
  },
};

module.exports = anthropicAdapter;
