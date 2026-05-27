/**
 * Test: Claude Code Adapter
 *
 * Tests BaseAdapter interface, Session/Message/UsageStats constructors,
 * ClaudeCodeAdapter detection, parsing, and AdapterManager singleton.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const { BaseAdapter, Session, Message, UsageStats } = require('../lib/adapters/base-adapter');
const { ClaudeCodeAdapter } = require('../lib/adapters/claude-code-adapter');
const { AdapterManager, getAdapterManager } = require('../lib/adapters/adapter-manager');

// ---------------------------------------------------------------------------
// Test utilities (matching project pattern from pricing-calculator.test.js)
// ---------------------------------------------------------------------------

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      // async test - handle separately
      result.then(() => {
        passed++;
        console.log(`${colors.green}\u2713${colors.reset} ${name}`);
      }).catch(err => {
        failed++;
        console.log(`${colors.red}\u2717${colors.reset} ${name}`);
        console.log(`  ${colors.yellow}${err.message}${colors.reset}`);
      });
      return result;
    }
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`);
  }
}

function assertAlmostEqual(actual, expected, tolerance = 0.0001, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\n  Expected ~${expected} (+-${tolerance})\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value, got: ${JSON.stringify(condition)}`);
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(`${message}\n  Expected falsy value, got: ${JSON.stringify(condition)}`);
  }
}

function assertNull(value, message = '') {
  if (value !== null) {
    throw new Error(`${message}\n  Expected null, got: ${JSON.stringify(value)}`);
  }
}

// ---------------------------------------------------------------------------
// Test 1: BaseAdapter throws on unimplemented methods
// ---------------------------------------------------------------------------

test('BaseAdapter throws on unimplemented id getter', () => {
  const adapter = new BaseAdapter();
  let threw = false;
  try { adapter.id; } catch (e) { threw = true; }
  assertTrue(threw, 'BaseAdapter.id should throw');
});

test('BaseAdapter throws on unimplemented name getter', () => {
  const adapter = new BaseAdapter();
  let threw = false;
  try { adapter.name; } catch (e) { threw = true; }
  assertTrue(threw, 'BaseAdapter.name should throw');
});

test('BaseAdapter throws on unimplemented icon getter', () => {
  const adapter = new BaseAdapter();
  let threw = false;
  try { adapter.icon; } catch (e) { threw = true; }
  assertTrue(threw, 'BaseAdapter.icon should throw');
});

test('BaseAdapter throws on unimplemented detect()', async () => {
  const adapter = new BaseAdapter();
  let threw = false;
  try { await adapter.detect('/tmp'); } catch (e) { threw = true; }
  assertTrue(threw, 'BaseAdapter.detect should throw');
});

// ---------------------------------------------------------------------------
// Test 2: Session constructor defaults
// ---------------------------------------------------------------------------

test('Session constructor sets id and adapterID', () => {
  const s = new Session({ id: 'test-id', adapterID: 'claude-code', adapterName: 'Claude Code', adapterIcon: 'C', createdAt: '2024-01-01', updatedAt: '2024-01-02' });
  assertEqual(s.id, 'test-id', 'Session id');
  assertEqual(s.adapterID, 'claude-code', 'Session adapterID');
});

test('Session constructor applies defaults for optional fields', () => {
  const s = new Session({ id: 'x', adapterID: 'a', adapterName: 'A', adapterIcon: 'A', createdAt: '2024-01-01', updatedAt: '2024-01-01' });
  assertEqual(s.name, '', 'Session name default');
  assertEqual(s.slug, '', 'Session slug default');
  assertEqual(s.duration, 0, 'Session duration default');
  assertFalse(s.isActive, 'Session isActive default');
  assertEqual(s.totalTokens, 0, 'Session totalTokens default');
  assertEqual(s.estimatedCost, 0, 'Session estimatedCost default');
  assertEqual(s.messageCount, 0, 'Session messageCount default');
  assertEqual(s.filePath, '', 'Session filePath default');
  assertEqual(s.worktreeName, '', 'Session worktreeName default');
  assertEqual(s.worktreePath, '', 'Session worktreePath default');
});

// ---------------------------------------------------------------------------
// Test 3: Message constructor defaults
// ---------------------------------------------------------------------------

test('Message constructor sets id, sessionID, role', () => {
  const m = new Message({ id: 'msg1', sessionID: 'sess1', role: 'user', timestamp: '2024-01-01' });
  assertEqual(m.id, 'msg1', 'Message id');
  assertEqual(m.sessionID, 'sess1', 'Message sessionID');
  assertEqual(m.role, 'user', 'Message role');
});

test('Message constructor applies defaults for optional fields', () => {
  const m = new Message({ id: 'm', sessionID: 's', role: 'user', timestamp: '2024-01-01' });
  assertEqual(m.content, '', 'Message content default');
  assertEqual(m.model, '', 'Message model default');
  assertTrue(Array.isArray(m.toolUses), 'Message toolUses default array');
  assertTrue(Array.isArray(m.thinkingBlocks), 'Message thinkingBlocks default array');
  assertTrue(Array.isArray(m.contentBlocks), 'Message contentBlocks default array');
  assertTrue(typeof m.tokenUsage === 'object', 'Message tokenUsage default object');
});

// ---------------------------------------------------------------------------
// Test 4 & 5: ClaudeCodeAdapter.detect()
// ---------------------------------------------------------------------------

testAsync('ClaudeCodeAdapter.detect() returns detected:false when no .claude dir', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-test-'));
  try {
    const adapter = new ClaudeCodeAdapter();
    const result = await adapter.detect(tmpDir);
    assertFalse(result.detected, 'Should not detect without .claude dir');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

testAsync('ClaudeCodeAdapter.detect() returns detected:true when .claude dir exists', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-test-'));
  try {
    fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    const adapter = new ClaudeCodeAdapter();
    const result = await adapter.detect(tmpDir);
    assertTrue(result.detected, 'Should detect with .claude dir');
    assertTrue(typeof result.sessionDir === 'string', 'Should return sessionDir');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 6-11: _parseMessage
// ---------------------------------------------------------------------------

test('_parseMessage extracts role from nested message format', () => {
  const adapter = new ClaudeCodeAdapter();
  const json = {
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
    message: { role: 'assistant', content: 'Hello', model: 'claude-sonnet', usage: {} }
  };
  const msg = adapter._parseMessage('claude-code:/tmp/test.jsonl', json, 1);
  assertTrue(msg !== null, 'Should parse message');
  assertEqual(msg.role, 'assistant', 'Role should be assistant');
});

test('_parseMessage extracts text content from content array', () => {
  const adapter = new ClaudeCodeAdapter();
  const json = {
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Hello world' },
        { type: 'text', text: 'Second part' }
      ],
      usage: {}
    }
  };
  const msg = adapter._parseMessage('claude-code:/tmp/test.jsonl', json, 1);
  assertTrue(msg !== null, 'Should parse message');
  assertTrue(msg.content.includes('Hello world'), 'Content should include first text block');
  assertTrue(msg.content.includes('Second part'), 'Content should include second text block');
});

test('_parseMessage extracts token usage (input, output, cacheRead, cacheWrite)', () => {
  const adapter = new ClaudeCodeAdapter();
  const json = {
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: 'Test',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 200,
        cache_creation_input_tokens: 300
      }
    }
  };
  const msg = adapter._parseMessage('claude-code:/tmp/test.jsonl', json, 1);
  assertTrue(msg !== null, 'Should parse message');
  assertEqual(msg.tokenUsage.inputTokens, 100, 'inputTokens');
  assertEqual(msg.tokenUsage.outputTokens, 50, 'outputTokens');
  assertEqual(msg.tokenUsage.cacheReadTokens, 200, 'cacheReadTokens');
  assertEqual(msg.tokenUsage.cacheWriteTokens, 300, 'cacheWriteTokens');
});

test('_parseMessage extracts tool_use blocks', () => {
  const adapter = new ClaudeCodeAdapter();
  const json = {
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Using tool' },
        { type: 'tool_use', id: 'tool1', name: 'Bash', input: { command: 'ls' } }
      ],
      usage: {}
    }
  };
  const msg = adapter._parseMessage('claude-code:/tmp/test.jsonl', json, 1);
  assertTrue(msg !== null, 'Should parse message');
  assertEqual(msg.toolUses.length, 1, 'Should have 1 tool use');
  assertEqual(msg.toolUses[0].name, 'Bash', 'Tool name should be Bash');
});

test('_parseMessage extracts thinking blocks', () => {
  const adapter = new ClaudeCodeAdapter();
  const json = {
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'Let me think...' },
        { type: 'text', text: 'Answer' }
      ],
      usage: {}
    }
  };
  const msg = adapter._parseMessage('claude-code:/tmp/test.jsonl', json, 1);
  assertTrue(msg !== null, 'Should parse message');
  assertEqual(msg.thinkingBlocks.length, 1, 'Should have 1 thinking block');
  assertEqual(msg.thinkingBlocks[0].thinking, 'Let me think...', 'Thinking content');
});

test('_parseMessage returns null for lines with no role', () => {
  const adapter = new ClaudeCodeAdapter();
  const json = { type: 'info', data: 'some metadata', timestamp: '2024-01-01T00:00:00Z' };
  const msg = adapter._parseMessage('claude-code:/tmp/test.jsonl', json, 1);
  assertNull(msg, 'Should return null for line without role');
});

// ---------------------------------------------------------------------------
// Test 12 & 13: _extractContent
// ---------------------------------------------------------------------------

test('_extractContent handles plain string content', () => {
  const adapter = new ClaudeCodeAdapter();
  const result = adapter._extractContent('plain string content');
  assertEqual(result, 'plain string content', 'Plain string should be returned as-is');
});

test('_extractContent handles array content blocks', () => {
  const adapter = new ClaudeCodeAdapter();
  const blocks = [
    { type: 'text', text: 'First' },
    { type: 'tool_use', id: 'x', name: 'Bash' },
    { type: 'text', text: 'Second' }
  ];
  const result = adapter._extractContent(blocks);
  assertTrue(result.includes('First'), 'Should include first text block');
  assertTrue(result.includes('Second'), 'Should include second text block');
  assertFalse(result.includes('tool_use'), 'Should not include tool_use type');
});

// ---------------------------------------------------------------------------
// Test 14: getUsage calculates cost correctly
// ---------------------------------------------------------------------------

testAsync('getUsage calculates cost correctly from known token counts', async () => {
  const adapter = new ClaudeCodeAdapter();

  // Override getMessages to return known data
  adapter.getMessages = async () => [
    new Message({
      id: 'm1', sessionID: 'test', role: 'assistant', timestamp: '2024-01-01',
      tokenUsage: { inputTokens: 1000000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
    }),
    new Message({
      id: 'm2', sessionID: 'test', role: 'assistant', timestamp: '2024-01-01',
      tokenUsage: { inputTokens: 0, outputTokens: 1000000, cacheReadTokens: 0, cacheWriteTokens: 0 }
    })
  ];

  const usage = await adapter.getUsage('test-session');
  assertEqual(usage.totalInputTokens, 1000000, 'Total input tokens');
  assertEqual(usage.totalOutputTokens, 1000000, 'Total output tokens');
  // $3/M input + $15/M output = $18
  assertAlmostEqual(usage.estimatedCost, 18.0, 0.001, 'Estimated cost should be $18');
  assertEqual(usage.messageCount, 2, 'Message count');
});

// ---------------------------------------------------------------------------
// Test 15 & 16: AdapterManager
// ---------------------------------------------------------------------------

test('AdapterManager registers ClaudeCodeAdapter on construction', () => {
  const manager = new AdapterManager();
  assertTrue(manager.adapters.size >= 1, 'Should have at least 1 adapter');
  assertTrue(manager.adapters.has('claude-code'), 'Should have claude-code adapter');
});

test('AdapterManager.getAdapter("claude-code") returns the adapter', () => {
  const manager = new AdapterManager();
  const adapter = manager.getAdapter('claude-code');
  assertTrue(adapter !== undefined, 'Should return adapter');
  assertEqual(adapter.id, 'claude-code', 'Adapter id should be claude-code');
});

// ---------------------------------------------------------------------------
// Test 17: getAdapterManager() returns singleton
// ---------------------------------------------------------------------------

test('getAdapterManager() returns singleton instance', () => {
  const m1 = getAdapterManager();
  const m2 = getAdapterManager();
  assertTrue(m1 === m2, 'Should return same singleton instance');
});

// ---------------------------------------------------------------------------
// Summary (deferred to allow async tests to complete)
// ---------------------------------------------------------------------------

setTimeout(() => {
  console.log(`\n${passed + failed} tests: ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`);
  if (failed > 0) process.exit(1);
}, 500);
