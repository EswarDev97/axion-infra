#!/usr/bin/env node
/**
 * Plan Role Activator Hook — UserPromptSubmit
 *
 * Detects phase/task-start signals in the user's prompt, reads the active
 * plan to extract current task keywords, matches them against role `triggers`
 * frontmatter, and injects the best-fit role as `additionalContext` — only
 * when not already loaded this session.
 *
 * @module hooks/plan-role-activator
 */

'use strict';

// ---------------------------------------------------------------------------
// Phase-start signal detection
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate the user is starting a new task or phase.
 * Ordered from most specific to most general.
 */
const PHASE_START_PATTERNS = [
  // Explicit task ID references: P2-1, D-1, B-3, W-2, S-1, F-1, I-1
  /\b[A-Z]\d*-\d+\b/,
  // Task boundary phrases
  /\bstart\s+task\b/i,
  /\bnext\s+task\b/i,
  /\bbegin\s+task\b/i,
  // Implementation signals
  /\blet['']?s\s+implement\b/i,
  /\bimplement\s+the\b/i,
  // Planning signals
  /\bwrite\s+plan\b/i,
  /\bwrite\s+a\s+plan\b/i,
  // Requirements signals
  /\brequirements\s+for\b/i,
  /\bbegin\s+requirements\b/i,
  // Design signals
  /\bdesign\s+the\b/i,
  /\bbrainstorm\s+the\b/i,
  /\blet['']?s\s+build\b/i,
  /\bmove\s+on\s+to\b/i,
  /\bwork\s+on\s+[A-Z]/i,
];

/**
 * Returns true if the prompt contains a phase/task-start signal.
 * @param {string} prompt
 * @returns {boolean}
 */
function detectPhaseStart(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  return PHASE_START_PATTERNS.some(pattern => pattern.test(prompt));
}

// ---------------------------------------------------------------------------
// Plan keyword extraction
// ---------------------------------------------------------------------------

const fs = require('fs').promises;
const path = require('path');

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at',
  'by', 'is', 'it', 'its', 'be', 'as', 'up', 'if', 'do', 'no', 'so',
  'we', 'he', 'she', 'they', 'this', 'that', 'with', 'from', 'into',
  'via', 'per', 'all', 'new', 'why', 'how', 'what', 'when', 'where',
  'task', 'step', 'steps', 'done', 'will', 'can', 'not', 'are', 'was',
  'has', 'have', 'had', 'but', 'use', 'add', 'get', 'set', 'run', 'now',
]);

/**
 * Find the most recently modified .md file in plansDir.
 * @param {string} plansDir
 * @returns {Promise<string|null>} Absolute path or null
 */
async function findLatestPlanFile(plansDir) {
  let entries;
  try {
    entries = await fs.readdir(plansDir);
  } catch {
    return null;
  }

  const mdFiles = entries.filter(f => f.endsWith('.md'));
  if (mdFiles.length === 0) return null;

  const stats = await Promise.all(
    mdFiles.map(async f => {
      const full = path.join(plansDir, f);
      const stat = await fs.stat(full);
      return { full, mtime: stat.mtimeMs };
    })
  );

  stats.sort((a, b) => b.mtime - a.mtime);
  return stats[0].full;
}

/**
 * Given plan markdown content, extract the description text of the first
 * task section not marked as completed (✅).
 * @param {string} content
 * @returns {string}
 */
