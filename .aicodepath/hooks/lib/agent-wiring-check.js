#!/usr/bin/env node
/**
 * Agent Wiring Check (F5)
 *
 * Deterministic D4 wiring verification for AICodePath agents.
 * Checks 9 wiring points across DOMAIN_MAPPING, taxonomy, symlinks,
 * doc files, plugin_pack field, pack manifest, and marketplace.
 *
 * No LLM calls — all checks are file-system reads and string searches.
 * Max score: 18 points.
 *
 * @module hooks/lib/agent-wiring-check
 */

'use strict';

const fs = require('fs');
const path = require('path');

const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

// Score weights per sub-check (total: 18)
const WEIGHTS = {
  suggesterMap:       4,
  taxonomyRow:        3,
  taxonomyPhase:      2,
  taxonomyWhenToInvoke: 2,
  symlink:            2,
  docFile:            2,
  pluginPackField:    1,
  pluginPackManifest: 1,
  marketplaceEntry:   1,
};

/**
 * Parse YAML-style frontmatter from an agent .md file.
 * Returns an object of key→value pairs from the --- block.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kv) result[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return result;
}

/**
 * Strip the 'aicodepath-' prefix to get the bare agent name used in DOMAIN_MAPPING.
 * E.g. 'aicodepath-security-engineer' → 'security-engineer'
 */
function strippedName(agentName) {
  return agentName.replace(/^aicodepath-/, '');
}

/**
 * Run deterministic wiring checks for a single agent.
 *
 * @param {string} agentName  Full agent name with aicodepath- prefix
 *                            (e.g. 'aicodepath-security-engineer')
 * @param {object} [options]
 * @param {string} [options.projectRoot]    Override project root
 * @param {string} [options.agentFilePath]  Override agent .md file path
 * @param {string} [options.suggestFilePath] Override agent-suggester.js path
 * @param {string} [options.taxonomyFilePath] Override agent-taxonomy.md path
 * @returns {{ score: number, max: number, missing: string[], details: object }}
 * @throws {Error} If agentName does not resolve to an existing agent file
 */
