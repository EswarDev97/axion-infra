/**
 * Test: CHANGELOG 2.13.0 entry
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Task:   T34 — prepend [2.13.0] CHANGELOG section
 *
 * Verifies:
 *   1. CHANGELOG.md contains 2.13.0 entry
 *   2. Entry references both epics (Sprint Persistence + Opus 4.7 Alignment)
 *   3. Key deliverables mentioned
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

const ROOT = path.resolve(__dirname, '..', '..');
const CHANGELOG = fs.readFileSync(path.join(ROOT, '.aicodepath', 'docs', 'CHANGELOG.md'), 'utf8');

test('CHANGELOG contains 2.13.0 entry', () => {
  assertTrue(CHANGELOG.includes('2.13.0'), 'Must contain version 2.13.0');
});

test('entry references Epic 1 — Sprint Persistence', () => {
  assertTrue(CHANGELOG.includes('Sprint Persistence'), 'Must reference Sprint Persistence epic');
});

test('entry references Epic 2 — Opus 4.7 Alignment', () => {
  assertTrue(CHANGELOG.includes('Opus 4.7 Alignment'), 'Must reference Opus 4.7 Alignment epic');
});

test('entry mentions migration 023', () => {
  assertTrue(CHANGELOG.includes('migration 023'), 'Must mention migration 023');
});

test('entry mentions ArtifactWriter', () => {
  assertTrue(CHANGELOG.includes('ArtifactWriter'), 'Must mention ArtifactWriter');
});

test('entry mentions sprint-history.js', () => {
  assertTrue(CHANGELOG.includes('sprint-history.js'), 'Must mention sprint-history library');
});

test('entry mentions effortLevel xhigh', () => {
  assertTrue(CHANGELOG.includes('xhigh'), 'Must mention xhigh effort level');
});

test('entry mentions EFFORT_LEVELS 5 tiers', () => {
  assertTrue(CHANGELOG.includes('5 tiers'), 'Must mention 5-tier effort levels');
});

test('entry mentions TodoWrite→TaskCreate migration', () => {
  assertTrue(CHANGELOG.includes('TodoWrite') && CHANGELOG.includes('TaskCreate'),
    'Must mention TodoWrite→TaskCreate migration');
});

test('entry mentions --native flag', () => {
  assertTrue(CHANGELOG.includes('--native'), 'Must mention --native review flag');
});

test('entry mentions ENABLE_PROMPT_CACHING_1H', () => {
  assertTrue(CHANGELOG.includes('ENABLE_PROMPT_CACHING_1H'), 'Must mention prompt caching env var');
});

test('entry mentions token benchmark', () => {
  assertTrue(CHANGELOG.includes('benchmark') || CHANGELOG.includes('σ='),
    'Must mention token benchmark results');
});

test('2.13.0 entry appears before 2.12.3', () => {
  const idx213 = CHANGELOG.indexOf('2.13.0');
  const idx2123 = CHANGELOG.indexOf('2.12.3');
  assertTrue(idx213 < idx2123, '2.13.0 must appear before 2.12.3 (prepended)');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
