/**
 * Pricing Calculator
 *
 * Pure-logic module for calculating Claude API costs.
 * No database or filesystem dependencies - all functions are stateless.
 *
 * @module lib/pricing-calculator
 */

// z.ai model detection (GLM family — no Anthropic pricing applies)
const ZAI_MODELS = new Set(['glm-4.7', 'glm-5.1']);
function isZaiModel(modelId) {
  return ZAI_MODELS.has(modelId) || (typeof modelId === 'string' && modelId.startsWith('glm-'));
}

// Model tier pricing (dollars per million tokens)
const MODEL_TIERS = {
  opus_new:  { input: 5.0,  output: 25.0  }, // Opus 4.5+
  opus_old:  { input: 15.0, output: 75.0  }, // Opus 3/4/4.1
  sonnet:    { input: 3.0,  output: 15.0  }, // All Sonnet
  haiku_new: { input: 1.0,  output: 5.0   }, // Haiku 4.5+
  haiku_35:  { input: 0.80, output: 4.0   }, // Haiku 3.5
  haiku_old: { input: 0.25, output: 1.25  }, // Haiku 3
  default:   { input: 3.0,  output: 15.0  }, // Unknown = Sonnet
};

// Cache pricing multipliers
const CACHE_READ_MULTIPLIER  = 0.10; // 10% of input rate
const CACHE_WRITE_MULTIPLIER = 1.25; // 125% of input rate

/**
 * Calculate cost for a single API call
 *
 * @param {Object} usage - Token usage
 * @param {number} usage.inputTokens - Non-cache input tokens
 * @param {number} usage.outputTokens - Output tokens
 * @param {number} [usage.cacheRead] - Cache read tokens
 * @param {number} [usage.cacheWrite] - Cache write tokens
 * @param {string} modelId - Model ID (e.g., "claude-opus-4-5-20250929")
 * @returns {number} Cost in USD, rounded to 4 decimals
 */
function calculateCost(usage, modelId) {
  if (isZaiModel(modelId)) return null;
  const tier = classifyModel(modelId);

  const inputCost      = (usage.inputTokens  || 0) * tier.input  / 1_000_000;
  const outputCost     = (usage.outputTokens || 0) * tier.output / 1_000_000;
  const cacheReadCost  = (usage.cacheRead    || 0) * tier.input  * CACHE_READ_MULTIPLIER  / 1_000_000;
  const cacheWriteCost = (usage.cacheWrite   || 0) * tier.input  * CACHE_WRITE_MULTIPLIER / 1_000_000;

  const total = inputCost + outputCost + cacheReadCost + cacheWriteCost;
  return Math.round(total * 10000) / 10000; // 4 decimal places
}

/**
 * Classify model ID to pricing tier
 *
 * @param {string} modelId - Model ID string
 * @returns {Object} Tier object with {input, output} rates
 */
function classifyModel(modelId) {
  const lower = (modelId || '').toLowerCase();

  if (lower.includes('opus')) {
    const { major, minor } = extractVersion(lower, 'opus');
    return (major > 4 || (major === 4 && minor >= 5))
      ? MODEL_TIERS.opus_new
      : MODEL_TIERS.opus_old;
  }

  if (lower.includes('sonnet')) {
    return MODEL_TIERS.sonnet;
  }

  if (lower.includes('haiku')) {
    const { major, minor } = extractVersion(lower, 'haiku');
    if (major > 4 || (major === 4 && minor >= 5)) return MODEL_TIERS.haiku_new;
    if (major === 3 && minor === 5) return MODEL_TIERS.haiku_35;
    return MODEL_TIERS.haiku_old;
  }

  return MODEL_TIERS.default;
}

/**
 * Extract version numbers from model ID.
 * Handles both formats:
 *   - New: "claude-opus-4-6-20260101" -> {major: 4, minor: 6}
 *   - Old: "claude-3-5-sonnet-20241022" -> {major: 3, minor: 5}
 *
 * @param {string} modelId - Lowercase model ID
 * @param {string} family - Model family ("opus", "sonnet", "haiku")
 * @returns {Object} {major, minor} version numbers
 */
