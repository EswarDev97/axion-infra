/**
 * Feature Flag Manager
 *
 * Centralized feature flag system with three-tier priority:
 * 1. CLI overrides (highest priority, in-memory only)
 * 2. Config file (.aicodepath/config.json features.flags)
 * 3. Environment variables (backward compatibility)
 * 4. Compile-time defaults (fallback)
 *
 * @module lib/feature-flags
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

// Feature registry with defaults and descriptions
const KNOWN_FEATURES = [
  {
    name: 'gicl',
    default: true,
    description: 'Governed Iterative Construction Loop',
    envVar: 'AICODEPATH_GICL_DISABLED',
    envInverse: true,
  },
  {
    name: 'swarm',
    default: true,
    description: 'Multi-agent team orchestration via Claude Code Agent Teams',
    envVar: 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
  },
  {
    name: 'schema_context',
    default: true,
    description: 'PreToolUse hook that injects DB schema into context',
  },
  {
    name: 'visual_memory',
    default: true,
    description: 'ER diagram and visual artifact generation',
  },
  {
    name: 'terminal',
    default: true,
    description: 'Multi-tab PTY terminal integration',
  },
  {
    name: 'duplication_checker',
    default: true,
    description: 'Code duplication detection with SQL-aware analysis',
  },
  {
    name: 'statusline',
    default: true,
    description: 'Real-time statusline with token usage',
  },
  {
    name: 'mock_detection',
    default: true,
    description: 'Detects and blocks mock/stub implementations',
  },
  {
    name: 'frontend_designer',
    default: true,
    description: 'Adaptive frontend design validation',
  },
  {
    name: 'ci_integration',
    default: true,
    description: 'CI/CD lint parity checks',
  },
  {
    name: 'spec_sync',
    default: true,
    description: 'Spec-code sync validation on git push (blocks push if specs are stale)',
    envVar: 'AICODEPATH_SPEC_SYNC_DISABLED',
    envInverse: true,
  },
  {
    name: 'graph_nudge',
    default: true,
    description: 'Inject graph-indexed status into context before Glob/Grep searches',
    envVar: 'AICODEPATH_FLAG_GRAPH_NUDGE',
  },
];

// Build fast lookup maps
const defaultValues = new Map(KNOWN_FEATURES.map(f => [f.name, f.default]));
const envVarMap = new Map(
  KNOWN_FEATURES
    .filter(f => f.envVar)
    .map(f => [f.name, { envVar: f.envVar, inverse: f.envInverse || false }])
);

class FeatureFlags {
  /**
   * @param {string|null} projectPath - Project root (auto-detected if null)
   */
  constructor(projectPath = null) {
    this.projectRoot = projectPath || findProjectRoot(process.cwd());
    this.configPath = path.join(this.projectRoot, '.aicodepath', 'config.json');
    this.overrides = new Map(); // CLI overrides (in-memory only)
    this._config = null;
  }

  /**
   * Load config from disk (cached per instance).
   * @returns {Object} Parsed config
   */
  _loadConfig() {
    if (this._config) return this._config;

    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      this._config = JSON.parse(content);
    } catch (err) {
      logger.warn('Could not load config for feature flags', { error: err.message, context: 'feature-flags' });
      this._config = { features: { flags: {} } };
    }

    return this._config;
  }

  /**
   * Check if a feature is enabled.
   * Priority: CLI override > config file > environment variable > default
   *
   * @param {string} name - Feature name (e.g., 'gicl', 'swarm')
   * @returns {boolean} True if enabled
   */
  isEnabled(name) {
    // 1. CLI override (highest priority)
    if (this.overrides.has(name)) {
      return this.overrides.get(name);
    }

    // 2. Config file
    const config = this._loadConfig();
    if (config.features?.flags && name in config.features.flags) {
      return Boolean(config.features.flags[name]);
    }

    // 3. Environment variable (for backward compatibility)
    const envMapping = envVarMap.get(name);
    if (envMapping) {
      const value = process.env[envMapping.envVar];
      if (value !== undefined) {
        const envEnabled = value === 'true' || value === '1';
        return envMapping.inverse ? !envEnabled : envEnabled;
      }
    }

    // 4. Default value
    return defaultValues.get(name) ?? false;
  }

  /**
   * Set a CLI override (in-memory only, does not persist).
   *
   * @param {string} name - Feature name
   * @param {boolean} enabled - Enable/disable
   */
  setOverride(name, enabled) {
    this.overrides.set(name, Boolean(enabled));
    logger.info('Feature flag override set', { feature: name, enabled, context: 'feature-flags' });
  }

  /**
   * Clear a CLI override.
   *
   * @param {string} name - Feature name
   */
  clearOverride(name) {
    this.overrides.delete(name);
  }

  /**
   * Update feature in config file and save to disk.
   *
   * @param {string} name - Feature name
   * @param {boolean} enabled - Enable/disable
   */
  setEnabled(name, enabled) {
    const config = this._loadConfig();

    if (!config.features) config.features = {};
    if (!config.features.flags) config.features.flags = {};

    config.features.flags[name] = Boolean(enabled);

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      this._config = null; // Invalidate cache
      logger.info('Feature flag updated in config', { feature: name, enabled, context: 'feature-flags' });
    } catch (err) {
      logger.error('Failed to save feature flag config', { error: err.message, context: 'feature-flags' });
      throw new Error(`Could not save config: ${err.message}`);
    }
  }

  /**
   * List all known features with their current state.
   *
   * @returns {Array<Object>} Array of {name, enabled, default, description, source}
   */
  list() {
    return KNOWN_FEATURES.map(feature => {
      const enabled = this.isEnabled(feature.name);

      let source = 'default';
      if (this.overrides.has(feature.name)) {
        source = 'cli_override';
      } else {
        const config = this._loadConfig();
        if (config.features?.flags && feature.name in config.features.flags) {
          source = 'config';
        } else {
          const envMapping = envVarMap.get(feature.name);
          if (envMapping && process.env[envMapping.envVar] !== undefined) {
            source = 'env';
          }
        }
      }

      return {
        name: feature.name,
        enabled,
        default: feature.default,
        description: feature.description,
        source,
      };
    });
  }

  /**
   * Check if a feature name is known.
   *
   * @param {string} name - Feature name
   * @returns {boolean} True if known
   */
  isKnownFeature(name) {
    return defaultValues.has(name);
  }

  /**
   * Get feature metadata.
   *
   * @param {string} name - Feature name
   * @returns {Object|null} Feature object or null if unknown
   */
  getFeature(name) {
    return KNOWN_FEATURES.find(f => f.name === name) || null;
  }
}

// Singleton instance
let _instance = null;

/**
 * Get the global FeatureFlags instance.
 *
 * @returns {FeatureFlags}
 */
function getInstance() {
  if (!_instance) {
    _instance = new FeatureFlags();
  }
  return _instance;
}

/**
 * Convenience wrapper for isEnabled.
 *
 * @param {string} name - Feature name
 * @returns {boolean}
 */
function isEnabled(name) {
  return getInstance().isEnabled(name);
}

module.exports = {
  FeatureFlags,
  getInstance,
  isEnabled,
  KNOWN_FEATURES,
};
