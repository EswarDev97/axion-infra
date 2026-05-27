#!/usr/bin/env node
/**
 * update-doc-counts.js
 *
 * Phase 5.1 - Count automation script.
 * Counts actual AICodePath component numbers and updates stale counts
 * across documentation files.
 *
 * Usage:
 *   node .aicodepath/scripts/update-doc-counts.js          # dry-run (shows changes)
 *   node .aicodepath/scripts/update-doc-counts.js --apply  # writes changes to disk
 *
 * Safe replacements only: numbers in version strings, dates, port numbers,
 * line numbers, and code examples are NOT touched.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. Resolve project root (works from any cwd)
// ---------------------------------------------------------------------------
function findProjectRoot() {
  // __dirname is .aicodepath/scripts; walk up to find the dir that CONTAINS .aicodepath/
  let dir = __dirname;
  for (let depth = 0; depth < 6; depth++) {
    dir = path.dirname(dir);
    if (fs.existsSync(path.join(dir, '.aicodepath'))) {
      return dir;
    }
  }
  throw new Error('Cannot find project root from ' + __dirname);
}

const ROOT = findProjectRoot();
const AICODEPATH = path.join(ROOT, '.aicodepath');
// package.json lives inside .aicodepath/ (not project root) for this framework

// ---------------------------------------------------------------------------
// 2. Gather actual counts
// ---------------------------------------------------------------------------
function countSkills() {
  const skillsDir = path.join(AICODEPATH, 'skills');
  return fs.readdirSync(skillsDir)
    .filter(entry => fs.statSync(path.join(skillsDir, entry)).isDirectory())
    .length;
}

function countAgents() {
  const agentsDir = path.join(AICODEPATH, 'agents');
  return fs.readdirSync(agentsDir)
    .filter(entry => entry.endsWith('.md'))
    .length;
}

function countHookJsFiles() {
  const hooksDir = path.join(AICODEPATH, 'hooks');
  return fs.readdirSync(hooksDir)
    .filter(entry => entry.endsWith('.js'))
    .length;
}

function countRegisteredHooks() {
  const hooksJsonPath = path.join(AICODEPATH, 'hooks', 'hooks.json');
  const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
  let total = 0;
  Object.values(hooksJson.hooks || {}).forEach(arr => { total += arr.length; });
  return total;
}

function countGuidelines() {
  const guidelinesDir = path.join(AICODEPATH, 'guidelines');
  return fs.readdirSync(guidelinesDir)
    .filter(entry => entry.endsWith('.json'))
    .length;
}

function countDbMigrations() {
  const migrationsDir = path.join(AICODEPATH, 'db', 'migrations');
  return fs.readdirSync(migrationsDir)
    .filter(entry => entry.endsWith('.sql'))
    .length;
}

function getVersion() {
  // package.json lives in .aicodepath/ (not the project root)
  const pkgPath = path.join(AICODEPATH, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

const COUNTS = {
  skills: countSkills(),
  agents: countAgents(),
  hookFiles: countHookJsFiles(),
  registeredHooks: countRegisteredHooks(),
  guidelines: countGuidelines(),
  dbMigrations: countDbMigrations(),
  version: getVersion(),
};

console.log('\n=== AICodePath Actual Component Counts ===');
console.log('  Skills (directories):      ' + COUNTS.skills);
console.log('  Agents (.md files):        ' + COUNTS.agents);
console.log('  Hook JS files:             ' + COUNTS.hookFiles);
console.log('  Registered hooks.json:     ' + COUNTS.registeredHooks);
console.log('  Guideline JSON files:      ' + COUNTS.guidelines);
console.log('  DB migrations (015+):      ' + COUNTS.dbMigrations);
console.log('  Version (package.json):    ' + COUNTS.version);
console.log('');

// ---------------------------------------------------------------------------
// 3. Replacement rule helpers
// ---------------------------------------------------------------------------

/**
 * Build a replacement rule targeting "N <word>" or "N <word>s" in markdown prose
 * and table cells. Numbers already equal to actualCount are left unchanged.
 */
