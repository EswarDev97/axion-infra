#!/usr/bin/env node
/**
 * AICodePath Scope Creep Detector
 *
 * Detects scope creep by comparing current tasks.md against the original
 * planning.md scope. Uses keyword/task-title comparison to find tasks
 * that were not part of the original plan.
 *
 * Quadrant analysis (Impact × Risk):
 *   High Impact + Low Risk  → Required (keep)
 *   High Impact + High Risk → Needs Spike (investigate first)
 *   Low Impact  + Low Risk  → Recommended (nice to have, defer if blocked)
 *   Low Impact  + High Risk → Avoid (descope)
 *
 * @module lib/scope-creep-detector
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

/** Minimum word overlap ratio to consider tasks "covered" by original scope */
const SIMILARITY_THRESHOLD = 0.35;

/** Keywords that signal high risk in a task description */
const HIGH_RISK_KEYWORDS = [
  'migration', 'schema', 'breaking', 'refactor', 'rewrite',
  'replace', 'delete', 'remove', 'upgrade', 'downgrade',
  'rename', 'move', 'restructure', 'deprecate',
];

/** Keywords that signal high impact */
const HIGH_IMPACT_KEYWORDS = [
  'api', 'auth', 'security', 'payment', 'user', 'data',
  'database', 'performance', 'scalability', 'deploy', 'release',
  'core', 'critical', 'production', 'integration',
];

/**
 * Extract task titles/descriptions from a markdown file.
 * Detects both checkbox format and table format.
 *
 * @param {string} content - Markdown file content
 * @returns {string[]} Array of task description strings
 */
function extractTasks(content) {
  const tasks = [];

  // Checkbox-style: `- [ ] task description` or `- [x] task description`
  const checkboxPattern = /^\s*-\s*\[[x\s]\]\s+(.+)$/gmi;
  let match;
  while ((match = checkboxPattern.exec(content)) !== null) {
    tasks.push(match[1].trim());
  }

  // Table-style: `| task description | ... |`
  // Detect rows that are not header rows (no dashes)
  const tableRowPattern = /^\|([^|\n]+)\|/gm;
  while ((match = tableRowPattern.exec(content)) !== null) {
    const cell = match[1].trim();
    // Skip header separator rows and column header rows (Task, Status, etc.)
    if (/^[-:\s]+$/.test(cell)) continue;
    if (/^(?:task|status|title|description|depends|dod|priority)$/i.test(cell)) continue;
    if (cell.length > 5) tasks.push(cell);
  }

  return tasks;
}

/**
 * Calculate word overlap similarity between two strings.
 * Returns ratio of shared words to total unique words.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} 0.0–1.0
 */
function wordOverlap(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let shared = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) shared++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return shared / union;
}

/**
 * Assess impact and risk for a task description.
 *
 * @param {string} taskDesc
 * @returns {{ impact: 'high'|'low', risk: 'high'|'low', quadrant: string, recommendation: string }}
 */
function assessQuadrant(taskDesc) {
  const lower = taskDesc.toLowerCase();
  const impact = HIGH_IMPACT_KEYWORDS.some((k) => lower.includes(k)) ? 'high' : 'low';
  const risk = HIGH_RISK_KEYWORDS.some((k) => lower.includes(k)) ? 'high' : 'low';

  let quadrant;
  let recommendation;
  if (impact === 'high' && risk === 'low') {
    quadrant = 'Required';
    recommendation = 'Keep — high value, low risk';
  } else if (impact === 'high' && risk === 'high') {
    quadrant = 'Needs Spike';
    recommendation = 'Create investigation task before implementing';
  } else if (impact === 'low' && risk === 'low') {
    quadrant = 'Recommended';
    recommendation = 'Defer to next phase if blocking other work';
  } else {
    quadrant = 'Avoid';
    recommendation = 'Descope — low value, high risk';
  }

  return { impact, risk, quadrant, recommendation };
}

