#!/usr/bin/env node
/**
 * AICodePath Swarm Cost Tracker
 *
 * Tracks and estimates cumulative token costs for swarm (Agent Teams) sessions.
 * Based on empirical multipliers from harness benchmarking:
 *   - Without planning discussion: ~4x base cost per additional worker
 *   - With Phase 0 planning discussion: ~5.5x base cost
 *   - Per additional worker: ~1.5x on top of the base
 *
 * Cost tracking is advisory — helps users decide whether to use swarm mode
 * vs solo or parallel mode for a given task.
 *
 * @module lib/swarm-cost-tracker
 */

const path = require('path');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

/** Cost multipliers based on harness benchmarking */
const COST_MULTIPLIERS = {
  solo: 1.0,
  parallel: 2.0,         // 2 workers ≈ 2x base
  swarmNoDiscussion: 4.0, // Agent Teams without planning ≈ 4x base
  swarmWithDiscussion: 5.5, // Agent Teams with Phase 0 planning ≈ 5.5x base
  perExtraWorker: 1.5,   // Each additional worker above 1 adds ~1.5x
};

/** Typical token counts by task complexity (input + output estimates) */
const COMPLEXITY_TOKENS = {
  trivial: { input: 2000, output: 500 },
  simple: { input: 5000, output: 1500 },
  moderate: { input: 15000, output: 5000 },
  complex: { input: 40000, output: 15000 },
};

/**
 * Estimate swarm session cost based on session configuration.
 *
 * @param {Object} session
 * @param {number} [session.workers=3]           - Number of worker agents
 * @param {boolean} [session.hasDiscussion=false] - Whether Phase 0 planning runs
 * @param {string} [session.complexity='moderate'] - Task complexity level
 * @param {string} [session.modelId]              - Model used (defaults to sonnet)
 * @returns {{
 *   estimatedMultiplier: number,
 *   estimatedTokens: { input: number, output: number },
 *   costDescription: string,
 *   recommendation: string
 * }}
 */
function estimateSwarmCost(session = {}) {
  const {
    workers = 3,
    hasDiscussion = false,
    complexity = 'moderate',
    modelId = 'claude-sonnet-4-5',
  } = session;

  // Calculate multiplier
  const baseMultiplier = hasDiscussion
    ? COST_MULTIPLIERS.swarmWithDiscussion
    : COST_MULTIPLIERS.swarmNoDiscussion;

  // Each worker above 1 adds ~1.5x
  const workerMultiplier = workers <= 1 ? 1 : 1 + (workers - 1) * (COST_MULTIPLIERS.perExtraWorker - 1);
  const estimatedMultiplier = baseMultiplier * (workerMultiplier / workers);

  // Base token estimate
  const baseTokens = COMPLEXITY_TOKENS[complexity] || COMPLEXITY_TOKENS.moderate;
  const estimatedTokens = {
    input: Math.round(baseTokens.input * estimatedMultiplier),
    output: Math.round(baseTokens.output * estimatedMultiplier),
  };

  // Cost comparison description
  const costVsSolo = estimatedMultiplier.toFixed(1);
  const costDescription = `~${costVsSolo}x base cost (${workers} workers, ${hasDiscussion ? 'with' : 'without'} planning discussion)`;

  // Recommendation based on multiplier
  let recommendation;
  if (estimatedMultiplier <= 2) {
    recommendation = 'Cost-effective — swarm justified by parallel speedup';
  } else if (estimatedMultiplier <= 5) {
    recommendation = 'Moderate cost — swarm justified for complex independent tasks';
  } else {
    recommendation = `High cost (${costVsSolo}x) — consider parallel or solo mode if tasks have dependencies`;
  }

  logger.info('Swarm cost estimated', {
    context: 'swarm-cost-tracker',
    workers,
    hasDiscussion,
    complexity,
    estimatedMultiplier,
  });

  return {
    estimatedMultiplier,
    estimatedTokens,
    costDescription,
    recommendation,
  };
}

/**
 * Record actual token usage for a worker in a session.
 * Stores in-memory; persisted to DB by caller if needed.
 *
 * @param {string} sessionId
 * @param {string} workerId
 * @param {{ inputTokens: number, outputTokens: number }} usage
 * @returns {void}
 */
const _sessionUsage = new Map();

function recordWorkerUsage(sessionId, workerId, usage) {
  if (!_sessionUsage.has(sessionId)) {
    _sessionUsage.set(sessionId, { workers: {}, totalInput: 0, totalOutput: 0 });
  }
  const session = _sessionUsage.get(sessionId);
  session.workers[workerId] = usage;
  session.totalInput += usage.inputTokens || 0;
  session.totalOutput += usage.outputTokens || 0;

  logger.info('Worker usage recorded', {
    context: 'swarm-cost-tracker',
    sessionId,
    workerId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });
}

/**
 * Get cumulative usage summary for a session.
 *
 * @param {string} sessionId
 * @returns {{ totalInput: number, totalOutput: number, workerCount: number, workers: Object }|null}
 */
function getSessionUsage(sessionId) {
  const session = _sessionUsage.get(sessionId);
  if (!session) return null;

  return {
    totalInput: session.totalInput,
    totalOutput: session.totalOutput,
    workerCount: Object.keys(session.workers).length,
    workers: { ...session.workers },
  };
}

/**
 * Format a cost estimate as a human-readable summary line.
 *
 * @param {Object} estimate - Result from estimateSwarmCost()
 * @returns {string}
 */
function formatCostSummary(estimate) {
  const tokens = estimate.estimatedTokens;
  const tokensK = (n) => `${(n / 1000).toFixed(0)}K`;
  return `💰 ${estimate.costDescription} | Est. tokens: ${tokensK(tokens.input)} in + ${tokensK(tokens.output)} out | ${estimate.recommendation}`;
}

module.exports = {
  estimateSwarmCost,
  recordWorkerUsage,
  getSessionUsage,
  formatCostSummary,
  COST_MULTIPLIERS,
  COMPLEXITY_TOKENS,
};
