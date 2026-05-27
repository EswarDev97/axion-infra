/**
 * Confidence Checker - Pre-implementation confidence scoring
 *
 * 5 weighted checks before starting implementation:
 * - noduplicates:  25% — existing implementation searched
 * - architecture:  25% — approach matches project patterns
 * - docs:          20% — official documentation verified
 * - oss:           15% — open source reference found
 * - rootcause:     15% — root cause identified (for bugs)
 *
 * Thresholds: ≥90% PROCEED, 70-89% ALTERNATIVES, <70% STOP
 *
 * @module lib/confidence-checker
 */

'use strict';

const WEIGHTS = {
  noduplicates: 25,
  architecture: 25,
  docs:         20,
  oss:          15,
  rootcause:    15,
};

/**
 * @typedef {Object} ConfidenceContext
 * @property {boolean} hasSearchedDuplicates  - Searched for existing implementations
 * @property {boolean} architectureCompliant  - Approach matches existing patterns
 * @property {boolean} docsVerified           - Official docs read and cited
 * @property {boolean} ossReferenceFound      - Battle-tested OSS example found
 * @property {boolean} rootCauseIdentified    - Root cause understood (bug fixes)
 */

/**
 * @typedef {Object} ConfidenceResult
 * @property {number}  score           - 0-100
 * @property {string}  level           - 'HIGH' | 'MEDIUM' | 'LOW'
 * @property {string}  recommendation  - 'PROCEED' | 'ALTERNATIVES' | 'STOP'
 * @property {Object}  checks          - Per-check pass/fail + contribution
 */

/**
 * Run confidence check against provided context.
 * @param {ConfidenceContext} context
 * @returns {ConfidenceResult}
 */
function checkConfidence(context = {}) {
  const {
    hasSearchedDuplicates = false,
    architectureCompliant  = false,
    docsVerified           = false,
    ossReferenceFound      = false,
    rootCauseIdentified    = false,
  } = context;

  const flags = {
    noduplicates: hasSearchedDuplicates,
    architecture: architectureCompliant,
    docs:         docsVerified,
    oss:          ossReferenceFound,
    rootcause:    rootCauseIdentified,
  };

  const checks = {};
  let score = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const passed = Boolean(flags[key]);
    const contribution = passed ? weight : 0;
    checks[key] = { passed, weight, contribution };
    score += contribution;
  }

  const level = score >= 90 ? 'HIGH' : score >= 70 ? 'MEDIUM' : 'LOW';
  const recommendation =
    score >= 90 ? 'PROCEED' : score >= 70 ? 'ALTERNATIVES' : 'STOP';

  return { score, level, recommendation, checks };
}

/**
 * Format a confidence result as a markdown report.
 * @param {ConfidenceResult} result
 * @returns {string}
 */
function formatReport(result) {
  const { score, level, recommendation, checks } = result;

  const rows = Object.entries(checks).map(([key, { passed, weight, contribution }]) => {
    const icon = passed ? '✅' : '❌';
    return `| ${icon} ${key.padEnd(14)} | ${String(weight).padStart(3)}% | ${String(contribution).padStart(3)}% |`;
  }).join('\n');

  const actionMap = {
    PROCEED:      '✅ PROCEED — implement the approved plan',
    ALTERNATIVES: '⚠️  ALTERNATIVES — propose 2+ options, let user decide',
    STOP:         '🛑 STOP — research more before writing any code',
  };

  return `## Confidence Report

| Check          | Weight | Score |
|----------------|--------|-------|
${rows}
| **TOTAL**      |  100%  | ${String(score).padStart(3)}% |

**Level**: ${level}
**Action**: ${actionMap[recommendation]}
`;
}

module.exports = { checkConfidence, formatReport };
