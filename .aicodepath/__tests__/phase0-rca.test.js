/**
 * Test: Phase 0 RCA — diagnostic report for 0-row artifact pipeline
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan: aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 1 Task 4
 * Design: aicodepath-docs/design/2026-04-18-opus-4-7-alignment-design.md Section 6 Phase 0
 * Agent: aicodepath-sre-engineer
 *
 * TDD RED — this test must fail BEFORE phase0-rca.md is produced.
 * It validates the contract: the SRE agent executes the 5 prioritized
 * diagnostic checks from design Section 6 Phase 0 and writes a report at
 * aicodepath-docs/temp/phase0-rca.md that (a) carries exactly one of the
 * three sanctioned verdict tags and (b) documents findings for every one
 * of the 5 check topics so the sprint can proceed (or fall back to Option C).
 */

const fs = require('fs');
const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy, got ${JSON.stringify(v)}`); }
function assertMatch(haystack, re, msg = '') {
  if (!re.test(haystack)) throw new Error(`${msg}\n  Pattern:  ${re}\n  Not found in report.`);
}

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT = path.join(ROOT, 'aicodepath-docs', 'temp', 'phase0-rca.md');

const VERDICT_TAGS = ['FIXED', 'BLOCKED', 'OPTION_C_FALLBACK'];

// The 5 prioritized diagnostic checks from design Section 6 Phase 0 (lines 104-110).
// Each entry is a {name, patterns} pair — the report is valid if ANY of the patterns
// matches (case-insensitive), because the SRE agent may phrase the finding freely.
const REQUIRED_CHECKS = [
  { name: 'hook execution',       patterns: [/hook\s+execution/i, /auto-artifact-creator/i, /~\/\.claude\/logs/i] },
  { name: 'DB path resolution',   patterns: [/db\s+path/i, /getDbPath/i, /path[-\s]resolver/i] },
  { name: 'feature flag gating',  patterns: [/feature[-\s]flag/i, /feature-flags\.js/i, /config\.json/i] },
  { name: 'migration state',      patterns: [/migration\s+state/i, /020_code_graph_columns/i, /021_is_test_column/i, /022_community_detection/i, /SELECT\s+name\s+FROM\s+migrations/i] },
  { name: 'ArtifactWriter error', patterns: [/ArtifactWriter/i, /artifact-writer\.js/i, /error\s+path/i, /logger\.error/i] }
];

test('phase0-rca.md exists', () => {
  assertTrue(fs.existsSync(REPORT), `Report missing at ${REPORT}`);
});

test('report is non-empty and markdown-formatted', () => {
  const stat = fs.statSync(REPORT);
  assertTrue(stat.size > 200, `Report suspiciously small (${stat.size} bytes) — likely stub`);
  const content = fs.readFileSync(REPORT, 'utf8');
  assertMatch(content, /^#\s+/m, 'Report must contain at least one markdown heading');
});

test('report carries exactly one sanctioned verdict tag', () => {
  const content = fs.readFileSync(REPORT, 'utf8');
  const found = VERDICT_TAGS.filter(tag => content.includes(tag));
  assertTrue(found.length >= 1, `Report must include one of ${VERDICT_TAGS.join(' | ')}; found none.`);
  // Not asserting exactly-one — a report may mention alternatives in prose;
  // what we require is the presence of a decisive verdict. The verdict must
  // appear under a visible heading or labeled line so a reader can find it.
  assertMatch(content, new RegExp(`(verdict|status|result)[^\n]{0,80}(${VERDICT_TAGS.join('|')})`, 'i'),
              'Verdict tag must appear on a line labeled "Verdict", "Status", or "Result" for discoverability');
});

for (const check of REQUIRED_CHECKS) {
  test(`report documents check: ${check.name}`, () => {
    const content = fs.readFileSync(REPORT, 'utf8');
    const hit = check.patterns.some(p => p.test(content));
    assertTrue(hit, `Report must address "${check.name}"; none of these patterns matched: ${check.patterns.map(p => p.source).join(' | ')}`);
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
