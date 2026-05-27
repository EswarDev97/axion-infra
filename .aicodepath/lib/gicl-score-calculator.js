/**
 * GICL Score Calculator
 *
 * Pure-logic module for calculating weighted quality scores during GICL iterations.
 * No database or filesystem dependencies - all functions are stateless.
 *
 * Score components:
 * - tests (35%): Test pass rate
 * - guidelines (20%): Guideline compliance
 * - architecture (15%): Architecture rule compliance
 * - duplication (20%): Code uniqueness
 * - authenticity (10%): No mock/stub implementations
 *
 * @module lib/gicl-score-calculator
 */

const DEFAULT_WEIGHTS = {
  tests: 0.35,
  guidelines: 0.20,
  architecture: 0.15,
  duplication: 0.20,
  authenticity: 0.10,
};

const GRADES = {
  PASS: { min: 90, label: 'Pass', emoji: '✅' },
  ACCEPTABLE: { min: 70, label: 'Acceptable', emoji: '⚠️' },
  NEEDS_WORK: { min: 50, label: 'Needs Work', emoji: '🔧' },
  FAIL: { min: 0, label: 'Fail', emoji: '❌' },
};

const COMPLEXITY_THRESHOLDS = {
  trivial: { maxLoc: 30, maxFunctions: 2, maxIterations: 3 },
  simple: { maxLoc: 100, maxFunctions: 5, maxIterations: 5 },
  moderate: { maxLoc: 300, maxFunctions: 15, maxIterations: 7 },
  complex: { maxLoc: 800, maxFunctions: 30, maxIterations: 10 },
  very_complex: { maxLoc: Infinity, maxFunctions: Infinity, maxIterations: 15 },
};

/**
 * Calculate weighted score from individual components.
 * Null/undefined components default to 100 (assume passing if not measured).
 *
 * @param {Object} components - Score components (0-100 each)
 * @param {number} [components.tests] - Test pass score
 * @param {number} [components.guidelines] - Guideline compliance score
 * @param {number} [components.architecture] - Architecture compliance score
 * @param {number} [components.duplication] - Code uniqueness score
 * @param {number} [components.authenticity] - Authenticity score
 * @param {Object} [weights] - Custom weights (must sum to 1.0)
 * @returns {number} Weighted score 0-100, rounded to 1 decimal
 */
function calculateWeightedScore(components, weights) {
  const w = weights || DEFAULT_WEIGHTS;
  let score = 0;

  for (const [key, weight] of Object.entries(w)) {
    const value = components[key] != null ? components[key] : 100;
    score += Math.max(0, Math.min(100, value)) * weight;
  }

  return Math.round(score * 10) / 10;
}

/**
 * Detect complexity of file content based on LOC and function count.
 *
 * @param {string} content - File content
 * @returns {Object} Complexity analysis
 * @returns {string} .complexity - trivial|simple|moderate|complex|very_complex
 * @returns {number} .loc - Lines of code (non-empty, non-comment)
 * @returns {number} .functions - Estimated function count
 * @returns {number} .maxIterations - Recommended max iterations for this complexity
 */
function detectComplexity(content) {
  if (!content) {
    return { complexity: 'trivial', loc: 0, functions: 0, maxIterations: 3 };
  }

  const lines = content.split('\n');
  // Count non-empty, non-comment lines
  const loc = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0
      && !trimmed.startsWith('//')
      && !trimmed.startsWith('*')
      && !trimmed.startsWith('/*')
      && !trimmed.startsWith('#');
  }).length;

  // Count function-like declarations (JS/TS/Python patterns)
  const funcPatterns = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:async\s+)?(?:\w+)\s*\([^)]*\)\s*\{|def\s+\w+\s*\(|class\s+\w+)/g;
  const functions = (content.match(funcPatterns) || []).length;

  let complexity = 'very_complex';
  for (const [level, thresholds] of Object.entries(COMPLEXITY_THRESHOLDS)) {
    if (loc <= thresholds.maxLoc && functions <= thresholds.maxFunctions) {
      complexity = level;
      break;
    }
  }

  return {
    complexity,
    loc,
    functions,
    maxIterations: COMPLEXITY_THRESHOLDS[complexity].maxIterations,
  };
}

/**
 * Determine whether GICL should continue iterating.
 *
 * Hard stop conditions:
 * 1. Score >= 90 (passed)
 * 2. Max iterations reached
 * 3. Score dropped >10 points from previous (regression)
 * 4. Score stalled for 3 consecutive iterations (no improvement)
 *
 * @param {Object} session - Session data
 * @param {number} session.maxIterations - Maximum allowed iterations
 * @param {number} session.current_iteration - Current iteration number
 * @param {number} currentScore - Current iteration's final score
 * @param {number[]} previousScores - Array of previous iteration scores
 * @returns {Object} Decision
 * @returns {boolean} .shouldContinue - Whether to keep iterating
 * @returns {string|null} .reason - Reason for stopping (null if should continue)
 */
function shouldContinue(session, currentScore, previousScores) {
  // Passed quality gate
  if (currentScore >= 90) {
    return { shouldContinue: false, reason: 'quality_gate_passed' };
  }

  // Max iterations reached
  if (session.current_iteration >= session.maxIterations) {
    return { shouldContinue: false, reason: 'max_iterations_reached' };
  }

  if (previousScores && previousScores.length > 0) {
    const lastScore = previousScores[previousScores.length - 1];

    // Score regression > 10 points
    if (currentScore < lastScore - 10) {
      return { shouldContinue: false, reason: 'score_regression' };
    }

    // Stalled for 3 iterations (within 2 points)
    if (previousScores.length >= 2) {
      const recentThree = [...previousScores.slice(-2), currentScore];
      const min = Math.min(...recentThree);
      const max = Math.max(...recentThree);
      if (max - min <= 2) {
        return { shouldContinue: false, reason: 'score_stalled' };
      }
    }
  }

  return { shouldContinue: true, reason: null };
}

/**
 * Get letter grade for a score.
 *
 * @param {number} score - Score 0-100
 * @returns {Object} Grade info
 * @returns {string} .key - PASS|ACCEPTABLE|NEEDS_WORK|FAIL
 * @returns {string} .label - Human-readable label
 * @returns {string} .emoji - Grade emoji
 */
function getScoreGrade(score) {
  if (score >= GRADES.PASS.min) return { key: 'PASS', ...GRADES.PASS };
  if (score >= GRADES.ACCEPTABLE.min) return { key: 'ACCEPTABLE', ...GRADES.ACCEPTABLE };
  if (score >= GRADES.NEEDS_WORK.min) return { key: 'NEEDS_WORK', ...GRADES.NEEDS_WORK };
  return { key: 'FAIL', ...GRADES.FAIL };
}

module.exports = {
  calculateWeightedScore,
  detectComplexity,
  shouldContinue,
  getScoreGrade,
  DEFAULT_WEIGHTS,
  GRADES,
  COMPLEXITY_THRESHOLDS,
};