function quickWiringCheck(agentName, options = {}) {
  const root = options.projectRoot || pathResolver.findProjectRoot();

  // Resolve paths (with optional overrides for testing)
  const agentFilePath = options.agentFilePath
    || path.join(root, '.aicodepath', 'agents', `${agentName}.md`);
  const suggestFilePath = options.suggestFilePath
    || path.join(root, '.aicodepath', 'hooks', 'lib', 'agent-suggester.js');
  const taxonomyFilePath = options.taxonomyFilePath
    || path.join(root, '.aicodepath', 'skills', 'aicodepath-classify-component', 'references', 'agent-taxonomy.md');
  const symlinkPath = path.join(root, '.claude', 'agents', `${agentName}.md`);
  const docFilePath = path.join(root, '.aicodepath', 'docs', 'agents', `${agentName}.md`);
  const marketplacePath = path.join(root, '.aicodepath', '.claude-plugin', 'marketplace.json');
  const packsDir = path.join(root, '.aicodepath', '.claude-plugin', 'packs');

  // Guard: agent file must exist (or override path must exist)
  if (!fs.existsSync(agentFilePath)) {
    throw new Error(`Unknown agent: "${agentName}" — file not found at ${agentFilePath}`);
  }

  const bare = strippedName(agentName);
  const details = {};
  const missing = [];

  // ── D4.1 suggesterMap (4pts) ──────────────────────────────────────────────
  // Agent name appears as a value in DOMAIN_MAPPING in agent-suggester.js
  try {
    const suggestContent = fs.readFileSync(suggestFilePath, 'utf8');
    // Search all content after the first DOMAIN_MAPPING occurrence.
    // Use slice(1).join() to avoid missing entries in later sections of a
    // multi-section DOMAIN_MAPPING (the split produces N+1 parts for N occurrences).
    const parts = suggestContent.split('DOMAIN_MAPPING');
    const dmSection = parts.length > 1 ? parts.slice(1).join('DOMAIN_MAPPING') : suggestContent;
    details.suggesterMap = dmSection.includes(`'${bare}'`) || dmSection.includes(`"${bare}"`);
  } catch (e) {
    details.suggesterMap = false;
    logger.warn(`suggesterMap: could not read ${suggestFilePath}`, { context: 'agent-wiring-check' });
  }
  if (!details.suggesterMap) missing.push('suggesterMap');

  // ── D4.2 taxonomyRow (3pts) ───────────────────────────────────────────────
  // Agent name appears in a table row in agent-taxonomy.md
  let taxonomyContent = '';
  try {
    taxonomyContent = fs.readFileSync(taxonomyFilePath, 'utf8');
    details.taxonomyRow = taxonomyContent.includes(agentName);
  } catch (e) {
    details.taxonomyRow = false;
    logger.warn(`taxonomyRow: could not read ${taxonomyFilePath}`, { context: 'agent-wiring-check' });
  }
  if (!details.taxonomyRow) missing.push('taxonomyRow');

  // ── D4.3 taxonomyPhase (2pts) ─────────────────────────────────────────────
  // Taxonomy row for this agent has a non-empty Phase column
  if (details.taxonomyRow && taxonomyContent) {
    const rowMatch = taxonomyContent
      .split('\n')
      .find(line => line.includes(agentName));
    if (rowMatch) {
      const cols = rowMatch.split('|').map(c => c.trim()).filter(Boolean);
      // Table: | Component Type | Agent | Phase | When to Invoke |
      // cols[0]=type, cols[1]=agent, cols[2]=phase, cols[3]=whenToInvoke
      details.taxonomyPhase = cols.length >= 3 && cols[2] && cols[2].length > 0 && cols[2] !== '—';
    } else {
      details.taxonomyPhase = false;
    }
  } else {
    details.taxonomyPhase = false;
  }
  if (!details.taxonomyPhase) missing.push('taxonomyPhase');

  // ── D4.4 taxonomyWhenToInvoke (2pts) ──────────────────────────────────────
  if (details.taxonomyRow && taxonomyContent) {
    const rowMatch = taxonomyContent
      .split('\n')
      .find(line => line.includes(agentName));
    if (rowMatch) {
      const cols = rowMatch.split('|').map(c => c.trim()).filter(Boolean);
      details.taxonomyWhenToInvoke = cols.length >= 4 && cols[3] && cols[3].length > 0 && cols[3] !== '—';
    } else {
      details.taxonomyWhenToInvoke = false;
    }
  } else {
    details.taxonomyWhenToInvoke = false;
  }
  if (!details.taxonomyWhenToInvoke) missing.push('taxonomyWhenToInvoke');

  // ── D4.5 symlink (2pts) ───────────────────────────────────────────────────
  details.symlink = fs.existsSync(symlinkPath);
  if (!details.symlink) missing.push('symlink');

  // ── D4.6 docFile (2pts) ───────────────────────────────────────────────────
  details.docFile = fs.existsSync(docFilePath);
  if (!details.docFile) missing.push('docFile');

  // ── D4.7 pluginPackField (1pt) ────────────────────────────────────────────
  let pluginPackValue = null;
  try {
    const agentContent = fs.readFileSync(agentFilePath, 'utf8');
    const frontmatter = parseFrontmatter(agentContent);
    pluginPackValue = frontmatter.plugin_pack || null;
    details.pluginPackField = 'plugin_pack' in frontmatter;
  } catch (e) {
    details.pluginPackField = false;
    logger.warn(`pluginPackField: could not read ${agentFilePath}`, { context: 'agent-wiring-check' });
  }
  if (!details.pluginPackField) missing.push('pluginPackField');

  // ── D4.8 pluginPackManifest (1pt) ─────────────────────────────────────────
  // If plugin_pack is set, the agent file must appear in that pack's plugin.json
  if (pluginPackValue && pluginPackValue !== 'null' && pluginPackValue !== '') {
    try {
      const packJsonPath = path.join(packsDir, pluginPackValue, 'plugin.json');
      const packData = JSON.parse(fs.readFileSync(packJsonPath, 'utf8'));
      const agents = packData.agents || [];
      details.pluginPackManifest = agents.some(p => p.endsWith(`/${agentName}.md`));
    } catch (e) {
      details.pluginPackManifest = false;
      logger.warn(`pluginPackManifest: could not verify pack ${pluginPackValue}`, { context: 'agent-wiring-check' });
    }
  } else if (pluginPackValue === null || pluginPackValue === '' || pluginPackValue === 'null') {
    // No pack — this check is N/A; award the point (agent is intentionally pack-free)
    details.pluginPackManifest = true;
  } else {
    details.pluginPackManifest = false;
  }
  if (!details.pluginPackManifest) missing.push('pluginPackManifest');

  // ── D4.9 marketplaceEntry (1pt) ───────────────────────────────────────────
  // If plugin_pack is set, the pack name must appear in marketplace.json
  if (pluginPackValue && pluginPackValue !== 'null' && pluginPackValue !== '') {
    try {
      const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
      const plugins = marketplace.plugins || [];
      const expectedName = `aicodepath-${pluginPackValue}`;
      details.marketplaceEntry = plugins.some(p => p.name === expectedName);
    } catch (e) {
      details.marketplaceEntry = false;
      logger.warn(`marketplaceEntry: could not read marketplace.json`, { context: 'agent-wiring-check' });
    }
  } else if (pluginPackValue === null || pluginPackValue === '' || pluginPackValue === 'null') {
    details.marketplaceEntry = true;
  } else {
    details.marketplaceEntry = false;
  }
  if (!details.marketplaceEntry) missing.push('marketplaceEntry');

  // ── Compute score ─────────────────────────────────────────────────────────
  const score = Object.entries(WEIGHTS).reduce((sum, [key, pts]) => {
    return sum + (details[key] ? pts : 0);
  }, 0);

  logger.info(`Wiring check: ${agentName} → ${score}/18${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`, {
    context: 'agent-wiring-check',
  });

  return { score, max: 18, missing, details };
}

module.exports = { quickWiringCheck };
