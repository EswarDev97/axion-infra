#!/usr/bin/env node
/**
 * check-asset.js
 *
 * Asset-mode primitive applicability matcher. Given a single file path,
 * determines which of the 12 primitives apply based on file type, path,
 * and content signature. Asset mode is the daily-driver use case — run
 * this during hook/agent/skill authoring to verify a new file satisfies
 * the primitives relevant to its role.
 *
 * Usage:
 *   node check-asset.js <file-path>
 *   node check-asset.js <file-path> --json
 *
 * Output:
 *   List of applicable primitive IDs + reason for each + the content
 *   signature that matched, so the SKILL body can dispatch the right
 *   per-primitive checks.
 *
 * Philosophy: don't run all 12 checks on every file. A permission hook
 * only needs to be checked against #2, #7, #11. A reflexion-style memory
 * module only needs #12d. Running all 12 produces noise.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Applicability rules ──────────────────────────────────────────────────
//
// Each rule is { id, primitives, when, reason } where `when` is a predicate
// over { fileName, dirPath, content }. Rules are OR-combined: if ANY rule
// matches, those primitives are added to the applicable set.

const RULES = [
  // ─── Tool Registry ────────────────────────────────────────────────────
  {
    id: 'registry-loader',
    primitives: [1],
    when: ({ fileName }) =>
      /\b(agent-registry|agent-loader|skill-loader|tool-registry|plugin-loader|bundled)\b/i.test(
        fileName,
      ),
    reason: 'file name indicates tool/agent/skill registry or loader',
  },
  {
    id: 'skill-md',
    primitives: [1],
    when: ({ fileName }) => fileName === 'SKILL.md',
    reason: 'SKILL.md is metadata-first registry content',
  },
  {
    id: 'agent-md',
    primitives: [1],
    when: ({ dirPath, fileName }) =>
      /\/agents\//.test(dirPath) && fileName.endsWith('.md'),
    reason: 'agent markdown in agents/ directory is registry content',
  },

  // ─── Permission Trust Tiers / Audit ───────────────────────────────────
  {
    id: 'permission-file',
    primitives: [2, 11],
    when: ({ fileName, dirPath }) =>
      /\bpermission\b/i.test(fileName) || /\/permissions?\//.test(dirPath),
    reason: 'file path contains "permission"',
  },
  {
    id: 'safety-hook',
    primitives: [2],
    when: ({ fileName }) => /\b(safety|guardrail|trust-tier|policy)\b/i.test(fileName),
    reason: 'safety/guardrail/policy hook',
  },
  {
    id: 'auth-hook',
    primitives: [2, 11],
    when: ({ fileName }) => /\b(auth|authz|acl)\b/i.test(fileName),
    reason: 'auth/authorization file',
  },

  // ─── Session Persistence ──────────────────────────────────────────────
  {
    id: 'checkpoint',
    primitives: [3],
    when: ({ fileName }) =>
      /\b(checkpoint|session-state|session-storage|recovery|snapshot)\b/i.test(fileName),
    reason: 'persistence/recovery file',
  },

  // ─── Workflow State ───────────────────────────────────────────────────
  {
    id: 'state-machine',
    primitives: [4],
    when: ({ fileName }) =>
      /\b(state-machine|phase|workflow|orchestrat)\b/i.test(fileName),
    reason: 'workflow/state machine file',
  },

  // ─── Token Budget ─────────────────────────────────────────────────────
  {
    id: 'budget-file',
    primitives: [5],
    when: ({ fileName }) =>
      /\b(budget|cost|pricing|token-track)\b/i.test(fileName),
    reason: 'token budget / cost tracking file',
  },

  // ─── Streaming Events ─────────────────────────────────────────────────
  {
    id: 'event-publisher',
    primitives: [6],
    when: ({ fileName }) =>
      /\b(event-publisher|ws-emitter|websocket|stream|emitter|publisher)\b/i.test(fileName),
    reason: 'event streaming file',
  },

  // ─── Event Logger ─────────────────────────────────────────────────────
  {
    id: 'logger-file',
    primitives: [7],
    when: ({ fileName }) =>
      /\b(logger|decision-log|audit-log|trace-logger|analytics)\b/i.test(fileName),
    reason: 'system event logger file',
  },

  // ─── Verification Harness ─────────────────────────────────────────────
  {
    id: 'verify-file',
    primitives: [8],
    when: ({ fileName }) =>
      /\b(verify|validate|edd|confidence|validation|guideline-validator)\b/i.test(
        fileName,
      ),
    reason: 'verification/validation file',
  },

  // ─── Tool Pool Assembly ───────────────────────────────────────────────
  {
    id: 'suggester',
    primitives: [9],
    when: ({ fileName }) =>
      /\b(agent-suggester|team-composer|classify-component|pool)\b/i.test(fileName),
    reason: 'tool pool / team composition file',
  },

  // ─── Transcript Compaction ────────────────────────────────────────────
  {
    id: 'compact-hook',
    primitives: [10],
    when: ({ fileName }) =>
      /\b(compact|prune|context-manager|session-parser)\b/i.test(fileName),
    reason: 'compaction / context management file',
  },

  // ─── Doctor ───────────────────────────────────────────────────────────
  {
    id: 'doctor-file',
    primitives: ['12a'],
    when: ({ fileName }) =>
      /\b(diagnostic|doctor|health-check|database-health|validate-structure)\b/i.test(
        fileName,
      ),
    reason: 'diagnostic / doctor file',
  },

  // ─── Staged Boot ──────────────────────────────────────────────────────
  {
    id: 'boot-file',
    primitives: ['12b'],
    when: ({ fileName, dirPath }) =>
      /\b(bootstrap|init|setup|pre-flight)\b/i.test(fileName) ||
      /\/bin\//.test(dirPath),
    reason: 'bootstrap / init file',
  },

  // ─── Stop Reason Taxonomy ─────────────────────────────────────────────
  {
    id: 'stop-reason-by-content',
    primitives: ['12c'],
    when: ({ content }) =>
      /stop_reason|stopReason|halt_reason|exit_reason|completion_reason/.test(content),
    reason: 'file uses stop_reason / halt_reason semantics',
  },

  // ─── Provenance-Aware Memory ──────────────────────────────────────────
  {
    id: 'memory-file',
    primitives: ['12d'],
    when: ({ fileName }) =>
      /\b(reflexion|memory-age|memoryAge|memory-staleness|visual-memory|memdir)\b/i.test(
        fileName,
      ),
    reason: 'memory / provenance file',
  },
  {
    id: 'learn-skill',
    primitives: ['12d'],
    when: ({ dirPath }) => /\/aicodepath-learn\//.test(dirPath),
    reason: 'aicodepath-learn skill defines preference provenance schema',
  },
  {
    id: 'knowledge-skill',
    primitives: ['12d'],
    when: ({ dirPath }) => /\/aicodepath-knowledge\//.test(dirPath),
    reason: 'knowledge skill manages planning/tasks/knowledge markdown provenance',
  },

  // ─── Hook files get logger + event checks by default ──────────────────
  {
    id: 'hook-default',
    primitives: [6, 7],
    when: ({ dirPath, fileName }) =>
      /\/hooks\//.test(dirPath) && fileName.endsWith('.js'),
    reason: 'hook files should emit structured events and log decisions',
  },

  // ─── DB migration files get session persistence check ────────────────
  {
    id: 'migration-file',
    primitives: [3, 7],
    when: ({ dirPath }) => /\/db\/migrations\//.test(dirPath),
    reason: 'DB migrations shape persistent state and audit tables',
  },
];

// ─── Core matcher ─────────────────────────────────────────────────────────

function matchAsset(filePath) {
  const absPath = path.resolve(filePath);
  const fileName = path.basename(absPath);
  const dirPath = path.dirname(absPath);

  let content = '';
  try {
    // Only read first 20KB — enough to match on content signatures without
    // paying I/O cost for giant generated files.
    const fd = fs.openSync(absPath, 'r');
    const buf = Buffer.alloc(20 * 1024);
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    content = buf.slice(0, bytes).toString('utf8');
  } catch {
    // File unreadable or missing — continue with empty content; path-based
    // rules still fire.
  }

  const ctx = { fileName, dirPath, content };
  const matched = [];
  const applicableSet = new Set();

  for (const rule of RULES) {
    let fired;
    try {
      fired = rule.when(ctx);
    } catch {
      fired = false;
    }
    if (fired) {
      matched.push({ ruleId: rule.id, primitives: rule.primitives, reason: rule.reason });
      for (const p of rule.primitives) applicableSet.add(String(p));
    }
  }

  const applicable = Array.from(applicableSet).sort((a, b) => {
    // Numeric sort, with 12a < 12b < 12c < 12d coming after 11
    const na = /^\d+$/.test(a) ? parseInt(a, 10) : 100 + a.charCodeAt(a.length - 1);
    const nb = /^\d+$/.test(b) ? parseInt(b, 10) : 100 + b.charCodeAt(b.length - 1);
    return na - nb;
  });

  return {
    filePath: absPath,
    fileName,
    applicable,
    matched,
    noMatch: matched.length === 0,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: check-asset.js <file-path> [--json]');
    console.log('');
    console.log('Determines which of the 12 primitives apply to a single file.');
    console.log('Used by asset-mode evaluation to skip irrelevant primitives.');
    process.exit(0);
  }

  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Error: file path required');
    process.exit(1);
  }

  const jsonMode = args.includes('--json');
  const result = matchAsset(target);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\n=== Asset Applicability ===`);
  console.log(`File: ${result.filePath}`);
  console.log('');
  if (result.noMatch) {
    console.log('⚠ No primitives applicable — this file does not match any');
    console.log('  applicability rule. Asset-mode evaluation is a no-op.');
    console.log('  If you think this is wrong, add a rule to RULES in check-asset.js.');
    return;
  }
  console.log(`Applicable primitives: ${result.applicable.join(', ')}`);
  console.log('');
  console.log('Matched rules:');
  for (const m of result.matched) {
    console.log(`  [${m.ruleId}] → primitives ${m.primitives.join(', ')}`);
    console.log(`     ${m.reason}`);
  }
  console.log('');
}

if (require.main === module) {
  main();
}

module.exports = { matchAsset, RULES };
