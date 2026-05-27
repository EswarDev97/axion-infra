/**
 * Session Resumption for AICodePath
 *
 * Automatic session detection and resume functionality.
 * Integrates with checkpoint-manager.js for detecting previous sessions
 * and generating comprehensive resume summaries.
 *
 * Features:
 * - Detect previous sessions from checkpoints
 * - Check for uncommitted AICodePath-managed changes
 * - Generate detailed resume summaries
 * - Suggest next actions based on context
 * - Fast detection (< 500ms target)
 *
 * @module lib/session-resumption
 */

const { execSync } = require('child_process');
const { getLatestCheckpoint } = require('./checkpoint-manager');
const { findProjectRoot } = require('./path-resolver');
const logger = require('./logger');

/**
 * Calculate relative time string (e.g., "2 hours ago", "yesterday")
 * @private
 * @param {Date} timestamp - Timestamp to compare
 * @returns {string} Human-readable relative time
 */
function getRelativeTime(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  if (weeks > 0) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (days > 0) {
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  return 'just now';
}

/**
 * Format date as human-readable string
 * @private
 * @param {string} isoTimestamp - ISO timestamp string
 * @returns {string} Formatted date string
 */
function formatDateTime(isoTimestamp) {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    return isoTimestamp;
  }
}

/**
 * Check git status for uncommitted changes
 * @private
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Git status information
 */
function checkGitStatus(projectRoot) {
  try {
    const output = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 1000 // Fast timeout for performance
    }).trim();

    const lines = output.split('\n').filter(line => line.trim());
    const aicodePathChanges = lines.filter(line =>
      line.includes('aicodepath-docs/') || line.includes('.aicodepath/')
    );

    return {
      hasChanges: lines.length > 0,
      totalChanges: lines.length,
      aicodePathChanges: aicodePathChanges.length,
      uncommitted: aicodePathChanges.length > 0
    };
  } catch (error) {
    // Not a git repo or git not available - non-fatal
    logger.debug('Could not check git status', {
      error: error.message,
      context: 'session-resumption'
    });
    return {
      hasChanges: false,
      totalChanges: 0,
      aicodePathChanges: 0,
      uncommitted: false
    };
  }
}

/**
 * Extract quality gate status from checkpoint state
 * @private
 * @param {Object} checkpoint - Checkpoint object
 * @returns {Object} Quality gate status
 */
function extractQualityGates(checkpoint) {
  const gates = {
    tests: 'UNKNOWN',
    mockDetection: 'UNKNOWN',
    duplication: 'UNKNOWN'
  };

  try {
    // Look for quality_gates in state first, then context
    const qg = checkpoint.state?.quality_gates || checkpoint.context?.quality_gates;

    if (qg && Object.keys(qg).length > 0) {
      // Support both new field names (tests_passed) and old GICL names (tests_passing)
      const testsPassed = qg.tests_passed ?? qg.tests_passing;
      const mocksPassed = qg.mock_detection_passed ?? qg.no_mocks;
      const dupPassed = qg.duplication_passed ?? qg.duplication_check;

      if (testsPassed != null) {
        gates.tests = testsPassed ? 'PASSING' : 'FAILING';
      }
      if (mocksPassed != null) {
        gates.mockDetection = mocksPassed ? 'CLEAR' : 'VIOLATIONS';
      }
      if (dupPassed != null) {
        gates.duplication = dupPassed ? 'CLEAR' : 'VIOLATIONS';
      }
    }
  } catch (error) {
    logger.debug('Could not extract quality gates', {
      error: error.message,
      context: 'session-resumption'
    });
  }

  return gates;
}

/**
 * Extract pending items from checkpoint context
 * @private
 * @param {Object} checkpoint - Checkpoint object
 * @returns {Array<string>} List of pending items
 */
function extractPendingItems(checkpoint) {
  const pending = [];

  try {
    // Check for pending items in context
    if (checkpoint.context?.pending_items) {
      pending.push(...checkpoint.context.pending_items);
    }

    // Check for blockers
    if (checkpoint.context?.blockers) {
      checkpoint.context.blockers.forEach(blocker => {
        pending.push(`Resolve blocker: ${blocker}`);
      });
    }

    // Check for next_steps
    if (checkpoint.context?.next_steps) {
      pending.push(...checkpoint.context.next_steps);
    }

    // Check for incomplete tasks in state
    if (checkpoint.state?.completed_stages) {
      const completed = checkpoint.state.completed_stages;
      // This is phase-specific and would need more context
      // For now, just note if there are completed stages
      if (completed.length > 0) {
        logger.debug('Completed stages found', {
          count: completed.length,
          stages: completed,
          context: 'session-resumption'
        });
      }
    }
  } catch (error) {
    logger.debug('Could not extract pending items', {
      error: error.message,
      context: 'session-resumption'
    });
  }

  return pending;
}

