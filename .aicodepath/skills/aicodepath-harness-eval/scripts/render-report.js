#!/usr/bin/env node
/**
 * render-report.js
 *
 * Render a harness-eval verdict structure into the markdown report format
 * specified in references/eval-rubric.md.
 *
 * Usage:
 *   node render-report.js <verdict-json-file>        → print to stdout
 *   node render-report.js <verdict-json-file> -o <out-path>
 *   node render-report.js --verdict-stdin            → read JSON from stdin
 *   node render-report.js --pin-baseline <verdict>   → re-pin golden fixture from verdict
 *
 * Verdict JSON schema (produced by SKILL body after reading check-primitives
 * output and applying the rubric):
 *
 *   {
 *     "target": "<absolute path>",
 *     "mode": "full" | "primitive" | "asset" | "external",
 *     "scopeDetail": "<primitive id or asset path if applicable>",
 *     "timestamp": "2026-04-08T12:34:56Z",
 *     "rubricVersion": "1.0.0",  // optional — if absent, assumed = fixture rubric
 *     "summary": {
 *       "strong": 10, "partial": 2, "missing": 0, "total": 12
 *     },
 *     "verdicts": [
 *       {
 *         "id": 1 | "12a" | ...,
 *         "name": "Tool Registry Metadata-First",
 *         "tier": "Day One" | "Week One (compound)",
 *         "verdict": "PASS" | "PARTIAL" | "MISSING" | "EXCEEDS" | "N/A",
 *         "ccAnchor": "src/Tool.ts; ...",
 *         "evidence": [ { "kind": "file", "path": "..." }, ... ],
 *         "note": "Optional reasoning for the verdict"
 *       }
 *     ],
 *     "gaps": [
 *       { "tier": 1|2|3, "primitiveId": 11, "description": "...", "sketch": "..." }
 *     ]
 *   }
 *
 * Drift analysis replaces the old hardcoded smoke-test footer. Baselines now
 * live in references/golden-verdicts/<target>.json as reviewable fixtures.
 * See the SOTA architecture design notes in SKILL.md Step E7 for the 4-case
 * decision table.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Emoji / label helpers ────────────────────────────────────────────────

const VERDICT_LABEL = {
  PASS: '✅ PASS',
  EXCEEDS: '✨ EXCEEDS',
  PARTIAL: '🟡 PARTIAL',
  MISSING: '❌ MISSING',
  'N/A': '— N/A',
};

function verdictLabel(v) {
  return VERDICT_LABEL[v] || v;
}

// ─── Markdown section builders ────────────────────────────────────────────

function renderHeader(verdict) {
  const { target, mode, scopeDetail, timestamp, summary } = verdict;
  const targetName = path.basename(target);
  const lines = [];
  lines.push(`# Harness Eval Report — ${targetName}`);
  lines.push('');
  lines.push(`**Target**: \`${target}\``);
  lines.push(`**Mode**: ${mode}${scopeDetail ? ` (${scopeDetail})` : ''}`);
  lines.push(`**Generated**: ${timestamp}`);
  lines.push('');

  if (summary) {
    const { strong = 0, partial = 0, missing = 0, total = 12 } = summary;
    lines.push(
      `## Executive Summary — **${strong} STRONG / ${partial} PARTIAL / ${missing} MISSING** of ${total}`,
    );
    lines.push('');
    if (missing > 0) {
      lines.push(
        `> ⚠ ${missing} primitive${missing > 1 ? 's are' : ' is'} missing. See Tier 1 in the Remediation Backlog.`,
      );
    } else if (partial > 0) {
      lines.push(
        `> 🟡 ${partial} primitive${partial > 1 ? 's are' : ' is'} partially implemented. See Tier 2.`,
      );
    } else {
      lines.push(`> ✅ All primitives meet or exceed the bar.`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderVerdictTable(verdicts) {
  const lines = [];
  lines.push('## Verdict Table');
  lines.push('');
  lines.push('| # | Primitive | Tier | Verdict | CC Reference | Evidence |');
  lines.push('|---|---|---|---|---|---|');
  for (const v of verdicts) {
    const evCount = v.evidence ? v.evidence.length : 0;
    const evFirst =
      v.evidence && v.evidence.length > 0
        ? `${evCount} item${evCount > 1 ? 's' : ''} — first: \`${formatEvidence(v.evidence[0])}\``
        : '_(none)_';
    lines.push(
      `| ${v.id} | ${v.name} | ${v.tier} | ${verdictLabel(v.verdict)} | \`${v.ccAnchor}\` | ${evFirst} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function formatEvidence(ev) {
  if (!ev) return '';
  if (ev.kind === 'file') return ev.path + (ev.note ? ` (${ev.note})` : '');
  if (ev.kind === 'grep') return `${ev.file}:${ev.line}`;
  if (ev.kind === 'count') return `${ev.label}=${ev.value}`;
  return JSON.stringify(ev);
}

function renderEvidenceDetail(verdicts) {
  const lines = [];
  lines.push('## Evidence Detail');
  lines.push('');
  for (const v of verdicts) {
    lines.push(`### [${v.id}] ${v.name} — ${verdictLabel(v.verdict)}`);
    lines.push('');
    lines.push(`**CC reference**: \`${v.ccAnchor}\``);
    lines.push('');
    if (v.note) {
      lines.push(`**Verdict reasoning**: ${v.note}`);
      lines.push('');
    }
    if (v.evidence && v.evidence.length > 0) {
      lines.push('**Evidence**:');
      lines.push('');
      for (const ev of v.evidence.slice(0, 20)) {
        if (ev.kind === 'file') {
          lines.push(`- 📄 \`${ev.path}\`${ev.note ? ` — ${ev.note}` : ''}`);
        } else if (ev.kind === 'grep') {
          lines.push(
            `- 🔍 \`${ev.file}:${ev.line}\` [${ev.pattern || 'grep'}] — \`${ev.text}\``,
          );
        } else if (ev.kind === 'count') {
          lines.push(`- 🔢 ${ev.label}: ${ev.value}`);
        }
      }
      if (v.evidence.length > 20) {
        lines.push(`- _... and ${v.evidence.length - 20} more items_`);
      }
      lines.push('');
    } else {
      lines.push('_No evidence collected._');
      lines.push('');
    }
  }
  return lines.join('\n');
}

function renderGaps(gaps) {
  if (!gaps || gaps.length === 0) return '';
  const lines = [];
  lines.push('## Remediation Backlog');
  lines.push('');
  lines.push(
    'Ranked by (blast radius × how close the target already is × how much the host owns it).',
  );
  lines.push('');

  const byTier = { 1: [], 2: [], 3: [] };
  for (const g of gaps) {
    if (byTier[g.tier]) byTier[g.tier].push(g);
  }

  const tierLabels = {
    1: '### Tier 1 — Missing entirely (highest leverage)',
    2: '### Tier 2 — Weak version exists, needs strengthening',
    3: '### Tier 3 — Adequate by delegation; document it',
  };

  for (const tier of [1, 2, 3]) {
    if (byTier[tier].length === 0) continue;
    lines.push(tierLabels[tier]);
    lines.push('');
    for (const g of byTier[tier]) {
      lines.push(`- **Primitive #${g.primitiveId}**: ${g.description}`);
      if (g.sketch) {
        lines.push(`  - _Sketch_: ${g.sketch}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ─── Golden fixture + drift analysis ──────────────────────────────────────

/**
 * Load the golden verdict fixture for a given target name.
 * Returns parsed JSON if present, null if missing or malformed.
 * Never throws — fail-safe for targets that have not been pinned yet.
 *
 * @param {string} targetName - basename of the target (e.g., "aicodepath-tool")
 * @returns {Object|null} fixture object or null
 */
