#!/usr/bin/env node
// Test: session-start hook slim (T3 — context budget reduction)
// Asserts:
//   - hook output does NOT contain static AIDLC rules ('Skill chain', 'Hard Gates')
//   - hook output does NOT contain <EXTREMELY_IMPORTANT> wrapper
//   - hook still returns valid output with additionalContext
//   - readGraphStatus export still works (regression guard)

const { hook: sessionStartHookImpl, readGraphStatus } = require('../hooks/session-start-hook');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m' };
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (e) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}\n  ${e.message}`);
  }
}

function assertTrue(v, msg) { if (!v) throw new Error(msg || `Expected truthy`); }
function assertFalse(v, msg) { if (v) throw new Error(msg || `Expected falsy`); }

// ── Run hook synchronously via Promise ───────────────────────────────────────

let result;
(async () => {
  result = await sessionStartHookImpl({});

  console.log('\nSession-Start Hook Slim\n');

  const ctx = result?.hookSpecificOutput?.additionalContext ?? '';
  console.log(`  additionalContext: ${ctx.length} bytes (baseline was 3412)`);

  // --- tests ---

  test('hook returns hookSpecificOutput.additionalContext', () => {
    assertTrue(
      typeof ctx === 'string' && ctx.length > 0,
      'additionalContext must be a non-empty string'
    );
  });

  test('hook output does NOT contain "Skill chain" (static AIDLC rules removed)', () => {
    assertFalse(
      ctx.includes('Skill chain'),
      'Found "Skill chain" in hook output — buildMetaSkillSummary() must be removed'
    );
  });

  test('hook output does NOT contain "Hard Gates" (static AIDLC rules removed)', () => {
    assertFalse(
      ctx.includes('Hard Gates'),
      'Found "Hard Gates" in hook output — buildMetaSkillSummary() must be removed'
    );
  });

  test('hook output does NOT contain <EXTREMELY_IMPORTANT> wrapper', () => {
    assertFalse(
      ctx.includes('<EXTREMELY_IMPORTANT>'),
      'Found <EXTREMELY_IMPORTANT> in hook output — wrapper must be removed'
    );
  });

  test('readGraphStatus is still exported (regression guard)', () => {
    assertTrue(
      typeof readGraphStatus === 'function',
      'readGraphStatus must still be exported from session-start-hook'
    );
  });

  // --- summary ---

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
