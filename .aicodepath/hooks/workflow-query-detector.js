#!/usr/bin/env node
/**
 * Workflow Query Detector Hook — UserPromptSubmit
 *
 * Detects natural-language workflow explanation queries in the user prompt
 * and injects additionalContext to enforce /aicodepath-analyze invocation
 * before Claude selects any tool.
 *
 * Includes a 30-minute session-scoped debounce via a state file to prevent
 * repeated injection on follow-up messages in the same conversational context.
 *
 * Modelled on plan-role-activator.js. Fail-open: all errors caught, returns {}
 * so prompt submission is never blocked.
 *
 * @module hooks/workflow-query-detector
 */

'use strict';

const fs = require('fs');
const path = require('path');
const pathResolver = require('../lib/path-resolver');

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

const WORKFLOW_QUERY_PATTERNS = [
  /\bhow does .+ (?:work|flow|process)\b/i,
  /\btell me how .+ works?\b/i,
  /\bexplain (?:the |this |that )?(?:.*?)(?:workflow|flow|process|pipeline|sequence)\b/i,
  /\bwalk me through .+/i,
  /\btrace .+ (?:flow|execution|call chain)\b/i,
  /\bwhat happens when .+ (?:is|gets) (?:called|triggered|executed)\b/i,
  /\bhow is .+ (?:implemented|triggered|invoked)\b/i,
];

/**
 * Returns true if the prompt matches a workflow explanation query pattern.
 * @param {string} prompt
 * @returns {boolean}
 */
function isWorkflowQuery(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  return WORKFLOW_QUERY_PATTERNS.some(p => p.test(prompt));
}

// ---------------------------------------------------------------------------
// Debounce logic
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Returns true if the state file exists and was written within DEBOUNCE_MS.
 * Fail-safe: returns false on any read/parse error.
 * @param {string} stateFilePath
 * @returns {boolean}
 */
function isDebounced(stateFilePath) {
  try {
    const raw = fs.readFileSync(stateFilePath, 'utf8');
    const data = JSON.parse(raw);
    if (!data.firedAt) return false;
    const firedAt = new Date(data.firedAt).getTime();
    if (Number.isNaN(firedAt)) return false;
    return (Date.now() - firedAt) < DEBOUNCE_MS;
  } catch (_) {
    return false;
  }
}

/**
 * Write the debounce state file with current timestamp.
 * Creates parent directories if they do not exist.
 * @param {string} stateFilePath
 * @returns {Promise<void>}
 */
async function writeDebounceState(stateFilePath) {
  const dir = path.dirname(stateFilePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(
    stateFilePath,
    JSON.stringify({ firedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
}

// ---------------------------------------------------------------------------
// Default state file path
// ---------------------------------------------------------------------------

function getDefaultStateFilePath() {
  try {
    const projectRoot = pathResolver.findProjectRoot();
    return path.join(projectRoot, 'aicodepath-docs', 'state', 'workflow-detector-fired.json');
  } catch (_) {
    // Fallback: resolve from hook's own __dirname (.aicodepath/hooks/ → project root)
    return path.join(__dirname, '..', '..', 'aicodepath-docs', 'state', 'workflow-detector-fired.json');
  }
}

// ---------------------------------------------------------------------------
// Injected context
// ---------------------------------------------------------------------------

const ADDITIONAL_CONTEXT = `
## Workflow Explanation Query Detected

The user is asking how a feature/workflow/process works. This requires STRUCTURED ANALYSIS.

MANDATORY: Invoke \`/aicodepath-analyze\` before reading any code files.
- Do NOT start with Grep or Read directly
- Do NOT use CLAUDE.md entry points to shortcut past the skill

The analyze skill will:
1. Check if the code graph is indexed (DB probe)
2. If indexed: use search_entities → callees_of to trace the call chain
3. If not indexed: fall back to Grep/Read AND offer to build the graph
4. Output a numbered execution sequence with file:line anchors at each step
`.trim();

// ---------------------------------------------------------------------------
// Main hook implementation
// ---------------------------------------------------------------------------

/**
 * Main hook implementation — called by wrapHook on UserPromptSubmit.
 *
 * @param {Object} hookData - Hook payload from Claude Code
 * @param {Object} [overrides] - Dependency overrides for testability (stateFilePath)
 * @returns {Promise<Object>} Hook result
 */
async function workflowQueryDetectorHookImpl(hookData = {}, overrides = {}) {
  try {
    const prompt = hookData.prompt || hookData.message || '';

    // Fast path: not a workflow query
    if (!isWorkflowQuery(prompt)) return {};

    const stateFilePath = overrides.stateFilePath || getDefaultStateFilePath();

    // Fast path: debounce active — already fired within 30 minutes
    if (isDebounced(stateFilePath)) return {};

    // Write debounce state before returning context
    await writeDebounceState(stateFilePath);

    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: ADDITIONAL_CONTEXT,
      },
      message: 'Workflow query detected — /aicodepath-analyze required',
    };
  } catch (_) {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  isWorkflowQuery,
  isDebounced,
  workflowQueryDetectorHookImpl,
  hook: workflowQueryDetectorHookImpl,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(workflowQueryDetectorHookImpl, { name: 'workflow-query-detector' });
}
