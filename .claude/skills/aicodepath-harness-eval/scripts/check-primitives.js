#!/usr/bin/env node
/**
 * check-primitives.js
 *
 * Deterministic filesystem/grep checks for Nate B. Jones' 12 agentic harness
 * primitives. Hybrid design: this script handles the fast, repeatable existence
 * and pattern checks. The SKILL.md body is responsible for the judgment calls
 * (assigning PASS/PARTIAL/EXCEEDS based on the evidence each check collects).
 *
 * Usage:
 *   node check-primitives.js <target-dir>
 *   node check-primitives.js <target-dir> --primitive 11
 *   node check-primitives.js <target-dir> --json
 *
 * Output (default): human-readable section per primitive with collected evidence.
 * Output (--json):  machine-readable structure the SKILL body can reason over.
 *
 * This script never assigns a verdict on its own — it only collects raw
 * evidence. Verdict assignment lives in SKILL.md because PASS vs PARTIAL
 * vs EXCEEDS requires reading context the grep cannot see.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Module-level scan root — set by runChecks() to the resolved target directory.
// Path helpers use this for relativisation so output paths are always relative
// to the scan target, regardless of the shell working directory.
let targetRoot = path.resolve('.');

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Recursively walk a directory, skipping node_modules, .git, and dist-like dirs.
 * Returns an array of absolute file paths. Collects lazily — callers should
 * filter by extension.
 */
