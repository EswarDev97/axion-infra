/**
 * Template Renderer (G2)
 *
 * Renders .tpl files to .md output files by substituting known placeholders
 * with values from a stats object. Unknown placeholders throw to prevent
 * silent corruption of rendered docs.
 *
 * @module lib/template-renderer
 */

'use strict';

const fs = require('fs');
const path = require('path');

const pathResolver = require('./path-resolver');
const logger = require('./logger');

// Only these placeholders are valid in .tpl files.
// Adding a new placeholder requires a code change here AND in stats-builder.js.
const ALLOWED_PLACEHOLDERS = new Set(['AGENT_COUNT', 'SKILL_COUNT', 'HOOK_COUNT', 'VERSION']);

const BANNER = '<!-- GENERATED FROM TEMPLATE — DO NOT EDIT. Run `acp init --render-docs` to regenerate. -->\n';

/**
 * Render a single .tpl file to an output .md file.
 *
 * @param {string} tplPath   Absolute path to the .tpl source file
 * @param {string} outPath   Absolute path to the destination .md file
 * @param {object} stats     Stats object from stats-builder.buildStats()
 * @throws {Error} If tplPath does not exist
 * @throws {Error} If the template contains an unrecognised {{PLACEHOLDER}}
 */
async function renderTemplate(tplPath, outPath, stats) {
  if (!fs.existsSync(tplPath)) {
    throw new Error(`Template file not found: ${tplPath}`);
  }

  const tplContent = fs.readFileSync(tplPath, 'utf8');

  // Validate — reject any {{UNKNOWN}} placeholders before substituting
  const found = [...tplContent.matchAll(/\{\{([A-Z_]+)\}\}/g)].map(m => m[1]);
  for (const key of found) {
    if (!ALLOWED_PLACEHOLDERS.has(key)) {
      throw new Error(
        `Unknown placeholder {{${key}}} in ${tplPath}. ` +
        `Allowed: ${[...ALLOWED_PLACEHOLDERS].join(', ')}`
      );
    }
  }

  // Build substitution map from stats
  const substitutions = {
    AGENT_COUNT: String(stats.totals.agents),
    SKILL_COUNT: String(stats.totals.skills),
    HOOK_COUNT:  String(stats.totals.hooks),
    VERSION:     String(stats.version),
  };

  let rendered = tplContent;
  for (const [key, value] of Object.entries(substitutions)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  // Prepend banner
  const output = BANNER + rendered;

  // Ensure output directory exists
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outPath, output);

  logger.info(`Rendered: ${path.basename(tplPath)} → ${path.basename(outPath)}`, {
    context: 'template-renderer',
  });
}

/**
 * Render all configured .tpl templates for the AICodePath project.
 *
 * @param {object} stats     Stats object from stats-builder.buildStats()
 * @param {object} [options]
 * @param {string} [options.projectRoot]  Override project root
 * @param {Array<{tpl:string, out:string}>} [options.templates]
 *   Custom template pairs (absolute paths). When provided, the hardcoded
 *   default pairs are skipped. Useful for testing with a temp directory.
 */
async function renderTemplates(stats, options = {}) {
  const root = options.projectRoot || pathResolver.findProjectRoot();

  // Resolve pairs: custom list takes precedence over hardcoded defaults
  let pairs;
  if (options.templates) {
    pairs = options.templates.map(t => [t.tpl, t.out]);
  } else {
    pairs = [
      [path.join(root, 'CLAUDE.md.tpl'),                                                       path.join(root, 'CLAUDE.md')],
      [path.join(root, '.aicodepath', 'CLAUDE.md.tpl'),                                        path.join(root, '.aicodepath', 'CLAUDE.md')],
      [path.join(root, '.aicodepath', 'DEVELOPER-GUIDE.md.tpl'),                               path.join(root, '.aicodepath', 'DEVELOPER-GUIDE.md')],
      [path.join(root, '.aicodepath', 'skills', 'aicodepath-catalog', 'SKILL.md.tpl'),         path.join(root, '.aicodepath', 'skills', 'aicodepath-catalog', 'SKILL.md')],
    ];
  }

  let rendered = 0;
  for (const [tplPath, outPath] of pairs) {
    if (!fs.existsSync(tplPath)) {
      logger.warn(`Template not found (skipping): ${tplPath}`, { context: 'template-renderer' });
      continue;
    }
    await renderTemplate(tplPath, outPath, stats);
    rendered++;
  }

  logger.info(`Rendered ${rendered} doc template(s)`, { context: 'template-renderer' });
}

module.exports = { renderTemplate, renderTemplates };