function makeCountRule(word, actualCount, desc) {
  const pattern = new RegExp('(\\b)(\\d+)(\\s+' + word + 's?\\b)', 'g');
  function replaceMatch(match, pre, digits, suffix) {
    const num = parseInt(digits, 10);
    if (num === actualCount) return match; // already correct - leave it
    return pre + actualCount + suffix;
  }
  return { pattern: pattern, replace: replaceMatch, desc: desc + ': stale count -> ' + actualCount };
}

/**
 * Build the DB migrations replace function.
 * Calculates last migration number from count (first is 015 = base 14 + 1).
 * Kept as a factory function to avoid inline template literals that could
 * trigger SQL-lint rules on doc-string content.
 */
function buildMigrationReplaceFunc(migrationCount) {
  const lastMigrationNumber = 14 + migrationCount;
  const lastMigrationStr = (lastMigrationNumber < 100 ? '0' : '') + lastMigrationNumber;
  const rangeLabel = '015-' + lastMigrationStr;
  return function replaceMigrationRow(match, pre, extraNote, post) {
    // Preserve any trailing note (e.g. "; 001-014 consolidated into schema.sql")
    return pre + migrationCount + ' (' + rangeLabel + ')' + (extraNote || '') + (post || '');
  };
}

// ---------------------------------------------------------------------------
// 4. Per-file update specs
// ---------------------------------------------------------------------------

