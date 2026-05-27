/**
 * Stats Builder (G1)
 *
 * Reads the current AICodePath repo state and emits a stats snapshot to
 * .aicodepath/generated/agent-stats.json. Used by template-renderer.js
 * to substitute {{AGENT_COUNT}}, {{SKILL_COUNT}}, {{HOOK_COUNT}}, {{VERSION}}.
 *
 * @module lib/stats-builder
 */

'use strict';

const fs = require('fs');
const path = require('path');

const pathResolver = require('./path-resolver');
const logger = require('./logger');

/**
 * Parse YAML-style frontmatter from agent .md content.
 * Returns key→value pairs from the --- block.
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
 * Count hooks by walking the nested hooks.json structure.
 * hooks.json: { hooks: { EventName: [ { hooks: [ { type: 'command', ... } ] } ] } }
 */
function countHooks(obj) {
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countHooks(item), 0);
  }
  if (obj && typeof obj === 'object') {
    if (obj.type === 'command') return 1;
    return Object.values(obj).reduce((sum, v) => sum + countHooks(v), 0);
  }
  return 0;
}

/**
 * Build a stats snapshot of the current AICodePath installation.
 *
 * @param {object} [options]
 * @param {string} [options.projectRoot]  Override project root
 * @returns {Promise<object>} Stats object with version, generated_at, totals, agents_by_pack
 */
async function buildStats(options = {}) {
  const root = options.projectRoot || pathResolver.findProjectRoot();
  const aicodePathDir = path.join(root, '.aicodepath');

  // ── Agent count + by-pack breakdown ────────────────────────────────────────
  const agentsDir = path.join(aicodePathDir, 'agents');
  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

  const agentsByPack = {};
  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const fm = parseFrontmatter(content);
    const pack = fm.plugin_pack || '__none__';
    agentsByPack[pack] = (agentsByPack[pack] || 0) + 1;
  }

  // ── Skills count ───────────────────────────────────────────────────────────
  const skillsDir = path.join(aicodePathDir, 'skills');
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .length;

  // ── Hooks count ───────────────────────────────────────────────────────────
  const hooksJsonPath = path.join(aicodePathDir, 'hooks', 'hooks.json');
  let hookCount = 0;
  try {
    const hooksData = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
    hookCount = countHooks(hooksData);
  } catch (e) {
    logger.warn('stats-builder: could not read hooks.json', { context: 'stats-builder' });
  }

  // ── Version ───────────────────────────────────────────────────────────────
  let version = 'unknown';
  const pkgPath = path.join(aicodePathDir, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    version = pkg.version || 'unknown';
  } catch (e) {
    logger.warn('stats-builder: could not read package.json', { context: 'stats-builder' });
  }

  // ── Write to generated/ (only if counts changed) ─────────────────────────
  const generatedDir = path.join(aicodePathDir, 'generated');
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }
  const statsPath = path.join(generatedDir, 'agent-stats.json');

  // Read existing file to check if substantive data changed.
  // Preserve generated_at when nothing changed — keeps git tree clean.
  let existingGeneratedAt = null;
  let needsWrite = true;
  try {
    const existing = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    existingGeneratedAt = existing.generated_at || null;
    const sameTotals = existing.totals &&
      existing.totals.agents === agentFiles.length &&
      existing.totals.skills === skillDirs &&
      existing.totals.hooks === hookCount;
    const samePacks = JSON.stringify(existing.agents_by_pack) === JSON.stringify(agentsByPack);
    const sameVersion = existing.version === version;
    if (sameTotals && samePacks && sameVersion) {
      needsWrite = false;
    }
  } catch (_) {
    // No existing file or unreadable — write fresh
  }

  const stats = {
    version,
    generated_at: needsWrite ? new Date().toISOString() : existingGeneratedAt,
    totals: {
      agents: agentFiles.length,
      skills: skillDirs,
      hooks: hookCount,
    },
    agents_by_pack: agentsByPack,
  };

  if (needsWrite) {
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  }

  logger.info(`Stats built: ${agentFiles.length} agents, ${skillDirs} skills, ${hookCount} hooks, v${version}`, {
    context: 'stats-builder',
  });

  return stats;
}

module.exports = { buildStats };
