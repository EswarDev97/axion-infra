#!/usr/bin/env node
/**
 * AICodePath Effort Scorer
 *
 * Calculates a task effort score using 5 weighted factors to recommend
 * the appropriate Claude Code effort level (low / medium / high).
 *
 * Scoring factors:
 *   +1  File count ≥4 files
 *   +1  Files touch critical directories (hooks/, lib/, security/, auth/)
 *   +1  Task description contains complexity keywords
 *   +2  Task has a failure history in reflexion-learner
 *   +5  Explicit [high-effort] marker in task definition (auto-adopt)
 *
 * Score → effort level:
 *   0     → low    ○  fast and cost-efficient
 *   1–2   → medium ◐  balanced (default)
 *   ≥3    → high   ●  maximum reasoning depth
 *
 * Claude Code effort is configured via:
 *   - settings.json:  `"effortLevel": "low" | "medium" | "high"`
 *   - env var:        `CLAUDE_CODE_EFFORT_LEVEL=low|medium|high`
 *   - in-session:     `/model` → left/right arrow keys on effort slider
 *
 * @module lib/effort-scorer
 */

const logger = require('./logger');

/** Score threshold for high effort recommendation */
const EFFORT_THRESHOLD = 3;

/** Directories whose presence adds complexity */
const CRITICAL_DIRS = [
  'hooks/', 'lib/', 'security/', 'auth/', 'core/',
  'guardrails/', 'middleware/', 'encryption/', 'permissions/',
];

/** Keywords in task descriptions that signal high complexity */
const COMPLEXITY_KEYWORDS = [
  'architecture', 'security', 'design', 'migration', 'refactor',
  'schema', 'database', 'performance', 'scalability', 'concurrency',
  'authentication', 'authorization', 'encryption', 'distributed',
];

/** Effort level definitions */
const EFFORT_LEVELS = {
  low:    { symbol: '○', label: 'Low',    min: 0, max: 0 },
  medium: { symbol: '◐', label: 'Medium', min: 1, max: 2 },
  high:   { symbol: '●', label: 'High',   min: 3, max: 4 },
  xhigh:  { symbol: '◆', label: 'X-High', min: 5, max: 7 },
  max:    { symbol: '★', label: 'Max',    min: 8, max: Infinity },
};

/**
 * Marker pattern — accepts [high-effort] (canonical) or [ultrathink] (legacy alias).
 * @private
 */
const HIGH_EFFORT_MARKER = /\[high-effort\]|\[ultrathink\]/i;

/**
 * Calculate effort score for a task.
 *
 * @param {Object} context
 * @param {string[]} [context.files=[]]               - File paths expected to be modified
 * @param {string}   [context.taskDescription='']     - Task description text
 * @param {boolean}  [context.hasFailureHistory=false] - Whether this task has failed before
 * @param {boolean}  [context.explicitHigh=false]      - Whether [high-effort] marker is present
 * @returns {{
 *   score: number,
 *   level: 'low'|'medium'|'high',
 *   symbol: string,
 *   factors: Object,
 *   shouldHighEffort: boolean,
 *   threshold: number,
 *   summary: string
 * }}
 */
