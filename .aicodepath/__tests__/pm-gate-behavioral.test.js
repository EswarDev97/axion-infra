#!/usr/bin/env node
/**
 * Behavioral tests for PM Discovery Gate (T7)
 *
 * Tests 6 scenarios using @anthropic-ai/sdk Messages API (Haiku model).
 * Each scenario injects the relevant SKILL.md / inception.md section as the
 * system prompt and asserts on Claude's response text.
 *
 * Run: node .aicodepath/__tests__/pm-gate-behavioral.test.js
 * Requires: ANTHROPIC_API_KEY environment variable
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic();
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;
const SKILLS_DIR = path.join(__dirname, '../skills');
const RULES_DIR = path.join(__dirname, '../rules/core');

// ── Colours ──────────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

// ── Test harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`${c.green}✓${c.reset} ${name}`);
  } catch (err) {
    failed++;
    console.log(`${c.red}✗${c.reset} ${name}`);
    console.log(`  ${c.yellow}${err.message}${c.reset}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertContains(text, substring, message) {
  assert(
    text.toLowerCase().includes(substring.toLowerCase()),
    message || `Expected response to contain "${substring}"\nGot: ${text.slice(0, 200)}`
  );
}

function assertNotContains(text, substring, message) {
  assert(
    !text.toLowerCase().includes(substring.toLowerCase()),
    message || `Expected response NOT to contain "${substring}"\nGot: ${text.slice(0, 200)}`
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readSection(filePath, startMarker, endMarker) {
  const content = fs.readFileSync(filePath, 'utf8');
  const start = content.indexOf(startMarker);
  if (start === -1) throw new Error(`Marker not found in ${filePath}: "${startMarker}"`);
  const end = endMarker ? content.indexOf(endMarker, start + startMarker.length) : content.length;
  return content.slice(start, end === -1 ? content.length : end).trim();
}

async function callModel(systemContent, userPrompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      'You are operating under the following skill instructions. Follow them exactly.',
      '',
      systemContent,
      '',
      '---',
      'Respond to the user message according to these instructions.',
    ].join('\n'),
    messages: [{ role: 'user', content: userPrompt }],
  });
  return response.content[0].text;
}

// ── Load skill sections ───────────────────────────────────────────────────────
const inceptionProductDiscovery = readSection(
  path.join(RULES_DIR, 'inception.md'),
  '## Product Discovery (CONDITIONAL',
  '## Reverse Engineering'
);

const brainstormExploringContext = readSection(
  path.join(SKILLS_DIR, 'aicodepath-brainstorm/SKILL.md'),
  '### Exploring Context',
  '### Asking Questions'
);

// Synthetic PM artifact for Scenario F (Source: Web Research)
const syntheticPMContext = `
## PM Discovery Artifacts (loaded from aicodepath-docs/pm/)

### competitive-awareness.md
**Generated**: 2026-04-01
**Source:** Web Research

| Tool | What it does well | Where it falls short | Why users switch away |
|------|------------------|---------------------|----------------------|
| Notion | Flexible docs | No structured data | Becomes chaotic at scale |
| Linear | Issue tracking | Limited PM views | No roadmap storytelling |
| Jira | Enterprise features | Complex UX | Too heavy for small teams |
`;

// ── Scenarios ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${c.bold}PM Discovery Gate — Behavioral Tests${c.reset}\n`);

  // Scenario A: Skip — user declares defined user/problem
  await test('A: Skip gate — user declares defined users (should not ask binary question)', async () => {
    const text = await callModel(
      inceptionProductDiscovery,
      'Yes, I have a clear user — enterprise finance teams who use Excel for forecasting. Start.'
    );
    assertNotContains(text, 'Research it now',
      'Gate should skip — Route A option should not appear when user has defined users');
    assertNotContains(text, 'do you have a defined user',
      'Binary question should not be re-asked when user confirms defined users');
  });

  // Scenario B: Fire — Route A (web research) selected
  await test('B: Fire gate → Route A — response references web research', async () => {
    const text = await callModel(
      inceptionProductDiscovery,
      'Not yet defined — I want to build something for the productivity space. Research it now.'
    );
    assertContains(text, 'research',
      'Route A should trigger research activity reference in response');
  });

  // Scenario C: Fire — Route B (user describes) selected
  await test('C: Fire gate → Route B — response asks a structured question', async () => {
    const text = await callModel(
      inceptionProductDiscovery,
      "Not yet defined. I'll describe it — my users are freelance designers."
    );
    assert(text.includes('?'),
      'Route B should ask at least one structured follow-up question');
  });

  // Scenario D: Fire — Route C (AI hypotheses) selected
  await test('D: Fire gate → Route C — response contains hypothesis framing', async () => {
    const text = await callModel(
      inceptionProductDiscovery,
      "Not sure yet. Just give me quick AI hypotheses, I'll validate later."
    );
    const hasHypothesisLabel =
      text.toLowerCase().includes('hypothesis') ||
      text.includes('AI Hypothesis') ||
      text.includes('⚠️') ||
      text.toLowerCase().includes('unvalidated');
    assert(hasHypothesisLabel,
      'Route C should produce hypothesis-labeled output (hypothesis/AI Hypothesis/⚠️/unvalidated)');
  });

  // Scenario E: Skip — feature-level request (file path signals existing system)
  await test('E: Skip gate — feature-level request with file path (should not trigger PM gate)', async () => {
    const text = await callModel(
      inceptionProductDiscovery,
      'Add OAuth login to the existing user management module in src/auth/'
    );
    assertNotContains(text, 'Research it now',
      'Feature-level request with file path should bypass PM Discovery gate');
  });

  // Scenario F: Source-aware citation in brainstorm
  await test('F: Source-aware citation — Web Research source cited with research framing', async () => {
    const systemContent = [brainstormExploringContext, syntheticPMContext].join('\n\n');
    const text = await callModel(
      systemContent,
      "Before we start designing — what does the PM context tell us about the competitive landscape? Summarise what we know and cite the source appropriately."
    );
    assertContains(text, 'research',
      'Web Research source should produce research-framed citation, not hypothesis framing');
    assertNotContains(text, 'AI Hypothesis',
      'Web Research source should not be cited as AI Hypothesis');
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${c.bold}Results:${c.reset} ${c.green}${passed} passed${c.reset}, ${failed > 0 ? c.red : ''}${failed} failed${c.reset} / ${total} total\n`);
  if (failed > 0) process.exit(1);
})();