/**
 * Detect previous session
 *
 * Checks for:
 * - Latest checkpoint (< 24 hours old = "returning session")
 * - Uncommitted AICodePath-managed changes in git
 * - Session state files
 *
 * Fast operation (< 500ms target) - does not do expensive analysis.
 *
 * @param {string} startDir - Starting directory (defaults to process.cwd())
 * @returns {Object} Detection result
 */
function detectPreviousSession(startDir = process.cwd()) {
  const startTime = Date.now();

  try {
    const projectRoot = findProjectRoot(startDir);

    // Get latest checkpoint
    const checkpoint = getLatestCheckpoint(projectRoot);

    if (!checkpoint) {
      logger.debug('No previous checkpoint found', { context: 'session-resumption' });
      return { found: false };
    }

    // Calculate checkpoint age
    const checkpointTime = new Date(checkpoint.timestamp).getTime();
    const ageMs = Date.now() - checkpointTime;
    const ageHours = ageMs / (60 * 60 * 1000);

    // Consider "returning session" if < 24 hours old
    const isReturning = ageHours < 24;

    // Check git status (fast check)
    const gitStatus = checkGitStatus(projectRoot);

    // Extract summary info
    const relativeTime = getRelativeTime(checkpoint.timestamp);
    const formattedTime = formatDateTime(checkpoint.timestamp);

    // Build detection result
    const result = {
      found: true,
      isReturning,
      checkpoint,
      age: {
        ms: ageMs,
        hours: ageHours,
        relative: relativeTime,
        formatted: formattedTime
      },
      git: gitStatus,
      summary: {
        phase: checkpoint.phase || 'UNKNOWN',
        stage: checkpoint.stage || 'UNKNOWN',
        unit: checkpoint.unit || 'N/A',
        lastActivity: checkpoint.context?.last_action || 'Unknown activity'
      }
    };

    const elapsedMs = Date.now() - startTime;
    logger.debug('Previous session detected', {
      context: 'session-resumption',
      checkpointId: checkpoint.id,
      age: relativeTime,
      isReturning,
      performanceMs: elapsedMs
    });

    return result;
  } catch (error) {
    logger.error('Failed to detect previous session', {
      context: 'session-resumption',
      error: error.message
    });
    return { found: false, error: error.message };
  }
}

/**
 * Generate resume summary
 *
 * Creates a formatted markdown summary of the previous session
 * with quality gate status and suggested next actions.
 *
 * @param {Object} checkpoint - Checkpoint object from detectPreviousSession
 * @returns {string} Formatted markdown summary
 */
function generateResumeSummary(checkpoint) {
  if (!checkpoint) {
    return '## No Previous Session Found\n\nNo checkpoint available to resume from.';
  }

  const output = [];

  output.push('## Session Resume Summary');
  output.push('');

  // Previous session info
  const relativeTime = getRelativeTime(checkpoint.timestamp);
  const formattedTime = formatDateTime(checkpoint.timestamp);

  output.push(`**Previous Session**: ${formattedTime} (${relativeTime})`);
  output.push(`**Phase**: ${checkpoint.phase || 'UNKNOWN'} | **Stage**: ${checkpoint.stage || 'UNKNOWN'}`);

  if (checkpoint.unit) {
    output.push(`**Active Unit**: ${checkpoint.unit}`);
  }

  if (checkpoint.context?.last_action) {
    output.push(`**Last Activity**: ${checkpoint.context.last_action}`);
  }

  output.push('');

  // Git context
  if (checkpoint.metadata?.git_branch) {
    output.push(`**Git Branch**: ${checkpoint.metadata.git_branch}`);
    if (checkpoint.metadata?.git_commit) {
      output.push(`**Git Commit**: ${checkpoint.metadata.git_commit}`);
    }
    output.push('');
  }

  // Quality gates
  const gates = extractQualityGates(checkpoint);
  output.push('### Quality Gates');
  output.push(`- Tests: ${gates.tests}`);
  output.push(`- Mock Detection: ${gates.mockDetection}`);
  output.push(`- Duplication: ${gates.duplication}`);
  output.push('');

  // Pending items / suggested actions
  const pending = extractPendingItems(checkpoint);
  const actions = getResumeActions(checkpoint);

  if (actions.length > 0) {
    output.push('### Suggested Next Actions');

    // Group by priority
    const high = actions.filter(a => a.priority === 'high');
    const medium = actions.filter(a => a.priority === 'medium');
    const low = actions.filter(a => a.priority === 'low');

    if (high.length > 0) {
      high.forEach(action => {
        output.push(`1. ${action.description}`);
      });
    }
    if (medium.length > 0) {
      medium.forEach(action => {
        output.push(`2. ${action.description}`);
      });
    }
    if (low.length > 0) {
      low.forEach(action => {
        output.push(`3. ${action.description}`);
      });
    }
  } else if (pending.length > 0) {
    output.push('### Pending Items');
    pending.forEach(item => {
      output.push(`- ${item}`);
    });
  } else {
    output.push('### Next Steps');
    output.push('- Review checkpoint state and decide next action');
    output.push('- Run `/aicodepath-validate-guidelines` to check quality');
    output.push('- Continue with current phase work');
  }

  return output.join('\n');
}