function loadGoldenFixture(targetName) {
  const override = process.env.AICODEPATH_HARNESS_FIXTURE;
  const fixturePath = override
    ? override
    : path.join(__dirname, '..', 'references', 'golden-verdicts', `${targetName}.json`);
  try {
    if (!fs.existsSync(fixturePath)) return null;
    const raw = fs.readFileSync(fixturePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[render-report] Could not load fixture at ${fixturePath}: ${err.message}`);
    return null;
  }
}

/**
 * Compute a codebase signature (git SHA + branch + aicodepath version) for
 * a target directory. Used to detect whether the target has changed since
 * the fixture was pinned. Fails safe — returns nulls on any error.
 *
 * @param {string} targetPath - absolute path to the target directory
 * @returns {{gitSha: string|null, gitBranch: string|null, aicodepathVersion: string|null, observedAt: string}}
 */
function computeCodebaseSignature(targetPath) {
  const observedAt = new Date().toISOString();
  let gitSha = null;
  let gitBranch = null;
  let aicodepathVersion = null;

  try {
    gitSha = execSync(`git -C "${targetPath}" rev-parse HEAD 2>/dev/null`, {
      encoding: 'utf8',
    }).trim();
  } catch {
    gitSha = null;
  }
  try {
    gitBranch = execSync(`git -C "${targetPath}" rev-parse --abbrev-ref HEAD 2>/dev/null`, {
      encoding: 'utf8',
    }).trim();
  } catch {
    gitBranch = null;
  }
  // Try reading version from CLAUDE.md (matches v2.x.y pattern in version history)
  try {
    const claudeMd = fs.readFileSync(path.join(targetPath, 'CLAUDE.md'), 'utf8');
    const versionMatch = claudeMd.match(/\*\*([\d]+\.[\d]+\.[\d]+)\*\*/);
    if (versionMatch) aicodepathVersion = versionMatch[1];
  } catch {
    aicodepathVersion = null;
  }

  return { gitSha, gitBranch, aicodepathVersion, observedAt };
}

/**
 * Check a verdict against the fixture's invariants. Invariants are stricter
 * than the numeric baseline — they catch regressions that count-only checks
 * miss (e.g., primitive 11 silently dropping from EXCEEDS to PASS).
 *
 * Supported assertion kinds:
 *   - verdict-equals: { primitiveId, expected } — specific primitive must equal expected verdict
 *   - count-equals: { bucket, expected } — summary[bucket] must equal expected (bucket ∈ strong/partial/missing/total)
 *   - no-missing-in-range: { primitiveIds } — none of listed primitives may verdict MISSING
 *
 * Unknown assertion kinds fail safe — reported as failed with an explanatory
 * message rather than silently passing.
 *
 * @param {Object} verdict - the current verdict JSON
 * @param {Object} fixture - the loaded golden fixture
 * @returns {{passed: Array, failed: Array}} invariant check results
 */
function checkInvariants(verdict, fixture) {
  const passed = [];
  const failed = [];
  const invariants = fixture && fixture.invariants ? fixture.invariants : [];

  for (const inv of invariants) {
    const { id, description, assertion, failureMessage } = inv;
    let ok = false;
    let detail = '';

    try {
      if (!assertion || !assertion.kind) {
        ok = false;
        detail = 'Invariant has no assertion.kind — malformed fixture entry';
      } else if (assertion.kind === 'verdict-equals') {
        const v = (verdict.verdicts || []).find(
          (x) => String(x.id) === String(assertion.primitiveId),
        );
        if (!v) {
          ok = false;
          detail = `primitive ${assertion.primitiveId} not found in verdict`;
        } else {
          ok = v.verdict === assertion.expected;
          detail = ok
            ? `${assertion.primitiveId} = ${v.verdict}`
            : `${assertion.primitiveId} = ${v.verdict} (expected ${assertion.expected})`;
        }
      } else if (assertion.kind === 'count-equals') {
        const actual = verdict.summary ? verdict.summary[assertion.bucket] : undefined;
        ok = actual === assertion.expected;
        detail = ok
          ? `${assertion.bucket} = ${actual}`
          : `${assertion.bucket} = ${actual} (expected ${assertion.expected})`;
      } else if (assertion.kind === 'no-missing-in-range') {
        const ids = assertion.primitiveIds || [];
        const offenders = ids.filter((pid) => {
          const v = (verdict.verdicts || []).find((x) => String(x.id) === String(pid));
          return v && v.verdict === 'MISSING';
        });
        ok = offenders.length === 0;
        detail = ok
          ? `no MISSING in [${ids.join(', ')}]`
          : `MISSING in: [${offenders.join(', ')}]`;
      } else {
        ok = false;
        detail = `Unknown assertion kind: ${assertion.kind}`;
      }
    } catch (err) {
      ok = false;
      detail = `assertion threw: ${err.message}`;
    }

    if (ok) {
      passed.push({ id, description, detail });
    } else {
      failed.push({ id, description, detail, failureMessage });
    }
  }

  return { passed, failed };
}

/**
 * Read the current rubric version from the eval-rubric.md frontmatter on disk.
 * This is the single source of truth for what rubric is currently active —
 * the verdict JSON may or may not carry its own rubricVersion, but the file
 * always has the authoritative value.
 *
 * @returns {string|null} rubric version string or null if unreadable
 */
function readCurrentRubricVersion() {
  try {
    const rubricPath = path.join(__dirname, '..', 'references', 'eval-rubric.md');
    const content = fs.readFileSync(rubricPath, 'utf8');
    const match = content.match(/^rubricVersion:\s*([\d.]+)/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Classify the drift between the current verdict and the pinned fixture
 * into one of four cases. The classification drives the recommended action
 * in the report — see renderDriftAnalysis for the narrative per case.
 *
 * Cases:
 *   - "clean" — rubric version, gitSha, and all verdicts match
 *   - "rubric-evolved" — rubric version differs (legitimate policy change)
 *   - "codebase-changed" — gitSha differs but rubric version matches
 *   - "check-script-regression" — both match but verdicts differ (bug)
 *
 * Also computes per-primitive diff (list of {id, pinned, current} for
 * primitives that differ).
 *
 * @param {Object} verdict - current verdict JSON
 * @param {Object} fixture - loaded golden fixture
 * @returns {{driftCase: string, perPrimitiveDiff: Array, pinnedSha: string, observedSig: Object}}
 */
function computeDriftCase(verdict, fixture) {
  const observedSig = computeCodebaseSignature(verdict.target);
  const pinnedSha = fixture.codebaseSignature ? fixture.codebaseSignature.gitSha : null;
  const pinnedRubric = fixture.rubricVersion;
  // Read current rubric version from disk — single source of truth.
  // verdict.rubricVersion is a secondary signal that can override if present,
  // but the disk value is authoritative when available.
  const diskRubric = readCurrentRubricVersion();
  const currentRubric = verdict.rubricVersion || diskRubric || pinnedRubric;

  const perPrimitiveDiff = [];
  const expected = fixture.expectedVerdicts || {};
  const allIds = new Set([
    ...Object.keys(expected),
    ...(verdict.verdicts || []).map((v) => String(v.id)),
  ]);
  for (const id of allIds) {
    const pinnedEntry = expected[id];
    const currentEntry = (verdict.verdicts || []).find((v) => String(v.id) === id);
    const pinnedVerdict = pinnedEntry ? pinnedEntry.verdict : '(missing from fixture)';
    const currentVerdict = currentEntry ? currentEntry.verdict : '(missing from current run)';
    if (pinnedVerdict !== currentVerdict) {
      perPrimitiveDiff.push({ id, pinned: pinnedVerdict, current: currentVerdict });
    }
  }

  let driftCase;
  if (currentRubric !== pinnedRubric) {
    driftCase = 'rubric-evolved';
  } else if (pinnedSha && observedSig.gitSha && pinnedSha !== observedSig.gitSha) {
    driftCase = 'codebase-changed';
  } else if (perPrimitiveDiff.length > 0) {
    driftCase = 'check-script-regression';
  } else {
    driftCase = 'clean';
  }

  return { driftCase, perPrimitiveDiff, pinnedSha, observedSig, pinnedRubric, currentRubric };
}

/**
 * Render the Drift Analysis section of the report. Replaces the old
 * renderSmokeTestFooter. Handles 4 drift cases + unpinned (missing fixture).
 *
 * @param {Object} verdict - current verdict JSON
 * @param {Object|null} fixture - loaded golden fixture or null if absent
 * @returns {string} markdown section
 */
function renderDriftAnalysis(verdict, fixture) {
  const lines = [];
  lines.push('---');
  lines.push('');

  if (!fixture) {
    const targetName = path.basename(verdict.target || 'unknown');
    lines.push('## Drift Analysis — Unpinned');
    lines.push('');
    lines.push(
      `No golden fixture found for target \`${targetName}\`. Without a pinned baseline, drift detection cannot run.`,
    );
    lines.push('');
    lines.push(
      `To pin the current verdict as the baseline for future runs:`,
    );
    lines.push('');
    lines.push('```');
    lines.push(`node scripts/render-report.js --pin-baseline <verdict.json>`);
    lines.push('```');
    lines.push('');
    lines.push(
      `This writes a new fixture to \`references/golden-verdicts/${targetName}.json\`. ` +
        `All subsequent runs against this target will detect drift relative to that pinned state.`,
    );
    lines.push('');
    return lines.join('\n');
  }

  const { driftCase, perPrimitiveDiff, pinnedSha, observedSig, pinnedRubric, currentRubric } =
    computeDriftCase(verdict, fixture);

  const caseHeaders = {
    clean: '## Drift Analysis — ✅ Clean',
    'rubric-evolved': '## Drift Analysis — 📐 Rubric Evolved',
    'codebase-changed': '## Drift Analysis — 🔄 Codebase Changed',
    'check-script-regression': '## Drift Analysis — ⚠ Check Script Regression',
  };
  lines.push(caseHeaders[driftCase] || '## Drift Analysis');
  lines.push('');

  // Metadata table
  lines.push(
    `**Fixture**: v${fixture.fixtureVersion || '?'} pinned at ${
      (fixture.codebaseSignature && fixture.codebaseSignature.pinnedAt) || '?'
    }`,
  );
  const shaMatch = pinnedSha && observedSig.gitSha && pinnedSha === observedSig.gitSha;
  lines.push(
    `**Pinned gitSha**: \`${pinnedSha || '(unknown)'}\` vs observed: \`${
      observedSig.gitSha || '(not a git repo)'
    }\` — ${shaMatch ? '✅ match' : '❌ differ'}`,
  );
  const rubricMatch = pinnedRubric === currentRubric;
  lines.push(
    `**Pinned rubricVersion**: \`${pinnedRubric || '?'}\` vs current: \`${
      currentRubric || '?'
    }\` — ${rubricMatch ? '✅ match' : '❌ differ'}`,
  );
  lines.push('');

  // Case-specific narrative
  const caseNarratives = {
    clean:
      'Baseline confirmed. Rubric, codebase, and verdicts all match the pinned fixture. No action needed.',
    'rubric-evolved':
      'The rubric has been updated since the last pin. Review the rubric changelog in `references/eval-rubric.md` frontmatter. ' +
      'If the new verdict is correct under the new rubric, re-pin via `node scripts/render-report.js --pin-baseline <verdict.json>`.',
    'codebase-changed':
      'The target codebase has changed since the last pin. Review the per-primitive diff below — progress (PARTIAL → PASS) is good news; ' +
      'regression (PASS → PARTIAL, or anything → MISSING) needs investigation. Re-pin only after reviewing the diff.',
    'check-script-regression':
      '⚠ Rubric and codebase signatures are unchanged, but verdicts differ from the pinned fixture. ' +
      'This indicates a bug in `check-primitives.js` or the rubric application logic. ' +
      'Investigate the drift source BEFORE re-pinning — do not silently accept the new numbers.',
  };
  lines.push(`> ${caseNarratives[driftCase] || ''}`);
  lines.push('');

  // Per-primitive diff
  lines.push('### Per-primitive diff');
  lines.push('');
  if (perPrimitiveDiff.length === 0) {
    lines.push('_All primitives match the pinned fixture._');
  } else {
    lines.push('| # | Pinned | Current | Change |');
    lines.push('|---|---|---|---|');
    for (const d of perPrimitiveDiff) {
      lines.push(`| ${d.id} | ${d.pinned} | ${d.current} | ${d.pinned} → ${d.current} |`);
    }
  }
  lines.push('');

  // Invariant check
  lines.push('### Invariant Check');
  lines.push('');
  const { passed, failed } = checkInvariants(verdict, fixture);
  const total = passed.length + failed.length;
  lines.push(`**${passed.length}/${total} invariants passed**`);
  lines.push('');
  for (const p of passed) {
    lines.push(`- ✅ \`${p.id}\`: ${p.detail}`);
  }
  for (const f of failed) {
    lines.push(`- ❌ \`${f.id}\`: ${f.detail}`);
    if (f.failureMessage) {
      lines.push(`  - ${f.failureMessage}`);
    }
  }
  lines.push('');

  // Recommended action
  lines.push('### Recommended Action');
  lines.push('');
  const caseActions = {
    clean: 'No action needed. Baseline confirmed.',
    'rubric-evolved':
      '1. Review the rubric changes in `references/eval-rubric.md` frontmatter (lastBarChange field). ' +
      '2. If the rubric change is intentional and the new verdicts are correct, re-pin: ' +
      '`node scripts/render-report.js --pin-baseline <verdict.json>`. ' +
      '3. Document the re-pin reason in `aicodepath-docs/harness-eval/CHANGELOG.md`.',
    'codebase-changed':
      '1. Review the per-primitive diff above. 2. Investigate any regressions (especially PASS → PARTIAL/MISSING). ' +
      '3. If the changes reflect legitimate codebase evolution, re-pin the baseline. ' +
      '4. If any invariant failed, DO NOT re-pin until the invariant failure is understood.',
    'check-script-regression':
      '1. Do NOT re-pin. 2. Investigate `check-primitives.js` — a regex may have become stale or a new check may be missing. ' +
      '3. Investigate the rubric application logic in your scoring workflow. ' +
      '4. Only re-pin after the drift source is identified and fixed.',
  };
  lines.push(caseActions[driftCase] || '');
  lines.push('');

  return lines.join('\n');
}