function extractVersion(modelId, family) {
  const idx = modelId.indexOf(family);
  if (idx < 0) return { major: 0, minor: 0 };

  // Try after family: "opus-4-6-..."
  const after = modelId.substring(idx + family.length);
  const afterMatch = _parseVersionDash(after);
  if (afterMatch) return afterMatch;

  // Try before family: "...-3-5-sonnet"
  const before = modelId.substring(0, idx);
  return _parseVersionDashReverse(before);
}

/**
 * Parse version from "-MAJOR-MINOR-..." format.
 * Rejects numbers >= 100 (likely date stamps).
 * @private
 */
function _parseVersionDash(str) {
  if (!str.startsWith('-')) return null;
  const parts = str.substring(1).split('-');

  const major = parseInt(parts[0], 10);
  if (isNaN(major) || major >= 100) return null;

  const minor = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isNaN(minor) || minor >= 100) return null;

  return { major, minor };
}

/**
 * Parse version from "...-MAJOR-MINOR" reverse format.
 * @private
 */
function _parseVersionDashReverse(str) {
  const parts = str.replace(/-+$/, '').split('-');
  if (parts.length === 0) return { major: 0, minor: 0 };

  const last = parseInt(parts[parts.length - 1], 10);
  if (isNaN(last)) return { major: 0, minor: 0 };

  if (parts.length >= 2) {
    const secondLast = parseInt(parts[parts.length - 2], 10);
    if (!isNaN(secondLast)) {
      return { major: secondLast, minor: last };
    }
  }

  return { major: last, minor: 0 };
}

/**
 * Format cost for display
 *
 * @param {number} cost - Cost in USD
 * @param {Object} [options] - Formatting options
 * @param {boolean} [options.cents] - Show as cents if < $0.01
 * @returns {string} Formatted cost string
 */
function formatCost(cost, options = {}) {
  if (cost < 0.01 && options.cents) {
    const cents = Math.round(cost * 100);
    return `${cents}¢`;
  }
  return `$${cost.toFixed(cost < 1 ? 4 : 2)}`;
}

// ─── Token Efficiency / Predictive Budgeting (B4.2) ─────────────────────────

/**
 * Task complexity tiers with token budgets (output tokens only).
 * Based on empirical observation of Claude Code sessions.
 *
 * Opus 4.7 tokenizer benchmark (see scripts/benchmark-opus47-tokens.js):
 *   mean ratio 4.7/4.6 = 1.0441, σ = 0.0154 (below 0.1 threshold).
 *   Shared budgets are sufficient — no model-specific branching needed.
 */
const COMPLEXITY_BUDGETS = {
  trivial:      { outputTokens:   200, description: 'Single-line fix or config tweak' },
  simple:       { outputTokens:  1000, description: '1-2 file change, clear spec' },
  moderate:     { outputTokens:  2500, description: '3-5 files, some design decisions' },
  complex:      { outputTokens:  6000, description: '6-15 files, architecture choices' },
  very_complex: { outputTokens: 15000, description: '15+ files or multi-session work' },
};

// Keywords that signal higher complexity
const COMPLEXITY_SIGNALS = {
  very_complex: ['refactor all', 'migrate', 'rewrite', 'overhaul', 'entire', 'full system', 'architecture change'],
  complex:      ['feature', 'integrate', 'implement', 'design', 'build', 'create system', 'add support for'],
  moderate:     ['update', 'extend', 'add endpoint', 'add route', 'add hook', 'fix multiple', 'several files'],
  simple:       ['fix', 'bug', 'typo', 'rename', 'change value', 'add field', 'small'],
  trivial:      ['typo', 'comment', 'whitespace', 'format', 'one line', 'single'],
};