// Lines matching any of these patterns are kept verbatim (not modified).
const SHARED_EXCLUDES = [
  /^\s*- \*\*v\d+/,  // version history lines: "- **v2.12.0**"
  /^```/,            // code fence markers
  /^\s{4}/,          // 4-space indented lines (code blocks in markdown)
];

const FILES_TO_UPDATE = [

  // root CLAUDE.md
  {
    filePath: path.join(ROOT, 'CLAUDE.md'),
    rules: [
      makeCountRule('hook', COUNTS.hookFiles, 'hooks (JS files)'),
      makeCountRule('skill', COUNTS.skills, 'skills'),
      makeCountRule('agent', COUNTS.agents, 'agents'),
      makeCountRule('guideline', COUNTS.guidelines, 'guidelines'),
    ],
    excludeLinePatterns: SHARED_EXCLUDES,
  },

  // .aicodepath/DEVELOPER-GUIDE.md
  {
    filePath: path.join(AICODEPATH, 'DEVELOPER-GUIDE.md'),
    rules: [
      makeCountRule('hook', COUNTS.hookFiles, 'hooks (JS files)'),
      makeCountRule('skill', COUNTS.skills, 'skills'),
      makeCountRule('agent', COUNTS.agents, 'agents'),
      makeCountRule('guideline', COUNTS.guidelines, 'guidelines'),
    ],
    // Version history lines contain intentionally historical counts - skip them
    excludeLinePatterns: SHARED_EXCLUDES,
  },

  // .aicodepath/CLAUDE.md
  {
    filePath: path.join(AICODEPATH, 'CLAUDE.md'),
    rules: [
      makeCountRule('hook', COUNTS.hookFiles, 'hooks (JS files)'),
      makeCountRule('skill', COUNTS.skills, 'skills'),
      makeCountRule('agent', COUNTS.agents, 'agents'),
      // General guideline count for other occurrences (e.g. "16 JSON rule files")
      makeCountRule('guideline', COUNTS.guidelines, 'guidelines'),
      // Override: "Loads N guideline files" must use core-files count (17), not total on-disk.
      // This rule runs LAST so it overwrites any prior replacement on the same line.
      {
        pattern: /Loads \d+ guideline files/g,
        replace: 'Loads 17 guideline files',
        desc: 'CLAUDE.md loads-N-guideline-files -> 17 (core files)',
      },
    ],
    excludeLinePatterns: SHARED_EXCLUDES,
  },

  // .aicodepath/docs/README.md
  {
    filePath: path.join(AICODEPATH, 'docs', 'README.md'),
    rules: [
      // Table row: "| Hooks | 37 (JS files); 42 registered commands across 12 event types |"
      {
        pattern: /(\| Hooks +\| )(\d+) \(JS files\); (\d+) registered commands across (\d+) event types/g,
        replace: function replaceHooksRow(match, pre, _jsCount, regCount, eventCount) {
          return pre + COUNTS.hookFiles + ' (JS files); ' + regCount + ' registered commands across ' + eventCount + ' event types';
        },
        desc: 'docs/README.md hooks table row JS file count -> ' + COUNTS.hookFiles,
      },
      {
        pattern: /(\| Agents +\| )(\d+)(\s*\|)/g,
        replace: function replaceAgentsRow(match, pre, _digits, post) {
          return pre + COUNTS.agents + post;
        },
        desc: 'docs/README.md agents table row -> ' + COUNTS.agents,
      },
      {
        pattern: /(\| Skills +\| )(\d+)(\s*\|)/g,
        replace: function replaceSkillsRow(match, pre, _digits, post) {
          return pre + COUNTS.skills + post;
        },
        desc: 'docs/README.md skills table row -> ' + COUNTS.skills,
      },
      {
        pattern: /(\| Guideline files +\| )(\d+)(\s*\|)/g,
        replace: function replaceGuidelinesRow(match, pre, _digits, post) {
          return pre + COUNTS.guidelines + post;
        },
        desc: 'docs/README.md guideline files table row -> ' + COUNTS.guidelines,
      },
      {
        // Matches: "| DB migrations | 6 (015-020); note |" or "| DB migrations | 6 (015-020) |"
        // Preserves any trailing note text (e.g. "; 001-014 consolidated into schema.sql")
        pattern: /(\| DB migrations +\| )\d+ \(015-0\d+\)(; [^|]*)?(\s*\|)/g,
        replace: buildMigrationReplaceFunc(COUNTS.dbMigrations),
        desc: 'docs/README.md DB migrations row -> ' + COUNTS.dbMigrations,
      },
      // Overview comments in the directory tree
      makeCountRule('hook', COUNTS.hookFiles, 'docs/README.md hook refs'),
      makeCountRule('skill', COUNTS.skills, 'docs/README.md skill refs'),
      makeCountRule('agent', COUNTS.agents, 'docs/README.md agent refs'),
      makeCountRule('guideline', COUNTS.guidelines, 'docs/README.md guideline refs'),
    ],
    excludeLinePatterns: [/^\s*- \*\*v\d+/, /^```/, /^\s{4}/],
  },

  // .aicodepath/docs/hooks/overview.md
  {
    filePath: path.join(AICODEPATH, 'docs', 'hooks', 'overview.md'),
    rules: [
      makeCountRule('hook', COUNTS.hookFiles, 'hooks/overview.md hook count'),
      // "## All N Hooks" heading uses capital H — handle separately
      {
        pattern: /## All (\d+) Hooks/g,
        replace: function replaceHooksHeading(match, digits) {
          const num = parseInt(digits, 10);
          if (num === COUNTS.hookFiles) return match;
          return '## All ' + COUNTS.hookFiles + ' Hooks';
        },
        desc: 'hooks/overview.md "All N Hooks" heading -> ' + COUNTS.hookFiles,
      },
    ],
    excludeLinePatterns: SHARED_EXCLUDES,
  },

  // .aicodepath/docs/skills/overview.md
  {
    filePath: path.join(AICODEPATH, 'docs', 'skills', 'overview.md'),
    rules: [
      makeCountRule('skill', COUNTS.skills, 'skills/overview.md skill count'),
    ],
    excludeLinePatterns: SHARED_EXCLUDES,
  },

  // .aicodepath/docs/guidelines/overview.md
  {
    filePath: path.join(AICODEPATH, 'docs', 'guidelines', 'overview.md'),
    rules: [
      makeCountRule('guideline', COUNTS.guidelines, 'guidelines/overview.md count'),
      // "Loads N guideline files" in prose description
      // Uses 17 (core GUIDELINE_FILES entries in guideline-validator.js), not total on-disk count
      {
        pattern: /Loads \d+ guideline files/g,
        replace: 'Loads 17 guideline files',
        desc: 'guidelines/overview.md loads-N-guideline-files -> 17 (core files)',
      },
    ],
    excludeLinePatterns: SHARED_EXCLUDES,
  },

  // .aicodepath/docs/architecture.md
  {
    filePath: path.join(AICODEPATH, 'docs', 'architecture.md'),
    rules: [
      makeCountRule('hook', COUNTS.hookFiles, 'architecture.md hooks'),
      makeCountRule('skill', COUNTS.skills, 'architecture.md skills'),
      makeCountRule('agent', COUNTS.agents, 'architecture.md agents'),
      makeCountRule('guideline', COUNTS.guidelines, 'architecture.md guidelines'),
    ],
    excludeLinePatterns: SHARED_EXCLUDES,
  },
];