/**
 * Get resume actions
 *
 * Analyzes checkpoint context and suggests actionable next steps
 * ranked by priority (high, medium, low).
 *
 * @param {Object} checkpoint - Checkpoint object
 * @returns {Array<Object>} Array of { action, description, priority }
 */
function getResumeActions(checkpoint) {
  const actions = [];

  if (!checkpoint) {
    return actions;
  }

  try {
    const phase = checkpoint.phase || '';
    const stage = checkpoint.stage || '';
    const unit = checkpoint.unit || '';

    // Phase-specific actions
    if (phase === 'CONSTRUCTION') {
      if (stage.includes('unit-implementation')) {
        actions.push({
          action: 'continue-implementation',
          description: `Continue implementing ${unit || 'current unit'}`,
          priority: 'high'
        });
        actions.push({
          action: 'write-tests',
          description: `Write or update tests for ${unit || 'current unit'}`,
          priority: 'high'
        });
      }
      if (stage.includes('integration')) {
        actions.push({
          action: 'integration-test',
          description: 'Run integration tests',
          priority: 'high'
        });
      }
    } else if (phase === 'INCEPTION') {
      actions.push({
        action: 'review-requirements',
        description: 'Review and refine requirements',
        priority: 'high'
      });
      actions.push({
        action: 'architecture-review',
        description: 'Review architecture decisions',
        priority: 'medium'
      });
    } else if (phase === 'OPERATIONS') {
      actions.push({
        action: 'verify-deployment',
        description: 'Verify deployment health',
        priority: 'high'
      });
      actions.push({
        action: 'monitor-metrics',
        description: 'Check monitoring and metrics',
        priority: 'medium'
      });
    } else if (phase === 'PRE-FLIGHT') {
      actions.push({
        action: 'validate-environment',
        description: 'Run environment validation',
        priority: 'high'
      });
    }

    // Quality gate actions
    const gates = extractQualityGates(checkpoint);
    if (gates.tests === 'FAILING') {
      actions.push({
        action: 'fix-tests',
        description: 'Fix failing tests',
        priority: 'high'
      });
    }
    if (gates.mockDetection === 'VIOLATIONS') {
      actions.push({
        action: 'fix-mocks',
        description: 'Resolve mock detection violations',
        priority: 'high'
      });
    }
    if (gates.duplication === 'VIOLATIONS') {
      actions.push({
        action: 'reduce-duplication',
        description: 'Reduce code duplication',
        priority: 'medium'
      });
    }

    // Context-based actions
    if (checkpoint.context?.blockers && checkpoint.context.blockers.length > 0) {
      checkpoint.context.blockers.forEach(blocker => {
        actions.push({
          action: 'resolve-blocker',
          description: `Resolve blocker: ${blocker}`,
          priority: 'high'
        });
      });
    }

    // Generic validation action (always medium priority)
    actions.push({
      action: 'validate-guidelines',
      description: 'Run `/aicodepath-validate-guidelines` before proceeding',
      priority: 'medium'
    });

    // Add checkpoint review if no other high-priority actions
    if (!actions.some(a => a.priority === 'high')) {
      actions.push({
        action: 'review-checkpoint',
        description: 'Review checkpoint details and plan next steps',
        priority: 'high'
      });
    }

  } catch (error) {
    logger.error('Failed to generate resume actions', {
      context: 'session-resumption',
      error: error.message
    });
  }

  return actions;
}

module.exports = {
  detectPreviousSession,
  generateResumeSummary,
  getResumeActions
};
