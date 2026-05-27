#!/usr/bin/env node
/**
 * AICodePath Configuration Validator
 *
 * Validates configuration against schema requirements.
 *
 * @module config-validator
 */

/**
 * Configuration schema
 */
const CONFIG_SCHEMA = {
  paths: {
    docsDirectory: { type: 'string', optional: false },
    checkpointStorage: { type: ['string', 'null'], optional: true },
    logsDirectory: { type: 'string', optional: false },
    templatesDirectory: { type: 'string', optional: false },
  },
  thresholds: {
    passingScore: { type: 'number', min: 0, max: 100, optional: false },
    warningScore: { type: 'number', min: 0, max: 100, optional: false },
    checkpointRetentionLimit: { type: 'number', min: 1, max: 1000, optional: false },
    checkpointReturnHours: { type: 'number', min: 1, max: 168, optional: false },
    logRetentionDays: { type: 'number', min: 1, max: 365, optional: false },
    maxIterationsPerPhase: { type: 'number', min: 1, max: 100, optional: false },
    maxIterationsGlobal: { type: 'number', min: 1, max: 500, optional: false },
    contextCompactionWarning: { type: 'number', min: 0, max: 100, optional: false },
    duplicationNearThreshold: { type: 'number', min: 0, max: 100, optional: false },
    duplicationStructuralThreshold: { type: 'number', min: 0, max: 100, optional: false },
    duplicationPassThreshold: { type: 'number', min: 0, max: 100, optional: false },
    duplicationReviewThreshold: { type: 'number', min: 0, max: 100, optional: false },
    coverageLines: { type: 'number', min: 0, max: 100, optional: false },
    coverageBranches: { type: 'number', min: 0, max: 100, optional: false },
    coverageFunctions: { type: 'number', min: 0, max: 100, optional: false },
    coverageStatements: { type: 'number', min: 0, max: 100, optional: false },
  },
  features: {
    autoCheckpoint: { type: 'boolean', optional: false },
    debugMode: { type: 'boolean', optional: false },
    verboseLogging: { type: 'boolean', optional: false },
    giclEnabled: { type: 'boolean', optional: false },
    mockDetection: { type: 'boolean', optional: false },
    duplicationDetection: { type: 'boolean', optional: false },
    ciIntegration: { type: 'boolean', optional: false },
    frontendDesigner: { type: 'boolean', optional: false },
  },
  session: {
    timeoutMinutes: { type: 'number', min: 1, max: 480, optional: false },
    autosaveMinutes: { type: 'number', min: 1, max: 60, optional: false },
  },
  safety: {
    mode: { type: 'string', enum: ['strict', 'standard', 'permissive'], optional: true, default: 'standard' },
    protectedPaths: { type: 'array', optional: true },
    blockSudo: { type: 'boolean', optional: true, default: true },
    blockForcePush: { type: 'boolean', optional: true, default: true },
    blockDestructiveRm: { type: 'boolean', optional: true, default: true },
  },
  gitOperations: {
    allowPush: { type: 'boolean', optional: true, default: true },
    allowForcePush: { type: 'boolean', optional: true, default: false },
    requireBranchPrefix: { type: ['string', 'null'], optional: true, default: null },
    protectedBranches: { type: 'array', optional: true },
  },
};

/**
 * Validate a value against a schema definition
 *
 * @param {string} key - Configuration key
 * @param {any} value - Value to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validation result
 */
function validateValue(key, value, schema) {
  const errors = [];
  const warnings = [];

  // Check if value exists
  if (value === undefined || value === null) {
    if (!schema.optional) {
      errors.push(`Missing required value: ${key}`);
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // Check type
  const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
  const valueType = Array.isArray(value) ? 'array' : typeof value;

  if (!expectedTypes.includes(valueType)) {
    errors.push(`Invalid type for ${key}: expected ${expectedTypes.join(' or ')}, got ${valueType}`);
  }

  // Check min/max for numbers
  if (valueType === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`Value for ${key} (${value}) is below minimum (${schema.min})`);
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push(`Value for ${key} (${value}) is above maximum (${schema.max})`);
    }
  }

  // Check enum constraints for strings
  if (valueType === 'string' && schema.enum && !schema.enum.includes(value)) {
    errors.push(`Invalid value for ${key}: "${value}" — must be one of: ${schema.enum.join(', ')}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate configuration object against schema
 *
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result
 */
function validateConfig(config) {
  const errors = [];
  const warnings = [];

  // Validate each section
  for (const [sectionName, sectionSchema] of Object.entries(CONFIG_SCHEMA)) {
    const section = config[sectionName];

    if (!section) {
      warnings.push(`Missing section: ${sectionName}`);
      continue;
    }

    // Validate each key in the section
    for (const [key, keySchema] of Object.entries(sectionSchema)) {
      const value = section[key];
      const fullKey = `${sectionName}.${key}`;
      const result = validateValue(fullKey, value, keySchema);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get the configuration schema
 *
 * @returns {Object} Configuration schema
 */
function getSchema() {
  return CONFIG_SCHEMA;
}

module.exports = {
  validateConfig,
  validateValue,
  getSchema,
  CONFIG_SCHEMA,
};