// ─── --pin-baseline CLI handler ───────────────────────────────────────────

/**
 * Re-pin a golden fixture from a verdict JSON. Preserves existing invariants
 * and rationales where possible. Writes atomically via temp file + rename.
 * Prints a diff of what changed so the user can review the re-pin.
 *
 * @param {string} verdictJsonPath - path to the verdict JSON to pin
 * @returns {string} path to the written fixture
 */
function handlePinBaseline(verdictJsonPath) {
  if (!verdictJsonPath || !fs.existsSync(verdictJsonPath)) {
    console.error(`Error: verdict JSON not found at ${verdictJsonPath}`);
    process.exit(1);
  }

  const verdict = JSON.parse(fs.readFileSync(verdictJsonPath, 'utf8'));
  const targetName = path.basename(verdict.target || 'unknown');
  const outputPath = path.join(
    __dirname,
    '..',
    'references',
    'golden-verdicts',
    `${targetName}.json`,
  );

  // Load existing fixture if present — preserves invariants and any custom metadata
  let existing = null;
  if (fs.existsSync(outputPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch {
      console.warn('Existing fixture malformed — proceeding with fresh fixture');
    }
  }

  const codebaseSignature = computeCodebaseSignature(verdict.target);

  // Build expectedVerdicts from the current verdict JSON, using the verdict.note
  // as the rationale (the SKILL body fills this during eval)
  const expectedVerdicts = {};
  for (const v of verdict.verdicts || []) {
    expectedVerdicts[String(v.id)] = {
      verdict: v.verdict,
      rationale: v.note || (existing && existing.expectedVerdicts && existing.expectedVerdicts[String(v.id)] && existing.expectedVerdicts[String(v.id)].rationale) || '',
    };
  }

  // Preserve existing invariants if present, else install the 4 standard ones
  const defaultInvariants = [
    {
      id: 'inv-11-exceeds',
      description:
        'Primitive 11 (Permission Audit Trail) must remain EXCEEDS — persistent SQL audit ledger is the canonical proof the framework exceeds Claude Code.',
      assertion: { kind: 'verdict-equals', primitiveId: '11', expected: 'EXCEEDS' },
      failureMessage:
        'Primitive #11 dropped below EXCEEDS. Investigate why the persistent ledger was removed or weakened.',
    },
    {
      id: 'inv-no-missing',
      description:
        'No primitive should ever verdict MISSING. Baseline pinned with zero MISSING; any regression to MISSING is catastrophic.',
      assertion: { kind: 'count-equals', bucket: 'missing', expected: 0 },
      failureMessage:
        'At least one primitive verdicted MISSING. Every MISSING must be investigated before the baseline is re-pinned.',
    },
    {
      id: 'inv-day-one-all-passing',
      description:
        'Day One primitives (1-8) are the non-negotiable minimum. Any regression to MISSING in this range is catastrophic.',
      assertion: {
        kind: 'no-missing-in-range',
        primitiveIds: ['1', '2', '3', '4', '5', '6', '7', '8'],
      },
      failureMessage: 'A Day One primitive (1-8) verdicted MISSING. Do not re-pin until fixed.',
    },
    {
      id: 'inv-total-is-12',
      description:
        'The rubric covers exactly 12 primitives. A different total means the rubric changed or checks are dropping primitives.',
      assertion: { kind: 'count-equals', bucket: 'total', expected: 12 },
      failureMessage:
        'Total primitive count != 12. Investigate check-primitives.js CHECKS array or the rubric file.',
    },
  ];
  const invariants = (existing && existing.invariants) || defaultInvariants;

  const fixture = {
    $schema: 'golden-verdict-fixture-v1',
    fixtureVersion: existing ? bumpFixtureVersion(existing.fixtureVersion) : '1.0.0',
    rubricVersion: verdict.rubricVersion || (existing && existing.rubricVersion) || '1.0.0',
    target: targetName,
    codebaseSignature: {
      ...codebaseSignature,
      pinnedAt: new Date().toISOString(),
    },
    pinnedBy: `Re-pinned via --pin-baseline from ${path.resolve(verdictJsonPath)}`,
    expectedSummary: verdict.summary || { strong: 0, partial: 0, missing: 0, total: 12 },
    expectedVerdicts,
    invariants,
  };

  // Diff for user visibility
  if (existing) {
    console.log('\n=== Re-pin diff ===\n');
    console.log(`Fixture version: ${existing.fixtureVersion} → ${fixture.fixtureVersion}`);
    console.log(
      `Pinned gitSha:   ${
        existing.codebaseSignature ? existing.codebaseSignature.gitSha : '(none)'
      } → ${fixture.codebaseSignature.gitSha || '(unknown)'}`,
    );
    const oldSummary = existing.expectedSummary || {};
    const newSummary = fixture.expectedSummary || {};
    console.log(
      `Summary:         ${oldSummary.strong}/${oldSummary.partial}/${oldSummary.missing} → ${newSummary.strong}/${newSummary.partial}/${newSummary.missing} (STRONG/PARTIAL/MISSING)`,
    );
    // Per-primitive changes
    const oldEv = existing.expectedVerdicts || {};
    const newEv = fixture.expectedVerdicts || {};
    const allIds = new Set([...Object.keys(oldEv), ...Object.keys(newEv)]);
    const changes = [];
    for (const id of allIds) {
      const o = oldEv[id] ? oldEv[id].verdict : '(new)';
      const n = newEv[id] ? newEv[id].verdict : '(removed)';
      if (o !== n) changes.push(`  ${id}: ${o} → ${n}`);
    }
    if (changes.length > 0) {
      console.log('Verdict changes:');
      changes.forEach((c) => console.log(c));
    } else {
      console.log('Verdict changes: none');
    }
    console.log('');
  } else {
    console.log(`\n=== Creating new fixture ${targetName}.json ===\n`);
  }

  // Atomic write
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${outputPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(fixture, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPath, outputPath);

  console.log(`Fixture written: ${outputPath}`);
  return outputPath;
}

/**
 * Bump fixture version using a simple PATCH increment strategy for re-pins.
 * The rubric version is bumped manually in eval-rubric.md — this only tracks
 * how many times the fixture has been re-pinned.
 */
function bumpFixtureVersion(version) {
  if (!version || typeof version !== 'string') return '1.0.0';
  const parts = version.split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join('.');
}

// ─── Main ─────────────────────────────────────────────────────────────────

function render(verdict) {
  const targetName = path.basename(verdict.target || 'unknown');
  const fixture = loadGoldenFixture(targetName);
  const parts = [
    renderHeader(verdict),
    renderVerdictTable(verdict.verdicts || []),
    renderEvidenceDetail(verdict.verdicts || []),
    renderGaps(verdict.gaps),
    renderDriftAnalysis(verdict, fixture),
  ];
  return parts.filter(Boolean).join('\n');
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: render-report.js <verdict.json> [-o <out.md>]');
    console.log('       render-report.js --verdict-stdin [-o <out.md>]');
    console.log('       render-report.js --pin-baseline <verdict.json>');
    console.log('');
    console.log('Modes:');
    console.log('  Default           Render a verdict JSON to markdown with drift analysis.');
    console.log('  --verdict-stdin   Read verdict JSON from stdin instead of a file.');
    console.log('  --pin-baseline    Re-pin the golden fixture from the given verdict JSON.');
    console.log('                    Preserves invariants and rationales from the existing');
    console.log('                    fixture if present. Prints a diff of what changed.');
    console.log('');
    console.log('Environment:');
    console.log(
      '  AICODEPATH_HARNESS_FIXTURE  Override fixture path (used for testing the drift logic).',
    );
    process.exit(0);
  }

  // --pin-baseline mode
  if (args.includes('--pin-baseline')) {
    const idx = args.indexOf('--pin-baseline');
    const verdictPath = args[idx + 1];
    if (!verdictPath) {
      console.error('Error: --pin-baseline requires a verdict JSON path');
      process.exit(1);
    }
    handlePinBaseline(verdictPath);
    process.exit(0);
  }

  // Default render mode
  let verdict;
  if (args.includes('--verdict-stdin')) {
    const raw = fs.readFileSync(0, 'utf8');
    verdict = JSON.parse(raw);
  } else {
    const inputPath = args.find((a) => !a.startsWith('--') && !a.startsWith('-o'));
    if (!inputPath) {
      console.error('Error: verdict JSON file required');
      process.exit(1);
    }
    verdict = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  }

  const outIdx = args.indexOf('-o');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const md = render(verdict);

  if (outPath) {
    const dir = path.dirname(outPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`Report written: ${outPath}`);
  } else {
    process.stdout.write(md);
    process.stdout.write('\n');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  render,
  loadGoldenFixture,
  computeCodebaseSignature,
  checkInvariants,
  computeDriftCase,
  renderDriftAnalysis,
  handlePinBaseline,
};
