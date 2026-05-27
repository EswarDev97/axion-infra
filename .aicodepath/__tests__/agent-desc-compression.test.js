#!/usr/bin/env node
// Test: agent description compression
// Asserts count=107, avg<100 bytes, total<10000 bytes

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

const agentsDir = path.join(__dirname, '../agents');
const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).sort();

const descriptions = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
  const m = content.match(/^description:\s*"?(.+?)"?\s*$/m);
  if (m) descriptions.push(m[1].trim());
}

const count = descriptions.length;
const totalBytes = descriptions.reduce((s, d) => s + d.length, 0);
const avgBytes = count > 0 ? totalBytes / count : 0;

console.log('\nAgent Description Compression\n');
console.log(`  Measured: count=${count}, avg=${avgBytes.toFixed(2)} bytes, total=${totalBytes} bytes`);

// --- tests ---

test('agent count is 107', () => {
  assertEqual(count, 107, 'agent count');
});

test('average description length < 100 bytes', () => {
  assertTrue(avgBytes < 100, `avg ${avgBytes.toFixed(2)} bytes is >= 100 bytes`);
});

test('total description bytes < 10000', () => {
  assertTrue(totalBytes < 10000, `total ${totalBytes} bytes is >= 10000 bytes`);
});

// --- summary ---

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
