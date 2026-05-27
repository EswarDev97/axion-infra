/**
 * Preference Validator — v2.0 schema validation and v1→v2 migration.
 *
 * @module lib/preference-validator
 */

'use strict';

const logger = require('./logger');

const VALID_SOURCES = ['manual', 'learned'];
const VALID_SEVERITIES = ['error', 'warning', 'info'];
const VALID_CATEGORIES = ['frontend', 'backend', 'database', 'devops', 'testing', 'workflow', 'framework'];

const RULE_REQUIRED_FIELDS = [
  'id', 'source', 'title', 'rule', 'applies_to', 'category',
  'severity', 'confidence', 'enabled', 'source_note', 'created_at', 'updated_at'
];

const FILE_REQUIRED_FIELDS = ['version', 'repo', 'created_at', 'updated_at', 'rules'];

/**
 * Validate a v2.0 preference file object.
 * @param {object} obj - Parsed JSON object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePreferenceFile(obj) {
  const errors = [];

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['File must be a JSON object'] };
  }

  // Validate file-level required fields
  for (const field of FILE_REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      errors.push(`Missing required file-level field: "${field}"`);
    }
  }

  // Validate rules array
  if (!Array.isArray(obj.rules)) {
    errors.push('Field "rules" must be an array');
    return { valid: errors.length === 0, errors };
  }

  // Validate each rule
  obj.rules.forEach((rule, index) => {
    const prefix = `Rule[${index}] (id: ${rule.id || 'unknown'})`;

    for (const field of RULE_REQUIRED_FIELDS) {
      if (rule[field] === undefined || rule[field] === null) {
        errors.push(`${prefix}: missing required field "${field}"`);
      }
    }

    if (rule.source !== undefined && !VALID_SOURCES.includes(rule.source)) {
      errors.push(`${prefix}: invalid source "${rule.source}" — must be one of: ${VALID_SOURCES.join(', ')}`);
    }

    if (rule.severity !== undefined && !VALID_SEVERITIES.includes(rule.severity)) {
      errors.push(`${prefix}: invalid severity "${rule.severity}" — must be one of: ${VALID_SEVERITIES.join(', ')}`);
    }

    if (rule.category !== undefined && !VALID_CATEGORIES.includes(rule.category)) {
      errors.push(`${prefix}: invalid category "${rule.category}" — must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (rule.confidence !== undefined && (typeof rule.confidence !== 'number' || rule.confidence < 0 || rule.confidence > 1)) {
      errors.push(`${prefix}: confidence must be a number between 0.0 and 1.0`);
    }

    if (rule.expires_when !== undefined && rule.expires_when !== null && typeof rule.expires_when !== 'string') {
      errors.push(`${prefix}: expires_when must be null or a string`);
    }
  });

  const valid = errors.length === 0;
  if (!valid) {
    logger.warn('Preference file validation failed', { context: 'preference-validator', errorCount: errors.length });
  }
  return { valid, errors };
}

/**
 * Migrate a v1.0 preferences file (preferences[]) to v2.0 (rules[]).
 * @param {object} v1obj - Parsed v1.0 JSON object
 * @returns {object} v2.0-compatible file object
 */
function migrateV1toV2(v1obj) {
  const now = new Date().toISOString();

  const CATEGORY_MAP = [
    { prefix: '04.web/', category: 'frontend' },
    { prefix: '02.backend/', category: 'backend' },
    { prefix: '97.deployment/database/', category: 'database' },
    { prefix: '.aicodepath/', category: 'framework' },
  ];

  const SESSION_DATE_RE = /session (\d{4}-\d{2}-\d{2})/i;

  const EXCLUDED_IDS = ['write-plan-persist-agent-recommendations'];
  const WORKAROUND_EXPIRES = {
    'extract-pure-utils-for-testability': 'When Jest/Babel transform issue is resolved in web-portal',
  };
  const SCOPE_FIXES = {
    'validate-assumption-before-code-fix': '*',
    'read-code-before-explaining-behavior': '*',
  };

  function inferCategory(appliesTo) {
    for (const { prefix, category } of CATEGORY_MAP) {
      if (appliesTo && appliesTo.startsWith(prefix)) return category;
    }
    return appliesTo === '*' ? 'workflow' : 'workflow';
  }

  function deriveSeverity(confidence) {
    if (confidence >= 0.90) return 'error';
    if (confidence >= 0.75) return 'warning';
    return 'info';
  }

  function parseCreatedAt(sourceNote) {
    const match = sourceNote && sourceNote.match(SESSION_DATE_RE);
    return match ? `${match[1]}T00:00:00Z` : now;
  }

  const sourcePreferences = Array.isArray(v1obj.preferences) ? v1obj.preferences : [];

  const rules = sourcePreferences
    .filter(p => !EXCLUDED_IDS.includes(p.id))
    .map(p => {
      const appliesTo = SCOPE_FIXES[p.id] || p.applies_to;
      const createdAt = parseCreatedAt(p.source);
      return {
        id: p.id,
        source: 'manual',
        title: p.title,
        rule: p.rule,
        applies_to: appliesTo,
        category: inferCategory(appliesTo),
        severity: deriveSeverity(p.confidence),
        confidence: p.confidence,
        enabled: true,
        expires_when: WORKAROUND_EXPIRES[p.id] || null,
        source_note: p.source,
        created_at: createdAt,
        updated_at: createdAt,
      };
    });

  return {
    version: '2.0',
    repo: v1obj.repo || '',
    created_at: now,
    updated_at: now,
    rules,
    signalHistory: v1obj.signalHistory || [],
    statistics: {
      totalRules: rules.length,
      totalSignals: 0,
      sessionsAnalyzed: 0,
      lastSessionId: null,
    },
  };
}

module.exports = { validatePreferenceFile, migrateV1toV2 };
