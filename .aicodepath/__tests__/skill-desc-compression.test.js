#!/usr/bin/env node
// Test: skill description compression
// Asserts count=103, avg<120 bytes

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, msg) {
  if (!condition) throw new Error(msg);
}

// --- measure descriptions ---

const skillsDir = path.join(__dirname, '../skills');
const skillDirs = fs.readdirSync(skillsDir)
  .filter(d => fs.existsSync(path.join(skillsDir, d, 'SKILL.md')))
  .sort();

const descriptions = [];
for (const dir of skillDirs) {
  const content = fs.readFileSync(path.join(skillsDir, dir, 'SKILL.md'), 'utf8');
  const m = content.match(/^description:\s*"?(.+?)"?\s*$/m);
  if (m) descriptions.push(m[1].trim());
}

const count = descriptions.length;
const totalBytes = descriptions.reduce((s, d) => s + d.length, 0);
const avgBytes = count > 0 ? totalBytes / count : 0;

console.log('\nSkill Description Compression\n');
console.log(`  Measured: count=${count}, avg=${avgBytes.toFixed(2)} bytes, total=${totalBytes} bytes`);

// --- tests ---

test('skill count is 103', () => {
  assertEqual(count, 103, 'skill count');
});

test('average description length < 120 bytes', () => {
  assertTrue(avgBytes < 120, `avg ${avgBytes.toFixed(2)} bytes is >= 120 bytes`);
});

test('no individual description exceeds 200 bytes', () => {
  const outliers = descriptions.filter(d => d.length > 200);
  assertTrue(outliers.length === 0, `${outliers.length} descriptions exceed 200 bytes: ${outliers.map(d => d.substring(0, 40)).join(', ')}`);
});

// --- summary ---

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
