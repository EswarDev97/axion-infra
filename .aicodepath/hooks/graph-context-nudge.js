#!/usr/bin/env node
/**
 * Graph Context Nudge — PreToolUse Hook
 *
 * When Claude is about to run a Glob or Grep search, checks whether the code
 * graph is already indexed and, if so, injects a short reminder that graph
 * tools (callers_of, callees_of, search_entities, …) may give a faster and
 * more semantically accurate answer than a file-system search.
 *
 * Only fires when:
 *  1. The `graph_nudge` feature flag is enabled (default: true).
 *  2. The `graph-indexed.json` flag file exists (written by MCP server or
 *     graph-bridge.js after a successful index run).
 *
 * Returns an empty additionalContext (pass-through) in all error paths so it
 * can never block a session.
 *
 * @module hooks/graph-context-nudge
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const { isEnabled } = require('../lib/feature-flags');
const logger = require('../lib/logger');

const FLAG_SUBPATH = path.join('aicodepath-docs', 'state', 'graph-indexed.json');

/**
 * Read the graph-indexed.json flag file from the project root.
 *
 * @param {string} projectRoot
 * @returns {{ entities: number, relations: number, indexed_at: string } | null}
 *   Parsed flag contents, or null if the file is missing or unreadable.
 */
function readFlag(projectRoot) {
  const flagPath = path.join(projectRoot, FLAG_SUBPATH);
  try {
    const raw = fs.readFileSync(flagPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Build the additionalContext snippet to inject when the graph is indexed.
 *
 * @param {{ entities: number, relations: number }} flag
 * @returns {string}
 */
function buildContext(flag) {
  const entities = flag.entities ?? '?';
  const relations = flag.relations ?? '?';
  return [
    '## Code Graph Available',
    '',
    `The code graph is indexed (${entities} entities, ${relations} relations).`,
    'Before using file-system search (Glob/Grep), consider these graph tools — they',
    'understand call relationships and may be faster:',
    '',
    '- `callers_of(entity_name)` — who calls this function/class?',
    '- `callees_of(entity_name)` — what does this entity call?',
    '- `search_entities(query)` — find entities by name (uses FTS5 when available)',
    '- `impact_radius(entity_name)` — what else would break if this changes?',
    '',
    'Use Glob/Grep when you need raw file content or the entity is not yet indexed.',
  ].join('\n');
}

/**
 * PreToolUse hook handler.
 *
 * @param {Object} hookData - Hook payload from Claude Code.
 * @returns {Object} Hook result.
 */
async function hook(hookData) {
  const toolName = hookData?.tool_name;

  // Only fire for Glob and Grep
  if (toolName !== 'Glob' && toolName !== 'Grep') {
    return {};
  }

  // Feature flag gate
  if (!isEnabled('graph_nudge')) {
    return {};
  }

  let projectRoot;
  try {
    projectRoot = findProjectRoot(process.cwd());
  } catch {
    return {};
  }

  const flag = readFlag(projectRoot);
  if (!flag) {
    return {};
  }

  const additionalContext = buildContext(flag);

  logger.info('graph-context-nudge: injecting graph context', {
    context: 'graph-context-nudge',
    entities: flag.entities,
    tool: toolName,
  });

  return {
    hookSpecificOutput: {
      additionalContext,
    },
  };
}

module.exports = { hook, readFlag, buildContext };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(hook, { name: 'graph-context-nudge' });
}