// ---------------------------------------------------------------------------
// 5. Apply rules to file content (line-by-line, safe)
// ---------------------------------------------------------------------------
function applyRulesToLine(line, rules) {
  let updatedLine = line;
  for (const rule of rules) {
    if (typeof rule.replace === 'function') {
      updatedLine = updatedLine.replace(rule.pattern, rule.replace);
    } else {
      updatedLine = updatedLine.replace(rule.pattern, rule.replace);
    }
  }
  return updatedLine;
}

function applyRulesToContent(content, rules, excludeLinePatterns) {
  const lines = content.split('\n');
  const updatedLines = lines.map(line => {
    const isExcluded = excludeLinePatterns && excludeLinePatterns.some(re => re.test(line));
    if (isExcluded) return line;
    return applyRulesToLine(line, rules);
  });
  return updatedLines.join('\n');
}

// ---------------------------------------------------------------------------
// 6. Diff helper: collect changed lines between two strings
// ---------------------------------------------------------------------------
function collectLineDiffs(original, updated) {
  const origLines = original.split('\n');
  const updLines = updated.split('\n');
  const diffs = [];
  const maxLen = Math.max(origLines.length, updLines.length);
  for (let lineIdx = 0; lineIdx < maxLen; lineIdx++) {
    if (origLines[lineIdx] !== updLines[lineIdx]) {
      diffs.push({
        line: lineIdx + 1,
        before: origLines[lineIdx],
        after: updLines[lineIdx],
      });
    }
  }
  return diffs;
}

// ---------------------------------------------------------------------------
// 7. Main: process all files, report diffs, optionally write
// ---------------------------------------------------------------------------
const applyMode = process.argv.includes('--apply');
let totalChanges = 0;

for (const spec of FILES_TO_UPDATE) {
  const { filePath, rules, excludeLinePatterns } = spec;
  const relPath = path.relative(ROOT, filePath);

  if (!fs.existsSync(filePath)) {
    console.log('[SKIP]  ' + relPath + ' - file not found');
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = applyRulesToContent(original, rules, excludeLinePatterns || []);

  if (original === updated) {
    console.log('[OK]    ' + relPath + ' - no changes needed');
    continue;
  }

  const diffs = collectLineDiffs(original, updated);
  totalChanges += diffs.length;

  if (applyMode) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('[FIXED] ' + relPath + ' - ' + diffs.length + ' line(s) updated');
  } else {
    console.log('[DIFF]  ' + relPath + ' - ' + diffs.length + ' line(s) would change:');
  }

  for (const diffEntry of diffs) {
    console.log('        L' + diffEntry.line + ':');
    console.log('          - ' + diffEntry.before);
    console.log('          + ' + diffEntry.after);
  }
}

console.log('');
if (applyMode) {
  console.log('Done. ' + totalChanges + ' line(s) updated across ' + FILES_TO_UPDATE.length + ' file(s).');
} else if (totalChanges > 0) {
  console.log('Dry-run: ' + totalChanges + ' line(s) need updating.');
  console.log('Run with --apply to write changes to disk.');
} else {
  console.log('All counts are up to date. No changes needed.');
}