function calculateEffort(context = {}) {
  const {
    files = [],
    taskDescription = '',
    hasFailureHistory = false,
    explicitHigh = false,
  } = context;

  let score = 0;
  const factors = {};

  // Factor 1: File count ≥4 (+1)
  if (files.length >= 4) {
    score += 1;
    factors.fileCount = `${files.length} files (≥4 threshold) → +1`;
  }

  // Factor 2: Critical directories (+1)
  const criticalDirHit = files.find((f) => CRITICAL_DIRS.some((d) => f.includes(d)));
  if (criticalDirHit) {
    score += 1;
    factors.criticalDir = `Critical directory in "${criticalDirHit}" → +1`;
  }

  // Factor 3: Complexity keywords (+1)
  const descLower = taskDescription.toLowerCase();
  const keywordHit = COMPLEXITY_KEYWORDS.find((k) => descLower.includes(k));
  if (keywordHit) {
    score += 1;
    factors.keywords = `Keyword "${keywordHit}" in description → +1`;
  }

  // Factor 4: Failure history (+2)
  if (hasFailureHistory) {
    score += 2;
    factors.failureHistory = 'Previous failure recorded → +2';
  }

  // Factor 5: Explicit [high-effort] marker (+5, auto-adopt; [ultrathink] accepted as legacy alias)
  if (explicitHigh || HIGH_EFFORT_MARKER.test(taskDescription)) {
    score += 5;
    factors.explicit = '[high-effort] marker present → +5 (auto-adopt)';
  }

  // Determine level (5-tier mapping)
  let level = 'low';
  if (score >= EFFORT_LEVELS.max.min) level = 'max';
  else if (score >= EFFORT_LEVELS.xhigh.min) level = 'xhigh';
  else if (score >= EFFORT_LEVELS.high.min) level = 'high';
  else if (score >= EFFORT_LEVELS.medium.min) level = 'medium';

  const { symbol } = EFFORT_LEVELS[level];
  const shouldHighEffort = score >= EFFORT_THRESHOLD;

  const factorLines = Object.values(factors);
  const summary = factorLines.length > 0
    ? `Effort ${symbol} ${level} (score ${score}/${EFFORT_THRESHOLD}): ${factorLines.join('; ')}`
    : `Effort ${symbol} ${level} (score 0 — no complexity factors)`;

  if (shouldHighEffort) {
    logger.info('High effort task — recommend effortLevel: high', {
      context: 'effort-scorer',
      score,
      level,
      factors: Object.keys(factors),
    });
  }

  return {
    score,
    level,
    symbol,
    factors,
    shouldHighEffort,
    threshold: EFFORT_THRESHOLD,
    summary,
  };
}

/**
 * Build effort guidance text for injection into additionalContext.
 *
 * For high effort tasks, returns a markdown hint directing the user to
 * the Claude Code effort setting. For low effort, returns empty string.
 *
 * @param {'low'|'medium'|'high'} level - Effort level from calculateEffort
 * @param {number} [score] - Optional score for detail
 * @returns {string} Guidance string (may be empty)
 */
function buildEffortGuidance(level, score) {
  const scoreNote = score !== undefined ? ` (complexity score: ${score})` : '';
  if (level === 'max') {
    return [
      `> **Effort Recommendation: Max**${scoreNote} — Maximum complexity detected.`,
      '> Use `/model` → effort slider at Max for deepest reasoning.',
      '',
    ].join('\n');
  }
  if (level === 'xhigh') {
    return [
      `> **Effort Recommendation: X-High**${scoreNote} — This task has very high complexity.`,
      '> For best reasoning depth, ensure Claude Code is running at xhigh effort:',
      '> • Settings: `"effortLevel": "xhigh"` in `.claude/settings.json`',
      '> • In-session: `/model` → adjust effort slider to X-High',
      '',
    ].join('\n');
  }
  if (level === 'high') {
    return [
      `> **Effort Recommendation: High**${scoreNote} — This task has high complexity.`,
      '> For best reasoning depth, ensure Claude Code is running at high effort:',
      '> • Settings: `"effortLevel": "high"` in `.claude/settings.json`',
      '> • In-session: `/model` → adjust effort slider to High',
      '',
    ].join('\n');
  }
  if (level === 'medium') {
    return '> **Effort Recommendation: Medium** — Moderate complexity. Default effort is appropriate.\n\n';
  }
  return '';
}

module.exports = {
  calculateEffort,
  buildEffortGuidance,
  EFFORT_THRESHOLD,
  CRITICAL_DIRS,
  COMPLEXITY_KEYWORDS,
  EFFORT_LEVELS,
  HIGH_EFFORT_MARKER,
};