/**
 * Classify task complexity from description text.
 *
 * @param {string} description - Task description
 * @returns {string} Complexity tier: trivial|simple|moderate|complex|very_complex
 */
function classifyTaskComplexity(description) {
  const lower = (description || '').toLowerCase();

  for (const [tier, signals] of Object.entries(COMPLEXITY_SIGNALS)) {
    if (signals.some(s => lower.includes(s))) return tier;
  }

  // Fallback: length-based heuristic
  const words = lower.split(/\s+/).length;
  if (words <= 5)  return 'trivial';
  if (words <= 15) return 'simple';
  if (words <= 40) return 'moderate';
  return 'complex';
}

/**
 * Predict token budget for a task.
 *
 * @param {string} description - Task description
 * @param {string} [modelId]   - Model ID for cost estimate
 * @returns {Object} { complexity, outputTokens, estimatedCostUsd, description }
 */
function predictBudget(description, modelId) {
  const complexity = classifyTaskComplexity(description);
  const budget = COMPLEXITY_BUDGETS[complexity];
  const tier = classifyModel(modelId || 'claude-sonnet-4-5');

  const estimatedCostUsd = Math.round(
    (budget.outputTokens * tier.output / 1_000_000) * 10000
  ) / 10000;

  return {
    complexity,
    outputTokens: budget.outputTokens,
    estimatedCostUsd,
    budgetDescription: budget.description,
  };
}

/**
 * Check whether actual token usage has exceeded the predicted budget.
 *
 * @param {number} actualOutputTokens - Tokens used so far
 * @param {string} complexity         - Predicted complexity tier
 * @returns {{ overBudget: boolean, ratio: number, message: string }}
 */
function checkBudget(actualOutputTokens, complexity) {
  const budget = COMPLEXITY_BUDGETS[complexity] || COMPLEXITY_BUDGETS.moderate;
  const ratio = actualOutputTokens / budget.outputTokens;
  const overBudget = ratio > 1.0;

  let message;
  if (ratio < 0.5)       message = `On track (${Math.round(ratio * 100)}% of ${complexity} budget)`;
  else if (ratio < 0.8)  message = `Progressing (${Math.round(ratio * 100)}% of ${complexity} budget)`;
  else if (ratio < 1.0)  message = `Approaching budget (${Math.round(ratio * 100)}% used) — consider /aicodepath-checkpoint`;
  else if (ratio < 1.5)  message = `Over budget (${Math.round(ratio * 100)}%) — checkpoint and continue in fresh session`;
  else                   message = `Well over budget (${Math.round(ratio * 100)}%) — escalate to very_complex or delegate`;

  return { overBudget, ratio: Math.round(ratio * 100) / 100, message };
}

/**
 * Build a one-line token budget string for display in GICL lite reports.
 *
 * @param {string} complexity - Complexity tier (trivial|simple|moderate|complex|very_complex)
 * @param {string} [modelId]  - Model ID for cost estimate; defaults to sonnet tier
 * @returns {string} Budget line, e.g. "💰 Budget: simple — ~1,000 output tokens (~$0.0150)"
 */
function buildBudgetLine(complexity, modelId) {
  const tier = classifyModel(modelId || '');
  const budget = COMPLEXITY_BUDGETS[complexity] || COMPLEXITY_BUDGETS.moderate;
  const costUsd = Math.round(budget.outputTokens * tier.output / 1_000_000 * 10000) / 10000;
  return `💰 Budget: ${complexity} — ~${budget.outputTokens.toLocaleString()} output tokens (~$${costUsd.toFixed(4)})`;
}

module.exports = {
  calculateCost,
  classifyModel,
  extractVersion,
  formatCost,
  classifyTaskComplexity,
  predictBudget,
  checkBudget,
  buildBudgetLine,
  MODEL_TIERS,
  COMPLEXITY_BUDGETS,
  CACHE_READ_MULTIPLIER,
  CACHE_WRITE_MULTIPLIER,
};