function extractActiveTaskText(content) {
  // Split on task headings (### Task N: ...)
  const taskSections = content.split(/^###\s+Task\s+\d+:/m);

  for (const section of taskSections.slice(1)) {
    const firstLine = section.split('\n')[0];
    if (firstLine.includes('✅')) continue;
    return section;
  }
  return '';
}

/**
 * Tokenise text into meaningful lowercase words, filtering stop-words
 * and short tokens.
 * @param {string} text
 * @returns {string[]}
 */
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Read the most recent plan in plansDir and return keywords from the
 * first incomplete task.
 * @param {string} plansDir
 * @returns {Promise<string[]>}
 */
async function extractPlanKeywords(plansDir) {
  try {
    const planFile = await findLatestPlanFile(plansDir);
    if (!planFile) return [];

    const content = await fs.readFile(planFile, 'utf8');
    const activeText = extractActiveTaskText(content);
    if (!activeText) return [];

    return [...new Set(tokenise(activeText))];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Session state manager
// ---------------------------------------------------------------------------

const EMPTY_STATE = () => ({ activeRoles: [], loadedAt: {}, lastTaskKeywords: [] });

class SessionStateManager {
  /**
   * @param {string} stateFilePath - Absolute path to session-roles.json
   */
  constructor(stateFilePath) {
    this.stateFilePath = stateFilePath;
  }

  /** Load state from disk. Returns empty state on missing or corrupt file. */
  async load() {
    try {
      const raw = await fs.readFile(this.stateFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        activeRoles: parsed.activeRoles || [],
        loadedAt: parsed.loadedAt || {},
        lastTaskKeywords: parsed.lastTaskKeywords || [],
      };
    } catch {
      return EMPTY_STATE();
    }
  }

  /** Persist state to disk. */
  async save(state) {
    await fs.writeFile(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  }

  /**
   * Returns true if the named role is already in activeRoles.
   * @param {string} roleName
   * @param {Object} state
   */
  isRoleLoaded(roleName, state) {
    return Array.isArray(state.activeRoles) && state.activeRoles.includes(roleName);
  }

  /**
   * Returns true if the given keywords match the last saved task's keywords,
   * indicating we are still on the same task (no re-injection needed).
   * Comparison is order-independent.
   * @param {string[]} keywords
   * @param {Object} state
   */
  isSameTask(keywords, state) {
    const saved = state.lastTaskKeywords;
    if (!Array.isArray(saved) || saved.length === 0) return false;
    if (keywords.length !== saved.length) return false;
    const sortedNew = [...keywords].sort().join(',');
    const sortedSaved = [...saved].sort().join(',');
    return sortedNew === sortedSaved;
  }
}

// ---------------------------------------------------------------------------
// Role resolver
// ---------------------------------------------------------------------------

const AgentLoader = require('../lib/agent-loader');
const AgentRegistry = require('../lib/agent-registry');
const pathResolver = require('../lib/path-resolver');

/**
 * Score roles against keywords and return the best match with its content.
 * @param {string[]} keywords
 * @returns {Promise<{name: string, content: string}|null>}
 */
async function resolveRole(keywords) {
  if (!keywords || keywords.length === 0) return null;

  try {
    const aicodePathRoot = pathResolver.getAicodePathRoot();
    const rolesDir = path.join(aicodePathRoot, 'skills', 'roles');
    const loader = new AgentLoader(rolesDir);
    const agents = await loader.loadAll();

    const registry = new AgentRegistry();
    registry.register(agents);

    // Accumulate hit counts per agent across all keyword lookups.
    // findByCapability returns plain agent objects (no score wrapper).
    const scores = new Map();
    for (const keyword of keywords) {
      const matches = registry.findByCapability(keyword);
      matches.forEach((agent, idx) => {
        if (agent && agent.name) {
          // Weight by position in results (first match scores highest)
          const weight = Math.max(1, 10 - idx);
          scores.set(agent.name, (scores.get(agent.name) || 0) + weight);
        }
      });
    }

    if (scores.size === 0) return null;

    const topName = [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const topAgent = registry.findByName(topName);
    if (!topAgent) return null;

    const content = topAgent.guidelines || topAgent.content || '';
    if (!content) return null;

    return { name: topAgent.name, content };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main hook implementation
// ---------------------------------------------------------------------------

const DEFAULT_PLANS_DIR = path.join(
  pathResolver.getAicodePathRoot ? pathResolver.getAicodePathRoot() : process.cwd(),
  '..', 'aicodepath-docs', 'plans'
);
const DEFAULT_STATE_FILE = path.join(
  pathResolver.getAicodePathRoot ? pathResolver.getAicodePathRoot() : process.cwd(),
  '..', 'aicodepath-docs', 'session-roles.json'
);

/**
 * Main hook implementation — called by wrapHook on UserPromptSubmit.
 *
 * @param {Object} hookData - Hook payload from Claude Code
 * @param {Object} [overrides] - Testable dependency overrides (plansDir, stateFilePath)
 * @returns {Promise<Object>} Hook result
 */
async function planRoleActivatorHookImpl(hookData = {}, overrides = {}) {
  try {
    const prompt = hookData.prompt || hookData.message || '';

    // Fast path: no phase-start signal → nothing to do
    if (!detectPhaseStart(prompt)) return {};

    const plansDir = overrides.plansDir || DEFAULT_PLANS_DIR;
    const stateFilePath = overrides.stateFilePath || DEFAULT_STATE_FILE;
    const stateManager = new SessionStateManager(stateFilePath);

    // Load session state
    const state = await stateManager.load();

    // Extract keywords from active plan task
    const keywords = await extractPlanKeywords(plansDir);
    if (keywords.length === 0) return {};

    // Fast path: same task as last time — no re-injection needed
    if (stateManager.isSameTask(keywords, state)) return {};

    // Resolve best-fit role for this task
    const role = await resolveRole(keywords);
    if (!role) return {};

    // Inject role and persist updated state
    await stateManager.save({
      activeRoles: [role.name],
      loadedAt: { ...state.loadedAt, [role.name]: new Date().toISOString() },
      lastTaskKeywords: keywords,
    });

    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `<!-- Role: ${role.name} -->\n${role.content}`,
      },
      message: `Role activated: ${role.name}`,
    };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  detectPhaseStart,
  extractPlanKeywords,
  SessionStateManager,
  resolveRole,
  planRoleActivatorHookImpl,
  hook: planRoleActivatorHookImpl,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(planRoleActivatorHookImpl, { name: 'plan-role-activator' });
}
