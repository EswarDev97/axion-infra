/**
 * Test: calculateEffort redistributed thresholds for 5-tier levels
 *
 * Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18)
 * Plan:   aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 5 Task 20b
 * Agent:  aicodepath-ml-engineer
 *
 * TDD RED — must fail BEFORE calculateEffort is redistributed.
 *
 * Contract:
 *   1. Score 0 → level 'low'
 *   2. Score 1-2 → level 'medium'
 *   3. Score 3-4 → level 'high'
 *   4. Score 5-7 → level 'xhigh'
 *   5. Score 8+ → level 'max'
 *   6. [high-effort] marker yields xhigh or max (not just 'high')
 *   7. buildEffortGuidance mentions xhigh
 */
const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`${colors.green}✓${colors.reset} ${name}`); }
  catch (e) { failed++; console.log(`${colors.red}✗${colors.reset} ${name}\n  ${colors.yellow}${e.message}${colors.reset}`); }
}
function assertEqual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg}\n  Expected: ${JSON.stringify(b)}\n  Got:      ${JSON.stringify(a)}`);
}

const { calculateEffort, buildEffortGuidance } = require('../lib/effort-scorer');

function scoreFor(score, desc = '') {
  return calculateEffort({ files: [], taskDescription: desc || `score ${score}`, hasFailureHistory: false, explicitHigh: false, _overrideScore: score });
}

test('score 0 → level "low"', () => {
  const r = calculateEffort({ files: [], taskDescription: 'simple fix' });
  assertEqual(r.level, 'low');
});

test('score 1 → level "medium"', () => {
  // 4 files = +1, no other factors = score 1
  const r = calculateEffort({ files: ['a.ts', 'b.ts', 'c.ts', 'd.ts'], taskDescription: 'minor change' });
  assertEqual(r.level, 'medium');
});

test('score 3-4 → level "high"', () => {
  // 4 files = +1, critical dir = +1, complexity keyword = +1 = score 3
  const r = calculateEffort({
    files: ['src/auth/login.ts', 'src/auth/session.ts', 'src/auth/middleware.ts', 'src/auth/index.ts'],
    taskDescription: 'refactor authentication flow',
  });
  assertTrue(r.level === 'high', `Expected level "high" for score ${r.score}, got "${r.level}"`);
});

test('score 5-7 → level "xhigh"', () => {
  // 5 files + critical dir + complexity keyword + failure history = 5
  const r = calculateEffort({
    files: ['src/security/auth.ts', 'src/security/middleware.ts', 'src/security/session.ts', 'src/security/index.ts', 'src/security/crypto.ts'],
    taskDescription: 'redesign security architecture with encryption and distributed authorization',
    hasFailureHistory: true,
  });
  assertTrue(r.level === 'xhigh', `Expected level "xhigh" for score ${r.score}, got "${r.level}"`);
});

test('score 8+ → level "max"', () => {
  // Max complexity: [high-effort] marker (+5) + high file count + critical dir + keywords + failure
  const r = calculateEffort({
    files: ['src/security/auth.ts', 'src/security/middleware.ts', 'src/security/session.ts', 'src/security/index.ts', 'src/security/crypto.ts'],
    taskDescription: '[high-effort] redesign security architecture with encryption and distributed authorization and migration',
    hasFailureHistory: true,
  });
  assertTrue(r.level === 'max', `Expected level "max" for score ${r.score}, got "${r.level}"`);
});

test('[high-effort] marker yields at least xhigh', () => {
  const r = calculateEffort({
    files: [],
    taskDescription: '[high-effort] complex task',
  });
  assertTrue(r.level === 'xhigh' || r.level === 'max',
    `[high-effort] marker should yield xhigh or max, got "${r.level}" with score ${r.score}`);
});

test('buildEffortGuidance mentions xhigh', () => {
  const guidance = buildEffortGuidance('xhigh', 7);
  assertTrue(/xhigh/i.test(guidance),
    `buildEffortGuidance("xhigh", 7) should mention xhigh in output, got: ${guidance}`);
});

function assertTrue(v, msg = '') { if (!v) throw new Error(msg || `Expected truthy`); }

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
