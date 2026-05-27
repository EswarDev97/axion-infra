/**
 * Test: mergeGuidelines — rule-level merge of project overlays onto framework base
 *
 * Covers: replace, disable (enabled:false), append, new category, no-op cases, immutability.
 */

const { mergeGuidelines } = require('../hooks/guideline-validator');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
  }
}
function assertTrue(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeBase() {
  return {
    '$schema': 'test',
    version: '1.0.0',
    categories: {
      naming: {
        description: 'Naming rules',
        rules: [
          { id: 'class-pascal-case', severity: 'error', pattern: '^class\\s+([a-z])' },
          { id: 'no-single-letter-var', severity: 'warning', pattern: '\\bvar [a-z]\\b' },
        ],
      },
      structure: {
        description: 'Structure rules',
        rules: [
          { id: 'max-file-length', severity: 'warning', check: 'file_length', threshold: 300 },
        ],
      },
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('replace: overlay rule with matching id wins', () => {
  const base = makeBase();
  const overlay = {
    categories: {
      naming: {
        rules: [
          { id: 'class-pascal-case', severity: 'warning', pattern: '^class\\s+([a-z])', message: 'custom message' },
        ],
      },
    },
  };

  const merged = mergeGuidelines(base, overlay);
  const rule = merged.categories.naming.rules.find(r => r.id === 'class-pascal-case');

  assertEqual(rule.severity, 'warning', 'severity should be overridden to warning');
  assertEqual(rule.message, 'custom message', 'message should come from overlay');
  // Other rules are preserved
  assertTrue(merged.categories.naming.rules.some(r => r.id === 'no-single-letter-var'), 'unrelated rule preserved');
});

test('disable: overlay rule with enabled:false removes base rule', () => {
  const base = makeBase();
  const overlay = {
    categories: {
      naming: {
        rules: [
          { id: 'no-single-letter-var', enabled: false },
        ],
      },
    },
  };

  const merged = mergeGuidelines(base, overlay);
  const found = merged.categories.naming.rules.find(r => r.id === 'no-single-letter-var');

  assertTrue(found === undefined, 'disabled rule should be removed');
  assertEqual(merged.categories.naming.rules.length, 1, 'only one rule should remain');
});

test('disable: enabled:false on unknown id is a no-op', () => {
  const base = makeBase();
  const overlay = {
    categories: {
      naming: {
        rules: [{ id: 'non-existent-rule', enabled: false }],
      },
    },
  };

  const merged = mergeGuidelines(base, overlay);
  assertEqual(merged.categories.naming.rules.length, 2, 'base rules unchanged when disabling unknown id');
});

test('append: overlay rule with new id is added to category', () => {
  const base = makeBase();
  const overlay = {
    categories: {
      naming: {
        rules: [
          { id: 'no-abbreviations', severity: 'warning', pattern: '\\b(btn|cls|mgr)\\b' },
        ],
      },
    },
  };

  const merged = mergeGuidelines(base, overlay);
  const rule = merged.categories.naming.rules.find(r => r.id === 'no-abbreviations');

  assertTrue(rule !== undefined, 'new rule should be appended');
  assertEqual(merged.categories.naming.rules.length, 3, 'should now have 3 naming rules');
});

test('new category: overlay category not in base is added entirely', () => {
  const base = makeBase();
  const overlay = {
    categories: {
      security: {
        description: 'Security rules',
        rules: [
          { id: 'no-eval', severity: 'error', pattern: '\\beval\\(' },
        ],
      },
    },
  };

  const merged = mergeGuidelines(base, overlay);

  assertTrue(merged.categories.security !== undefined, 'new category should exist');
  assertEqual(merged.categories.security.rules.length, 1, 'new category has its rules');
  assertEqual(merged.categories.security.rules[0].id, 'no-eval', 'rule id correct');
  // Original categories preserved
  assertTrue(merged.categories.naming !== undefined, 'naming category still present');
  assertTrue(merged.categories.structure !== undefined, 'structure category still present');
});

test('no overlay categories: base returned unchanged', () => {
  const base = makeBase();
  const overlay = { version: '1.0.1' }; // no categories key

  const merged = mergeGuidelines(base, overlay);

  assertEqual(merged.categories.naming.rules.length, 2, 'naming rules unchanged');
  assertEqual(merged.categories.structure.rules.length, 1, 'structure rules unchanged');
});

test('immutability: base object is not mutated', () => {
  const base = makeBase();
  const originalNamingCount = base.categories.naming.rules.length;

  const overlay = {
    categories: {
      naming: {
        rules: [
          { id: 'new-rule', severity: 'error', pattern: 'foo' },
          { id: 'class-pascal-case', severity: 'info' }, // replace
        ],
      },
    },
  };

  mergeGuidelines(base, overlay);

  assertEqual(base.categories.naming.rules.length, originalNamingCount, 'base not mutated: rule count unchanged');
  assertEqual(base.categories.naming.rules[0].severity, 'error', 'base not mutated: original severity preserved');
});

test('top-level metadata comes from base', () => {
  const base = makeBase();
  const overlay = {
    '$schema': 'project-override',
    version: '99.0.0',
    categories: {},
  };

  const merged = mergeGuidelines(base, overlay);

  assertEqual(merged['$schema'], 'test', 'schema comes from base');
  assertEqual(merged.version, '1.0.0', 'version comes from base');
});

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== Running mergeGuidelines Tests ===\n');
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (error) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${error.message}`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${tests.length} total ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
