#!/usr/bin/env node
/**
 * AICodePath Session Start Hook — Lightweight Context Injector
 *
 * Injects the `using-aicodepath` skill into Claude's context at session start
 * so the AIDLC workflow and skill activation rules are active from the first message.
 *
 * Design:
 * - Fast path (<50ms): inject dynamic workspace context + resume summary as additionalContext
 * - Static AIDLC rules (skill chain, hard gates) live in CLAUDE.md — not injected here
 * - Fail-safe: any error → pass through silently, framework still works
 * - No DB init (lazy init on first GICL operation)
 * - Workspace context: read from persisted aicodepath-state.md (written by `aicodepath init`)
 *   NOT re-detected each session — project type is immutable once written.
 *
 * @module hooks/session-start-hook
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');

/**
 * Read persisted workflow state and build routing context for injection.
 *
 * State is written once by `executeAutoRouting()` during `aicodepath init`.
 * Sessions read this file — they never re-detect the project type.
 *
 * Returns:
 * - State found: `## Workspace Detection Result` section with phase/type/stage
 *   and a `<MANDATORY-INCEPTION>` block when brownfield RE is still pending.
 * - State missing: warning telling the user to run `aicodepath init`.
 * - Any error: empty string (fail-safe, never blocks session start).
 *
 * @param {string} projectRoot
 * @returns {string}
 */
function readWorkspaceContext(projectRoot) {
  const stateFile = path.join(projectRoot, 'aicodepath-docs', 'aicodepath-state.md');

  try {
    if (!fs.existsSync(stateFile)) {
      return (
        '\n\n---\n## Workspace Detection Result\n' +
        '⚠️ AICodePath not initialized — no `aicodepath-state.md` found.\n' +
        'Run the following once to detect project type and configure your AIDLC workflow:\n' +
        '```\n' +
        'node .aicodepath/bin/aicodepath.js init\n' +
        '```'
      );
    }

    const content = fs.readFileSync(stateFile, 'utf8');

    // Parse fields written by auto-workflow-router.createInitialState()
    const typeMatch  = content.match(/Project Type\*{0,2}:\s*\*{0,2}\s*\*\*([^*]+)\*\*/);
    const phaseMatch = content.match(/Current Phase\*{0,2}:\s*\*{0,2}\s*\*\*([^*]+)\*\*/);
    const stageMatch = content.match(/Current Stage\*{0,2}:\s*\*{0,2}\s*\*\*([^*]+)\*\*/);
    const confMatch  = content.match(/Detection Confidence\*{0,2}:\s*\*{0,2}\s*(\d+%)/);

    const projectType = typeMatch  ? typeMatch[1].toLowerCase()  : 'unknown';
    const phase       = phaseMatch ? phaseMatch[1]               : 'PRE-FLIGHT';
    const stage       = stageMatch ? stageMatch[1]               : 'initialization';
    const confidence  = confMatch  ? confMatch[1]                : null;

    const lines = ['\n\n---\n## Workspace Detection Result'];
    lines.push(`- **Project Type**: ${projectType.toUpperCase()}${confidence ? ` (${confidence} confidence)` : ''}`);
    lines.push(`- **Current Phase**: ${phase}`);
    lines.push(`- **Current Stage**: ${stage}`);

    if (projectType === 'brownfield' && stage === 'reverse-engineering') {
      lines.push('');
      lines.push('<MANDATORY-INCEPTION>');
      lines.push('This brownfield project has NO reverse engineering artifacts yet.');
      lines.push('You MUST complete the INCEPTION phase before any design or implementation work:');
      lines.push('1. Run /aicodepath-preflight');
      lines.push('2. Execute Workspace Detection + Reverse Engineering (.aicodepath/rules/core/inception.md)');
      lines.push('DO NOT jump to /aicodepath-brainstorm — brownfield without RE means working blind.');
      lines.push('</MANDATORY-INCEPTION>');
    } else if (projectType === 'brownfield' && stage === 'requirements-analysis') {
      lines.push('');
      lines.push('Reverse engineering complete. Proceed to /aicodepath-brainstorm with existing RE artifacts as context.');
    }

    return lines.join('\n');
  } catch {
    return ''; // fail-safe: never block session start on read errors
  }
}

/**
 * Try to find the most recent checkpoint for a resume summary.
 * Returns empty string on any error (fail-safe).
 * @param {string} projectRoot
 * @returns {string}
 */
