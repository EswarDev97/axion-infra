#!/usr/bin/env node
// Test: CLAUDE.md consolidation (T2 — context budget reduction)
// Asserts:
//   - root CLAUDE.md has no @-include for DEVELOPER-GUIDE.md or .aicodepath/CLAUDE.md
//   - root CLAUDE.md contains full AIDLC skill chain
//   - root CLAUDE.md contains dev rules (path-resolver, codebase-map, agent-taxonomy)
//   - .aicodepath/CLAUDE.md is a short redirect (≤ 300 bytes of non-comment content)

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function assertTrue(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
}

// --- load files ---

const rootClaudeMd = fs.readFileSync(
  path.join(__dirname, '../../CLAUDE.md'),
  'utf8'
);

const innerClaudeMd = fs.readFileSync(
  path.join(__dirname, '../CLAUDE.md'),
  'utf8'
);

// Strip HTML comments and blank lines to measure redirect-only content
const innerNonComment = innerClaudeMd
  .replace(/<!--[\s\S]*?-->/g, '')
  .trim();

console.log('\nCLAUDE.md Consolidation\n');
console.log(`  root CLAUDE.md: ${rootClaudeMd.length} bytes`);
console.log(`  .aicodepath/CLAUDE.md (non-comment): ${innerNonComment.length} bytes`);

// --- tests ---

test('root CLAUDE.md has no @.aicodepath/DEVELOPER-GUIDE.md reference', () => {
  assertTrue(
    !rootClaudeMd.includes('@.aicodepath/DEVELOPER-GUIDE.md'),
    'Found @.aicodepath/DEVELOPER-GUIDE.md in root CLAUDE.md — must be removed'
  );
});

test('root CLAUDE.md has no @.aicodepath/CLAUDE.md reference', () => {
  assertTrue(
    !rootClaudeMd.includes('@.aicodepath/CLAUDE.md'),
    'Found @.aicodepath/CLAUDE.md in root CLAUDE.md — must be removed'
  );
});

test('root CLAUDE.md contains Skill chain', () => {
  assertTrue(
    rootClaudeMd.includes('Skill chain'),
    'root CLAUDE.md must contain "Skill chain"'
  );
});

test('root CLAUDE.md contains numbered AIDLC steps (/aicodepath-knowledge)', () => {
  assertTrue(
    rootClaudeMd.includes('/aicodepath-knowledge'),
    'root CLAUDE.md must contain the numbered skill chain starting with /aicodepath-knowledge'
  );
});

test('root CLAUDE.md contains Hard Gates section', () => {
  assertTrue(
    rootClaudeMd.includes('Hard Gates'),
    'root CLAUDE.md must contain "Hard Gates" section from AIDLC rules'
  );
});

test('root CLAUDE.md contains dev rule: path-resolver.js', () => {
  assertTrue(
    rootClaudeMd.includes('path-resolver'),
    'root CLAUDE.md must contain dev rule about path-resolver.js'
  );
});

test('root CLAUDE.md contains dev rule: codebase-map.md', () => {
  assertTrue(
    rootClaudeMd.includes('codebase-map.md'),
    'root CLAUDE.md must contain dev rule about updating codebase-map.md'
  );
});

test('root CLAUDE.md contains dev rule: agent-taxonomy.md', () => {
  assertTrue(
    rootClaudeMd.includes('agent-taxonomy.md'),
    'root CLAUDE.md must contain dev rule about updating agent-taxonomy.md'
  );
});

test('.aicodepath/CLAUDE.md is a short redirect (≤ 300 non-comment bytes)', () => {
  assertTrue(
    innerNonComment.length <= 300,
    `.aicodepath/CLAUDE.md non-comment content is ${innerNonComment.length} bytes — expected ≤ 300 (redirect only)`
  );
});

// --- summary ---

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
