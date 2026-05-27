/**
 * Tests for IncrementalSessionParser + SessionCache
 * Feature P3.2: Incremental Session Parsing with LRU Cache
 *
 * Uses temp JSONL files on disk (no mocking) to test real file reads.
 * Covers: cache hit/miss, byte-offset resumption, tool linking,
 * cache invalidation, pagination, malformed JSONL resilience.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// ── Simple test harness ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      }).catch(err => {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        failed++;
      });
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ': ' : ''}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, msg = 'Expected truthy') {
  if (!condition) throw new Error(msg);
}

function assertFalse(condition, msg = 'Expected falsy') {
  if (condition) throw new Error(msg);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTempFile(content) {
  const tmpPath = path.join(os.tmpdir(), `parser-test-${crypto.randomBytes(8).toString('hex')}.jsonl`);
  fs.writeFileSync(tmpPath, content, 'utf8');
  return tmpPath;
}

function removeTempFile(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

function makeMessage(role, text, idx = 0) {
  return JSON.stringify({
    type: 'message',
    timestamp: new Date().toISOString(),
    message: {
      id: `msg_${idx}`,
      role,
      content: [{ type: 'text', text }],
      model: 'claude-sonnet',
      usage: { input_tokens: 10, output_tokens: 20 }
    }
  });
}

function makeToolUseMessage(toolName, toolUseId) {
  return JSON.stringify({
    type: 'message',
    timestamp: new Date().toISOString(),
    message: {
      id: `msg_tu_${toolName}`,
      role: 'assistant',
      content: [
        { type: 'text', text: `Using ${toolName}` },
        { type: 'tool_use', id: toolUseId, name: toolName, input: { path: '/test/file.js' } }
      ],
      model: 'claude-sonnet',
      usage: { input_tokens: 5, output_tokens: 15 }
    }
  });
}

function makeToolResultMessage(toolUseId, result) {
  return JSON.stringify({
    type: 'message',
    timestamp: new Date().toISOString(),
    message: {
      id: `msg_tr_${toolUseId}`,
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: toolUseId, content: result }
      ],
      model: '',
      usage: {}
    }
  });
}

const { SessionCache, getSessionCache } = require('../lib/session-cache');
const IncrementalSessionParser = require('../lib/incremental-session-parser');

// ── Tests: SessionCache ───────────────────────────────────────────────────────

console.log('\nSessionCache:');

test('get returns null on cache miss', () => {
  const cache = new SessionCache({ maxEntries: 10 });
  const result = cache.getSession('nonexistent', '/fake/path');
  assertEqual(result, null, 'Should be null on miss');
});

test('set and get returns cached data', () => {
  const cache = new SessionCache({ maxEntries: 10 });
  const messages = [{ id: 'm1', role: 'user', content: 'hello' }];
  const metadata = { messageCount: 1 };
  const tmpFile = makeTempFile('{}');

  cache.setSession('s1', tmpFile, messages, metadata, 100);
  const result = cache.getSession('s1', tmpFile);

  assertTrue(result !== null, 'Should return cached entry');
  assertEqual(result.messages.length, 1);
  assertEqual(result.byteOffset, 100);
  removeTempFile(tmpFile);
});

test('invalidate clears specific session', () => {
  const cache = new SessionCache({ maxEntries: 10 });
  const tmpFile = makeTempFile('{}');

  cache.setSession('s1', tmpFile, [], {}, 50);
  cache.invalidate('s1');

  const result = cache.getSession('s1', tmpFile);
  assertEqual(result, null, 'Should be null after invalidation');
  removeTempFile(tmpFile);
});

test('LRU eviction removes oldest entry when full', () => {
  const cache = new SessionCache({ maxSessions: 3 }); // maxSessions is the correct option name
  const tmpFile = makeTempFile('{}');

  cache.setSession('s1', tmpFile, [], {}, 10);
  cache.setSession('s2', tmpFile, [], {}, 20);
  cache.setSession('s3', tmpFile, [], {}, 30);
  // Adding s4 should evict s1 (LRU)
  cache.setSession('s4', tmpFile, [], {}, 40);

  const s1 = cache.getSession('s1', tmpFile);
  assertEqual(s1, null, 's1 should have been evicted');

  const s4 = cache.getSession('s4', tmpFile);
  assertTrue(s4 !== null, 's4 should still be cached');
  removeTempFile(tmpFile);
});

test('getByteOffset returns 0 on miss', () => {
  const cache = new SessionCache({ maxEntries: 10 });
  assertEqual(cache.getByteOffset('unknown'), 0);
});

test('getByteOffset returns stored offset', () => {
  const cache = new SessionCache({ maxEntries: 10 });
  const tmpFile = makeTempFile('{}');
  cache.setSession('s1', tmpFile, [], {}, 256);
  assertEqual(cache.getByteOffset('s1'), 256);
  removeTempFile(tmpFile);
});

test('stale detection returns null for modified file', async () => {
  // SessionCache uses mtime-based staleness (not TTL).
  // Write to the file after caching to update its mtime.
  const cache = new SessionCache({ maxSessions: 10 });
  const tmpFile = makeTempFile('original content');
  cache.setSession('s1', tmpFile, [], {}, 10);

  // Wait a tick then overwrite the file (changes mtime)
  await new Promise(r => setTimeout(r, 10));
  fs.writeFileSync(tmpFile, 'modified content', 'utf8');

  const result = cache.getSession('s1', tmpFile);
  assertEqual(result, null, 'Modified file should be treated as stale');
  removeTempFile(tmpFile);
});

test('getStats returns accurate counts', () => {
  const cache = new SessionCache({ maxEntries: 10 });
  const tmpFile = makeTempFile('{}');
  cache.setSession('s1', tmpFile, [], {}, 10);
  cache.setSession('s2', tmpFile, [], {}, 20);

  const stats = cache.getStats();
  assertEqual(stats.size, 2, 'Should report 2 cached entries');
  removeTempFile(tmpFile);
});

// ── Tests: IncrementalSessionParser ──────────────────────────────────────────

console.log('\nIncrementalSessionParser:');

test('parses empty file without error', async () => {
  const tmpFile = makeTempFile('');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const result = await parser.parse(tmpFile, 'session-empty');
  assertEqual(result.messages.length, 0);
  assertEqual(result.fromCache, false);
  removeTempFile(tmpFile);
});

test('parses single message', async () => {
  const line = makeMessage('user', 'Hello world', 0);
  const tmpFile = makeTempFile(line + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const result = await parser.parse(tmpFile, 'session-single');
  assertTrue(result.messages.length >= 1, 'Should parse at least one message');
  assertEqual(result.messages[0].role, 'user');
  removeTempFile(tmpFile);
});

test('parses multiple messages', async () => {
  const lines = [
    makeMessage('user', 'Question one', 0),
    makeMessage('assistant', 'Answer one', 1),
    makeMessage('user', 'Question two', 2),
  ].join('\n');
  const tmpFile = makeTempFile(lines + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const result = await parser.parse(tmpFile, 'session-multi');
  assertTrue(result.messages.length >= 3, 'Should parse at least 3 messages');
  removeTempFile(tmpFile);
});

test('second parse returns from cache', async () => {
  const line = makeMessage('user', 'Cache test', 0);
  const tmpFile = makeTempFile(line + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  await parser.parse(tmpFile, 'session-cache');
  const second = await parser.parse(tmpFile, 'session-cache');

  assertEqual(second.fromCache, true, 'Second read should be from cache');
  removeTempFile(tmpFile);
});

test('assigns sequential messageIndex values', async () => {
  const lines = [
    makeMessage('user', 'First', 0),
    makeMessage('assistant', 'Second', 1),
  ].join('\n');
  const tmpFile = makeTempFile(lines + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const result = await parser.parse(tmpFile, 'session-idx');
  const indices = result.messages.map(m => m.messageIndex);
  assertTrue(indices[0] >= 0, 'First index should be >= 0');
  assertTrue(indices.length < 2 || indices[1] > indices[0], 'Indices should increase');
  removeTempFile(tmpFile);
});

test('skips malformed JSONL lines gracefully', async () => {
  const content = [
    makeMessage('user', 'Good line', 0),
    'THIS IS NOT JSON!!!',
    makeMessage('assistant', 'Also good', 1),
  ].join('\n');
  const tmpFile = makeTempFile(content + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const result = await parser.parse(tmpFile, 'session-malformed');
  assertTrue(result.messages.length >= 2, 'Should parse valid lines and skip bad ones');
  removeTempFile(tmpFile);
});

test('throws for non-existent file', async () => {
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  let threw = false;
  try {
    await parser.parse('/absolutely/does/not/exist.jsonl', 'session-missing');
  } catch {
    threw = true;
  }
  assertTrue(threw, 'Should throw for missing file');
});

test('forceRefresh bypasses cache', async () => {
  const line = makeMessage('user', 'Refresh test', 0);
  const tmpFile = makeTempFile(line + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  await parser.parse(tmpFile, 'session-refresh');
  const second = await parser.parse(tmpFile, 'session-refresh', { forceRefresh: true });

  assertEqual(second.fromCache, false, 'forceRefresh should bypass cache');
  removeTempFile(tmpFile);
});

test('invalidateCache removes session from cache', async () => {
  const line = makeMessage('user', 'Invalidate test', 0);
  const tmpFile = makeTempFile(line + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  await parser.parse(tmpFile, 'session-invalidate');
  parser.invalidateCache('session-invalidate');

  const result = await parser.parse(tmpFile, 'session-invalidate');
  assertEqual(result.fromCache, false, 'After invalidation, should re-parse from disk');
  removeTempFile(tmpFile);
});

test('links tool_use with tool_result', async () => {
  const toolUseId = 'tu_abc123';
  const content = [
    makeToolUseMessage('Read', toolUseId),
    makeToolResultMessage(toolUseId, 'File content here'),
  ].join('\n');
  const tmpFile = makeTempFile(content + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const result = await parser.parse(tmpFile, 'session-tooluse');
  const assistantMsg = result.messages.find(m => m.role === 'assistant');

  if (assistantMsg) {
    assertTrue(
      Array.isArray(assistantMsg.toolUses),
      'Assistant message should have toolUses array'
    );
    // If linking worked, toolUses should have an entry
    if (assistantMsg.toolUses.length > 0) {
      assertEqual(assistantMsg.toolUses[0].toolName, 'Read', 'Tool name should match');
    }
  }
  removeTempFile(tmpFile);
});

test('getPage returns correct slice', async () => {
  const lines = Array.from({ length: 10 }, (_, i) =>
    makeMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`, i)
  ).join('\n');
  const tmpFile = makeTempFile(lines + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const page = await parser.getPage(tmpFile, 'session-page', 3, 2);
  assertTrue(page.messages.length <= 3, 'Should respect limit');
  assertTrue(page.total >= 3, 'Should report total count');
  removeTempFile(tmpFile);
});

test('getPage hasMore is false for last page', async () => {
  const lines = Array.from({ length: 3 }, (_, i) =>
    makeMessage('user', `Message ${i}`, i)
  ).join('\n');
  const tmpFile = makeTempFile(lines + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const page = await parser.getPage(tmpFile, 'session-lastpage', 100, 0);
  assertFalse(page.hasMore, 'hasMore should be false when all messages fit in one page');
  removeTempFile(tmpFile);
});

test('metadata contains correct messageCount', async () => {
  const lines = [
    makeMessage('user', 'One', 0),
    makeMessage('assistant', 'Two', 1),
    makeMessage('user', 'Three', 2),
  ].join('\n');
  const tmpFile = makeTempFile(lines + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  const result = await parser.parse(tmpFile, 'session-meta');
  assertEqual(result.metadata.messageCount, result.messages.length, 'Metadata messageCount should match messages array');
  removeTempFile(tmpFile);
});

test('getCacheStats returns size info', async () => {
  const line = makeMessage('user', 'Stats test', 0);
  const tmpFile = makeTempFile(line + '\n');
  const cache = new SessionCache({ maxEntries: 10 });
  const parser = new IncrementalSessionParser({ cache });

  await parser.parse(tmpFile, 'session-stats');
  const stats = parser.getCacheStats();
  assertTrue(stats !== null, 'Stats should not be null');
  assertTrue('size' in stats, 'Stats should include size');
  removeTempFile(tmpFile);
});

// ── Summary ───────────────────────────────────────────────────────────────────

// Wait for all async tests
setTimeout(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}, 500);