function walk(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.aicodepath') continue;
    if (['node_modules', 'dist', 'build', 'coverage', 'out'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Scan files for a regex pattern. Returns an array of {file, line, text} hits.
 * Capped at maxHits to keep output manageable.
 */
function grepFiles(files, pattern, maxHits = 50) {
  const hits = [];
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  for (const file of files) {
    if (hits.length >= maxHits) break;
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        hits.push({
          file: path.relative(targetRoot, file),
          line: i + 1,
          text: lines[i].trim().slice(0, 160),
        });
        if (hits.length >= maxHits) break;
      }
    }
  }
  return hits;
}

/**
 * Check if any file matches a glob-like suffix pattern.
 */
function anyFileMatches(files, patterns) {
  const matched = [];
  for (const file of files) {
    const rel = path.relative(targetRoot, file);
    for (const p of patterns) {
      if (rel.includes(p)) {
        matched.push(rel);
        break;
      }
    }
  }
  return matched;
}

/**
 * Filter files by extension.
 */
function byExt(files, exts) {
  return files.filter((f) => exts.some((e) => f.endsWith(e)));
}

// ─── Primitive check functions ────────────────────────────────────────────

function check01_ToolRegistry(files) {
  const evidence = [];
  const registryFiles = anyFileMatches(files, [
    'agent-registry', 'agent-loader', 'skill-loader', 'loadSkillsDir',
    'bundledSkills', 'bundled-skills', 'tool-registry', 'plugin-loader',
  ]);
  evidence.push(...registryFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts', '.tsx', '.mjs']);
  const frontmatterHits = grepFiles(
    jsFiles,
    /parseFrontmatter|parseYAML|---\s*\nname:/,
    15,
  );
  evidence.push(...frontmatterHits.map((h) => ({ kind: 'grep', ...h, pattern: 'frontmatter parser' })));

  const agentCount = files.filter((f) => /agents\/[^/]+\.md$/.test(f)).length;
  const skillCount = files.filter((f) => /skills\/[^/]+\/SKILL\.md$/.test(f)).length;
  if (agentCount > 0) evidence.push({ kind: 'count', label: 'agent markdown files', value: agentCount });
  if (skillCount > 0) evidence.push({ kind: 'count', label: 'skill SKILL.md files', value: skillCount });

  return {
    id: 1,
    name: 'Tool Registry with Metadata-First Design',
    tier: 'Day One',
    ccAnchor: 'src/Tool.ts; src/skills/loadSkillsDir.ts; src/skills/bundledSkills.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check02_PermissionTiers(files) {
  const evidence = [];
  const permFiles = anyFileMatches(files, [
    'permission', 'permissions/', 'safety-guardrails', 'trust-tier', 'policy',
  ]);
  evidence.push(...permFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts', '.tsx']);
  const tierHits = grepFiles(
    jsFiles,
    /decision.*IN\s*\(\s*['"](allow|deny|ask)/i,
    10,
  );
  evidence.push(...tierHits.map((h) => ({ kind: 'grep', ...h, pattern: 'decision tier CHECK constraint' })));

  const classifierHits = grepFiles(
    anyFileMatches(files, ['permission']).map((p) => path.join(targetRoot, p)),
    /classif|bashClassifier|dangerousPatterns|yoloClassifier/,
    10,
  );
  evidence.push(...classifierHits.map((h) => ({ kind: 'grep', ...h, pattern: 'classifier' })));

  return {
    id: 2,
    name: 'Permission System with Trust Tiers',
    tier: 'Day One',
    ccAnchor: 'src/utils/permissions/ (24 files: PermissionMode.ts, bashClassifier.ts, dangerousPatterns.ts, yoloClassifier.ts, denialTracking.ts)',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check03_SessionPersistence(files) {
  const evidence = [];
  const persistFiles = anyFileMatches(files, [
    'checkpoint-manager', 'session-state', 'session-storage', 'sessionStorage',
    'checkpoint_files', 'fileHistory', 'conversationRecovery', 'recovery',
  ]);
  evidence.push(...persistFiles.map((f) => ({ kind: 'file', path: f })));

  const sqlFiles = byExt(files, ['.sql']);
  const tableHits = grepFiles(
    sqlFiles,
    /CREATE TABLE.*(?:session_history|session_state|checkpoint|rollback|workflow_state)/i,
    10,
  );
  evidence.push(...tableHits.map((h) => ({ kind: 'grep', ...h, pattern: 'persistence table' })));

  return {
    id: 3,
    name: 'Session Persistence That Survives Crashes',
    tier: 'Day One',
    ccAnchor: 'src/bootstrap/state.ts; src/utils/sessionStorage.ts; src/utils/fileHistory.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check04_WorkflowState(files) {
  const evidence = [];
  const stateFiles = anyFileMatches(files, [
    'phase-state-machine', 'state-machine', 'workflow', 'AppState',
  ]);
  evidence.push(...stateFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts', '.tsx']);
  const guardHits = grepFiles(
    jsFiles,
    /isTerminalTaskStatus|isTerminal\w*|idempoten|UNIQUE.*phase.*stage/i,
    10,
  );
  evidence.push(...guardHits.map((h) => ({ kind: 'grep', ...h, pattern: 'terminal guard or idempotency' })));

  return {
    id: 4,
    name: 'Workflow State and Idempotency',
    tier: 'Day One',
    ccAnchor: 'src/state/AppState.tsx; src/Task.ts:isTerminalTaskStatus()',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check05_TokenBudget(files) {
  const evidence = [];
  const budgetFiles = anyFileMatches(files, [
    'pricing-calculator', 'token-budget', 'tokenBudget', 'cost-tracker', 'costHook',
  ]);
  evidence.push(...budgetFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts']);
  const budgetHits = grepFiles(
    jsFiles,
    /checkBudget|predictBudget|BudgetTracker|COMPLETION_THRESHOLD|calculateCost/,
    15,
  );
  evidence.push(...budgetHits.map((h) => ({ kind: 'grep', ...h, pattern: 'budget function' })));

  return {
    id: 5,
    name: 'Token Budget Tracking with Pre-Turn Checks',
    tier: 'Day One',
    ccAnchor: 'src/query/tokenBudget.ts:checkTokenBudget() (COMPLETION_THRESHOLD=0.9, DIMINISHING_THRESHOLD=500)',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check06_StreamingEvents(files) {
  const evidence = [];
  const eventFiles = anyFileMatches(files, [
    'event-publisher', 'ws-emitter', 'websocket-server', 'stream-event',
    'emitter', 'publisher',
  ]);
  evidence.push(...eventFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts', '.tsx']);
  const emitHits = grepFiles(
    jsFiles,
    /emit[A-Z]\w+\(|StreamEvent|publishEvent|broadcast/,
    15,
  );
  evidence.push(...emitHits.map((h) => ({ kind: 'grep', ...h, pattern: 'event emit' })));

  return {
    id: 6,
    name: 'Structured Streaming Events',
    tier: 'Day One',
    ccAnchor: 'src/types/message.ts:StreamEvent; src/query/stopHooks.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check07_EventLogger(files) {
  const evidence = [];
  const loggerFiles = anyFileMatches(files, [
    'logger.js', 'decision-logger', 'agent-trace-logger', 'audit-log', 'analytics',
  ]);
  evidence.push(...loggerFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts']);
  const logHits = grepFiles(
    jsFiles,
    /logger\.(info|debug|warn|error)|logEvent|recordDecision|trace\(/,
    10,
  );
  evidence.push(...logHits.map((h) => ({ kind: 'grep', ...h, pattern: 'structured log call' })));

  return {
    id: 7,
    name: 'System Event Logging',
    tier: 'Day One',
    ccAnchor: 'src/services/analytics/index.ts:logEvent; src/utils/log.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check08_VerificationHarness(files) {
  const evidence = [];
  const verifyFiles = anyFileMatches(files, [
    'verify', 'edd', 'confidence-checker', 'validation',
    'VerifyPlanExecutionTool', 'guideline-validator',
  ]);
  evidence.push(...verifyFiles.map((f) => ({ kind: 'file', path: f })));

  const skillMatches = files.filter((f) => /skills\/[^/]*verify[^/]*\/SKILL\.md$/.test(f));
  evidence.push(...skillMatches.map((f) => ({
    kind: 'file',
    path: path.relative(targetRoot, f),
    note: 'verification skill',
  })));

  return {
    id: 8,
    name: 'Basic Verification Harness',
    tier: 'Day One',
    ccAnchor: 'src/tools/VerifyPlanExecutionTool/; src/utils/hooks/hookHelpers.ts:registerStructuredOutputEnforcement',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check09_ToolPoolAssembly(files) {
  const evidence = [];
  const assemblyFiles = anyFileMatches(files, [
    'agent-suggester', 'team-composer', 'swarm-team-composer', 'classify-component',
    'pluginLoader', 'tool-pool',
  ]);
  evidence.push(...assemblyFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts']);
  const mappingHits = grepFiles(
    jsFiles,
    /DOMAIN_MAPPING|VIOLATION_TYPE_MAPPING|PHASE_DEFAULTS|composeTeam/,
    10,
  );
  evidence.push(...mappingHits.map((h) => ({ kind: 'grep', ...h, pattern: 'assembly mapping' })));

  return {
    id: 9,
    name: 'Tool Pool Assembly',
    tier: 'Week One',
    ccAnchor: 'src/utils/plugins/pluginLoader.ts:loadAllPluginsCacheOnly; src/services/mcp/types.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check10_TranscriptCompaction(files) {
  const evidence = [];
  const compactFiles = anyFileMatches(files, [
    'pre-compact', 'compact', 'context-manager', 'incremental-session-parser',
    'collapseReadSearch',
  ]);
  evidence.push(...compactFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts']);
  const compactHits = grepFiles(
    jsFiles,
    /compact\(|preserveMessages|preserve_messages|SYNTHETIC_MESSAGES|summarize.*middle/,
    10,
  );
  evidence.push(...compactHits.map((h) => ({ kind: 'grep', ...h, pattern: 'compaction logic' })));

  return {
    id: 10,
    name: 'Transcript Compaction',
    tier: 'Week One',
    ccAnchor: 'src/utils/messages.ts:SYNTHETIC_MESSAGES; src/utils/collapseReadSearch.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check11_PermissionAudit(files) {
  const evidence = [];
  const auditFiles = anyFileMatches(files, [
    'permission-manager', 'denialTracking', 'permission-audit', 'permission_audit',
  ]);
  evidence.push(...auditFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts']);
  const tableHits = grepFiles(
    jsFiles,
    /permission_audit|permission_ledger|permission_log|permission_history|DenialTrackingState|auditLog\(/,
    10,
  );
  evidence.push(...tableHits.map((h) => ({ kind: 'grep', ...h, pattern: 'audit artifact' })));

  const actionHits = grepFiles(
    jsFiles,
    /action.*IN\s*\(\s*['"](grant|revoke|use|suggest)/i,
    5,
  );
  evidence.push(...actionHits.map((h) => ({ kind: 'grep', ...h, pattern: 'audit action enum' })));

  return {
    id: 11,
    name: 'Permission Audit Trail',
    tier: 'Week One',
    ccAnchor: 'src/utils/permissions/denialTracking.ts:DenialTrackingState (in-memory: {consecutiveDenials, totalDenials}; thresholds maxConsecutive=3, maxTotal=20)',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check12a_Doctor(files) {
  const evidence = [];
  const doctorFiles = anyFileMatches(files, [
    'diagnostics', 'doctor', 'database-health', 'health-check', 'validate-structure',
  ]);
  evidence.push(...doctorFiles.map((f) => ({ kind: 'file', path: f })));
  return {
    id: '12a',
    name: 'Doctor Pattern',
    tier: 'Week One (compound)',
    ccAnchor: 'src/screens/Doctor.tsx; src/utils/doctorDiagnostic.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check12b_StagedBoot(files) {
  const evidence = [];
  const bootFiles = anyFileMatches(files, [
    'bin/aicodepath', 'bootstrap', 'init.js', 'setup.js', 'pre-flight-check',
  ]);
  evidence.push(...bootFiles.map((f) => ({ kind: 'file', path: f })));
  return {
    id: '12b',
    name: 'Staged Boot',
    tier: 'Week One (compound)',
    ccAnchor: 'src/bootstrap/state.ts; src/main.tsx; src/setup.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check12c_StopReason(files) {
  const evidence = [];
  const jsFiles = byExt(files, ['.js', '.ts']);
  const stopHits = grepFiles(
    jsFiles,
    /stop_reason|stopReason|halt_reason|exit_reason|completion_reason/,
    15,
  );
  evidence.push(...stopHits.map((h) => ({ kind: 'grep', ...h, pattern: 'stop reason field' })));
  return {
    id: '12c',
    name: 'Stop Reason Taxonomy',
    tier: 'Week One (compound)',
    ccAnchor: 'src/query/stopHooks.ts:StopHookInfo; src/types/message.ts:TombstoneMessage (CC uses free-text strings, NOT enum-constrained)',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

function check12d_Provenance(files) {
  const evidence = [];
  const provFiles = anyFileMatches(files, [
    'reflexion-learner', 'memory-age', 'memoryAge', 'memory-staleness',
    'visual-memory-writer', 'memoryTypes',
  ]);
  evidence.push(...provFiles.map((f) => ({ kind: 'file', path: f })));

  const jsFiles = byExt(files, ['.js', '.ts']);
  const provHits = grepFiles(
    jsFiles,
    /confidence.*REAL|source_note|memoryFreshnessText|memoryAgeDays|times_used|times_helped|expires_when/,
    15,
  );
  evidence.push(...provHits.map((h) => ({ kind: 'grep', ...h, pattern: 'provenance field' })));

  const skillFiles = files.filter((f) => f.endsWith('SKILL.md'));
  const learnSkill = skillFiles.find((f) => f.includes('aicodepath-learn'));
  if (learnSkill) {
    evidence.push({
      kind: 'file',
      path: path.relative(targetRoot, learnSkill),
      note: 'learn skill defines structured preference schema with provenance fields',
    });
  }

  return {
    id: '12d',
    name: 'Provenance-Aware Context',
    tier: 'Week One (compound)',
    ccAnchor: 'src/memdir/memoryAge.ts:memoryFreshnessText (fs.statSync mtime → auto-injected <system-reminder>); src/memdir/memoryTypes.ts',
    evidence,
    hasEvidence: evidence.length > 0,
  };
}

// ─── Orchestrator ─────────────────────────────────────────────────────────

const CHECKS = [
  check01_ToolRegistry,
  check02_PermissionTiers,
  check03_SessionPersistence,
  check04_WorkflowState,
  check05_TokenBudget,
  check06_StreamingEvents,
  check07_EventLogger,
  check08_VerificationHarness,
  check09_ToolPoolAssembly,
  check10_TranscriptCompaction,
  check11_PermissionAudit,
  check12a_Doctor,
  check12b_StagedBoot,
  check12c_StopReason,
  check12d_Provenance,
];

function runChecks(targetDir, only = null) {
  const absTarget = path.resolve(targetDir);
  targetRoot = absTarget; // set module-level root for path relativisation
  const files = walk(absTarget);
  const results = [];
  for (const check of CHECKS) {
    const result = check(files);
    if (only && String(result.id) !== String(only)) continue;
    results.push(result);
  }
  return { target: absTarget, fileCount: files.length, results };
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: check-primitives.js <target-dir> [--primitive <id>] [--json]');
    console.log('');
    console.log('Collects evidence for Nate B. Jones\'s 12 agentic harness primitives.');
    console.log('Does NOT assign verdicts — the SKILL body does that after reading evidence.');
    process.exit(0);
  }

  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Error: target directory required');
    process.exit(1);
  }

  const jsonMode = args.includes('--json');
  const primIdx = args.indexOf('--primitive');
  const only = primIdx >= 0 ? args[primIdx + 1] : null;

  const output = runChecks(target, only);

  if (jsonMode) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`\n=== Harness Primitive Evidence Report ===`);
  console.log(`Target: ${output.target}`);
  console.log(`Files scanned: ${output.fileCount}\n`);

  for (const r of output.results) {
    console.log(`\n──────────────────────────────────────`);
    console.log(`[${r.id}] ${r.name}  (${r.tier})`);
    console.log(`CC reference: ${r.ccAnchor}`);
    console.log(`Evidence: ${r.evidence.length} items${r.hasEvidence ? '' : '  ⚠ NONE FOUND'}`);
    for (const e of r.evidence.slice(0, 10)) {
      if (e.kind === 'file') {
        console.log(`  📄 ${e.path}${e.note ? '  (' + e.note + ')' : ''}`);
      } else if (e.kind === 'grep') {
        console.log(`  🔍 ${e.file}:${e.line}  [${e.pattern}]`);
        console.log(`     ${e.text}`);
      } else if (e.kind === 'count') {
        console.log(`  🔢 ${e.label}: ${e.value}`);
      }
    }
    if (r.evidence.length > 10) {
      console.log(`  ... and ${r.evidence.length - 10} more`);
    }
  }
  console.log('');
}

if (require.main === module) {
  main();
}

module.exports = { runChecks, CHECKS, walk };