function buildResumeSummary(projectRoot) {
  try {
    const latestPath = path.join(projectRoot, 'aicodepath-docs', 'checkpoints', 'latest.json');
    if (!fs.existsSync(latestPath)) return '';

    const checkpoint = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    const age = Date.now() - new Date(checkpoint.timestamp || 0).getTime();
    const hoursOld = Math.round(age / 3600000);

    if (hoursOld > 24) return ''; // too old to be useful

    const lines = [
      `\n\n---\n## Session Resume Available`,
      `**Previous session** (${hoursOld}h ago): Phase=${checkpoint.phase || 'unknown'}, Stage=${checkpoint.stage || 'unknown'}`,
    ];
    if (checkpoint.unit) lines.push(`**Unit**: ${checkpoint.unit}`);
    if (checkpoint.notes) lines.push(`**Notes**: ${checkpoint.notes}`);
    lines.push('Use `/aicodepath-resume` for full details or to restore state.');
    return lines.join('\n');
  } catch {
    return '';
  }
}

/**
 * Check whether the code graph index is present and fresh.
 * Returns a warning string if missing or stale (>7 days), empty string if fresh.
 * Fail-safe: any error returns empty string (never blocks session start).
 * @param {string} projectRoot
 * @returns {string}
 */
function readGraphStatus(projectRoot) {
  try {
    const flagPath = path.join(projectRoot, 'aicodepath-docs', 'state', 'graph-indexed.json');
    if (!fs.existsSync(flagPath)) {
      return (
        '\n\n---\n## Code Graph Status\n' +
        '⚠️ Code graph not built — run `build_or_update_graph` to enable graph-powered navigation.'
      );
    }
    const flag = JSON.parse(fs.readFileSync(flagPath, 'utf8'));
    const ageMs = Date.now() - new Date(flag.indexed_at || 0).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > 7) {
      const daysAgo = Math.floor(ageDays);
      return (
        '\n\n---\n## Code Graph Status\n' +
        `⚠️ Code graph is stale (last indexed ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)` +
        ' — run `build_or_update_graph` to refresh.'
      );
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Build the context string to inject into Claude.
 * Contains only dynamic sections — static AIDLC rules live in CLAUDE.md.
 * @param {string} resumeSummary
 * @param {string} workspaceContext
 * @returns {string}
 */
function buildContext(resumeSummary, workspaceContext) {
  const parts = [];

  if (resumeSummary) {
    parts.push(resumeSummary);
  }

  if (workspaceContext) {
    parts.push(workspaceContext);
  }

  return parts.join('\n');
}

/**
 * Main hook implementation
 * @param {Object} hookData - Hook context from Claude Code (unused for SessionStart)
 * @returns {Object} Hook output
 */
async function sessionStartHookImpl(hookData = {}) {
  try {
    const projectRoot = findProjectRoot();

    const resumeSummary    = buildResumeSummary(projectRoot);
    const workspaceContext = readWorkspaceContext(projectRoot);
    let contextContent     = buildContext(resumeSummary, workspaceContext);

    // Graph status warning
    const graphStatus = readGraphStatus(projectRoot);
    if (graphStatus) {
      contextContent += graphStatus;
    }

    // ADR-007: Inject active worktree warning
    try {
      const worktreePath = path.join(projectRoot, 'aicodepath-docs', 'state', 'active-worktree.json');
      const wtRaw = fs.readFileSync(worktreePath, 'utf-8');
      const wt = JSON.parse(wtRaw);
      if (wt && wt.worktree_path) {
        contextContent += `\n\n## Active Worktree\n⚠️ Worktree active: all implementation work must happen in \`${wt.worktree_path}\` (branch: \`${wt.branch || 'unknown'}\`). Do NOT write files to the main repo at \`${projectRoot}\`.`;
      }
    } catch (e) {
      // File absent or malformed — fail-open, continue normally
    }

    logger.debug('AICodePath session start — compact context injected', {
      context: 'session-start-hook',
      contextBytes: Buffer.byteLength(contextContent, 'utf8'),
      hasResume: Boolean(resumeSummary),
      hasWorkspaceContext: Boolean(workspaceContext),
    });

    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: contextContent,
      },
      message: 'AICodePath active — AIDLC workflow and skill activation rules loaded.',
    };
  } catch (err) {
    // Never block a session due to hook failure — pass through silently
    logger.error('Session start hook error (passing through)', {
      context: 'session-start-hook',
      error: err.message,
    });
    return { success: true };
  }
}

// Export for programmatic use and testing
module.exports = {
  hook: sessionStartHookImpl,
  readGraphStatus,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(sessionStartHookImpl, { name: 'session-start-hook' });
}