/**
 * Detect scope creep by comparing tasks.md against planning.md.
 *
 * @param {Object} [options]
 * @param {string} [options.planningPath]  - Path to planning.md (original scope)
 * @param {string} [options.tasksPath]     - Path to tasks.md (current work)
 * @param {string} [options.projectRoot]   - Project root (used to resolve default paths)
 * @returns {{
 *   creepItems: Array<{ task: string, assessment: Object }>,
 *   coveredItems: string[],
 *   creepPercentage: number,
 *   summary: string
 * }}
 */
function detectScopeCreep(options = {}) {
  const root = options.projectRoot || findProjectRoot(process.cwd());
  const planningPath = options.planningPath || path.join(root, 'aicodepath-docs', 'planning.md');
  const tasksPath = options.tasksPath || path.join(root, 'aicodepath-docs', 'tasks.md');

  if (!fs.existsSync(planningPath)) {
    logger.info('planning.md not found — cannot detect scope creep', {
      context: 'scope-creep-detector',
      planningPath,
    });
    return { creepItems: [], coveredItems: [], creepPercentage: 0, summary: 'No planning.md — scope creep check skipped' };
  }

  if (!fs.existsSync(tasksPath)) {
    logger.info('tasks.md not found — cannot detect scope creep', {
      context: 'scope-creep-detector',
      tasksPath,
    });
    return { creepItems: [], coveredItems: [], creepPercentage: 0, summary: 'No tasks.md — scope creep check skipped' };
  }

  const planningContent = fs.readFileSync(planningPath, 'utf-8');
  const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

  const originalScope = extractTasks(planningContent);
  const currentTasks = extractTasks(tasksContent);

  if (currentTasks.length === 0) {
    return { creepItems: [], coveredItems: [], creepPercentage: 0, summary: 'No tasks found in tasks.md' };
  }

  const creepItems = [];
  const coveredItems = [];

  for (const task of currentTasks) {
    // Check if this task is covered by any item in the original scope
    const maxSimilarity = originalScope.reduce((max, scopeItem) => {
      return Math.max(max, wordOverlap(task, scopeItem));
    }, 0);

    if (maxSimilarity >= SIMILARITY_THRESHOLD) {
      coveredItems.push(task);
    } else {
      const assessment = assessQuadrant(task);
      creepItems.push({ task, maxSimilarity, assessment });
      logger.info('Scope creep candidate detected', {
        context: 'scope-creep-detector',
        task: task.substring(0, 80),
        similarity: maxSimilarity.toFixed(2),
        quadrant: assessment.quadrant,
      });
    }
  }

  const creepPercentage = currentTasks.length > 0
    ? Math.round((creepItems.length / currentTasks.length) * 100)
    : 0;

  const summary = creepItems.length === 0
    ? `No scope creep detected — all ${currentTasks.length} tasks align with planning.md`
    : `${creepItems.length}/${currentTasks.length} tasks (${creepPercentage}%) may be outside original scope`;

  return { creepItems, coveredItems, creepPercentage, summary };
}

/**
 * Format scope creep results as a markdown report section.
 *
 * @param {{ creepItems: Array, creepPercentage: number, summary: string }} result
 * @returns {string} Markdown section
 */
function formatReport(result) {
  if (result.creepItems.length === 0) {
    return `### Scope Check\n✓ ${result.summary}\n`;
  }

  const lines = [
    '### Scope Check',
    `⚠️  ${result.summary}`,
    '',
    '| Task | Quadrant | Recommendation |',
    '|------|----------|----------------|',
  ];

  for (const item of result.creepItems) {
    const task = item.task.length > 60 ? item.task.substring(0, 57) + '...' : item.task;
    lines.push(`| ${task} | ${item.assessment.quadrant} | ${item.assessment.recommendation} |`);
  }

  return lines.join('\n') + '\n';
}

module.exports = {
  detectScopeCreep,
  formatReport,
  extractTasks,
  wordOverlap,
  assessQuadrant,
  SIMILARITY_THRESHOLD,
  HIGH_RISK_KEYWORDS,
  HIGH_IMPACT_KEYWORDS,
};
