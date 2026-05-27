#!/usr/bin/env node
/**
 * AICodePath Configuration Loader
 *
 * Centralized configuration management with:
 * - Default values for all settings
 * - Deep merge with user config.json
 * - Environment variable overrides
 * - Path resolution to absolute paths
 * - Singleton pattern for performance
 *
 * @module config-loader
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./path-resolver');

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  paths: {
    docsDirectory: 'aicodepath-docs',
    checkpointStorage: null, // null = use default in checkpoint-manager
    logsDirectory: '.aicodepath/logs',
    templatesDirectory: '.aicodepath/templates',
  },
  thresholds: {
    passingScore: 90,
    warningScore: 70,
    checkpointRetentionLimit: 50,
    checkpointReturnHours: 24,
    logRetentionDays: 30,
    maxIterationsPerPhase: 10,
    maxIterationsGlobal: 50,
    contextCompactionWarning: 80,
    duplicationNearThreshold: 70,
    duplicationStructuralThreshold: 80,
    duplicationPassThreshold: 5,
    duplicationReviewThreshold: 15,
    coverageLines: 80,
    coverageBranches: 75,
    coverageFunctions: 80,
    coverageStatements: 80,
  },
  features: {
    autoCheckpoint: true,
    debugMode: false,
    verboseLogging: false,
    giclEnabled: true,
    mockDetection: true,
    duplicationDetection: true,
    ciIntegration: true,
    frontendDesigner: true,
  },
  session: {
    timeoutMinutes: 60,
    autosaveMinutes: 5,
  },
};

/**
 * Environment variable mappings
 * Maps AICODEPATH_* env vars to config paths
 */
const ENV_MAPPINGS = {
  'AICODEPATH_DOCS_DIR': 'paths.docsDirectory',
  'AICODEPATH_LOGS_DIR': 'paths.logsDirectory',
  'AICODEPATH_TEMPLATES_DIR': 'paths.templatesDirectory',
  'AICODEPATH_PASSING_SCORE': 'thresholds.passingScore',
  'AICODEPATH_WARNING_SCORE': 'thresholds.warningScore',
  'AICODEPATH_CHECKPOINT_LIMIT': 'thresholds.checkpointRetentionLimit',
  'AICODEPATH_RETURN_HOURS': 'thresholds.checkpointReturnHours',
  'AICODEPATH_MAX_ITERATIONS': 'thresholds.maxIterationsPerPhase',
  'AICODEPATH_DEBUG': 'features.debugMode',
  'AICODEPATH_VERBOSE': 'features.verboseLogging',
  'AICODEPATH_GICL_DISABLED': 'features.giclEnabled', // Inverted logic
};

/**
 * ConfigLoader class
 *
 * Loads, merges, and provides access to configuration.
 */
class ConfigLoader {
  /**
   * @param {string} configPath - Path to config.json
   */
  constructor(configPath = null) {
    this.configPath = configPath || path.join(findProjectRoot(), '.aicodepath', 'config.json');
    this._config = null;
    this._projectRoot = findProjectRoot();
  }

  /**
   * Load configuration
   *
   * @param {boolean} forceReload - Force reload from disk
   * @returns {Object} Configuration object
   */
  load(forceReload = false) {
    if (this._config && !forceReload) {
      return this._config;
    }

    try {
      // Start with defaults
      let config = this._deepClone(DEFAULT_CONFIG);

      // Load user config if exists
      if (fs.existsSync(this.configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        config = this._deepMerge(config, userConfig);
      }

      // Apply environment variable overrides
      config = this._applyEnvOverrides(config);

      // Resolve paths to absolute
      config.paths = this._resolvePaths(config.paths);

      this._config = config;
      return this._config;
    } catch (error) {
      console.warn(`[Config] Using defaults: ${error.message}`);
      this._config = this._deepClone(DEFAULT_CONFIG);
      this._config.paths = this._resolvePaths(this._config.paths);
      return this._config;
    }
  }

  /**
   * Get configuration value by dot-notation key
   *
   * @param {string} key - Dot-notation key (e.g., 'thresholds.passingScore')
   * @param {any} defaultValue - Default value if key not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = null) {
    const config = this.load();
    return key.split('.').reduce((obj, k) => obj?.[k], config) ?? defaultValue;
  }

  /**
   * Get resolved paths object
   *
   * @returns {Object} Resolved paths
   */
  getPaths() {
    const config = this.load();
    return config.paths;
  }

  /**
   * Get thresholds object
   *
   * @returns {Object} Thresholds
   */
  getThresholds() {
    const config = this.load();
    return config.thresholds;
  }

  /**
   * Get features object
   *
   * @returns {Object} Features
   */
  getFeatures() {
    const config = this.load();
    return config.features;
  }

  /**
   * Check if a feature is enabled
   *
   * @deprecated Use lib/feature-flags.js isEnabled() instead — this method
   * uses different flag names and different config paths. Kept for backward
   * compatibility but should not be used in new code.
   *
   * @param {string} featureName - Feature name
   * @returns {boolean} True if enabled
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`, false) === true;
  }

  /**
   * Reload configuration from disk
   *
   * @returns {Object} Reloaded configuration
   */
  reload() {
    this._config = null;
    return this.load(true);
  }

  /**
   * Get project root
   *
   * @returns {string} Project root path
   */
  getProjectRoot() {
    return this._projectRoot;
  }

  /**
   * Deep merge objects
   *
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   * @private
   */
  _deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Deep clone object
   *
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   * @private
   */
  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Apply environment variable overrides
   *
   * @param {Object} config - Configuration object
   * @returns {Object} Configuration with env overrides applied
   * @private
   */
  _applyEnvOverrides(config) {
    const result = this._deepClone(config);

    for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
      const envValue = process.env[envVar];
      if (envValue === undefined) continue;

      // Parse the value
      let parsedValue = envValue;
      if (envValue.toLowerCase() === 'true') {
        parsedValue = true;
      } else if (envValue.toLowerCase() === 'false') {
        parsedValue = false;
      } else if (!isNaN(Number(envValue))) {
        parsedValue = Number(envValue);
      }

      // Handle inverted logic for GICL
      if (envVar === 'AICODEPATH_GICL_DISABLED') {
        parsedValue = !parsedValue;
      }

      // Set the value using dot notation
      const keys = configPath.split('.');
      let obj = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in obj)) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = parsedValue;
    }

    return result;
  }

  /**
   * Resolve paths to absolute paths
   *
   * @param {Object} paths - Paths object
   * @returns {Object} Resolved paths
   * @private
   */
  _resolvePaths(paths) {
    const resolved = {};
    for (const [key, value] of Object.entries(paths)) {
      if (value === null || value === undefined) {
        resolved[key] = value;
      } else if (path.isAbsolute(value)) {
        resolved[key] = value;
      } else {
        resolved[key] = path.resolve(this._projectRoot, value);
      }
    }
    return resolved;
  }
}

// Singleton instance
const config = new ConfigLoader();

module.exports = { ConfigLoader, config, DEFAULT_CONFIG };
