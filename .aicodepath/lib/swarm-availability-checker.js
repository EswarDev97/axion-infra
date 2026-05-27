/**
 * Swarm Availability Checker
 *
 * Feature gate for Claude Code Agent Teams integration.
 * Detects whether the experimental Agent Teams feature is available
 * and determines the appropriate spawn backend.
 *
 * @module lib/swarm-availability-checker
 */

const logger = require('./logger');
const { isEnabled } = require('./feature-flags');

/**
 * Check if Claude Code Agent Teams feature is available.
 * Uses feature flag system (config > env var > default).
 * @returns {boolean} True if swarm feature is enabled
 */
function isAgentTeamsAvailable() {
  return isEnabled('swarm');
}

/**
 * Detect the best spawn backend for teammate processes
 *
 * Agent Teams uses terminal multiplexers to spawn teammates.
 * This detects which backend is available in the current environment.
 *
 * @returns {'tmux'|'iterm2'|'in-process'|'none'} Detected backend
 */
function getSpawnBackend() {
  if (!isAgentTeamsAvailable()) {
    return 'none';
  }

  // Check for iTerm2 (macOS)
  if (process.env.TERM_PROGRAM === 'iTerm.app') {
    return 'iterm2';
  }

  // Check for tmux
  if (process.env.TMUX) {
    return 'tmux';
  }

  // Fallback to in-process (single-threaded, sequential)
  return 'in-process';
}

/**
 * Get a human-readable status summary for the swarm feature
 * @returns {Object} Status object with available, backend, and message fields
 */
function getSwarmStatus() {
  const available = isAgentTeamsAvailable();
  const backend = getSpawnBackend();

  if (!available) {
    return {
      available: false,
      backend: 'none',
      message: 'Agent Teams not available. Set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 to enable. Falling back to /aicodepath-orchestrate.',
    };
  }

  return {
    available: true,
    backend,
    message: `Agent Teams available via ${backend} backend.`,
  };
}

module.exports = {
  isAgentTeamsAvailable,
  getSpawnBackend,
  getSwarmStatus,
};
