/**
 * Tests for ConversationSearcher
 * Feature P3.1: Cross-Conversation Search
 *
 * Uses in-memory SQLite (no disk I/O).
 * Covers: FTS5 query building, regex search, filters, match highlighting,
 * search history, suggestions, stats, edge cases.
 */

'use strict';

const Database = require('better-sqlite3');

// ── Simple test harness ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
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

// ── Test DB setup ────────────────────────────────────────────────────────────

function buildTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');

  // Create base tables (subset of migration 013)
  db.exec(`
    CREATE TABLE ai_sessions (
      id TEXT PRIMARY KEY,
      adapter_id TEXT NOT NULL,
      name TEXT,
      slug TEXT,
      created_at DATETIME,
      updated_at DATETIME,
      duration_seconds INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0.0,
      message_count INTEGER DEFAULT 0,
      file_path TEXT,
      worktree_name TEXT,
      worktree_path TEXT
    );

    CREATE TABLE ai_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT,
      timestamp DATETIME,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      line_number INTEGER
    );

    CREATE TABLE ai_tool_uses (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      tool_result TEXT,
      status TEXT,
      error_message TEXT
    );

    -- FTS5 virtual tables (from migration 014)
    CREATE VIRTUAL TABLE ai_messages_fts USING fts5(
      content,
      role,
      model,
      session_id UNINDEXED,
      content=ai_messages,
      content_rowid=rowid,
      tokenize='porter unicode61 remove_diacritics 1'
    );

    CREATE TABLE ai_search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      use_regex BOOLEAN DEFAULT 0,
      case_sensitive BOOLEAN DEFAULT 0,
      adapter_filter TEXT,
      result_count INTEGER DEFAULT 0,
      execution_time_ms INTEGER,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- FTS sync triggers
    CREATE TRIGGER ai_messages_ai AFTER INSERT ON ai_messages BEGIN
      INSERT INTO ai_messages_fts(rowid, content, role, model, session_id)
      VALUES (NEW.rowid, NEW.content, NEW.role, NEW.model, NEW.session_id);
    END;
  `);

  // Seed sessions
  const insertSession = db.prepare(`
    INSERT INTO ai_sessions (id, adapter_id, name, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertSession.run('s1', 'claude-code', 'Auth Feature Session', 'auth-feature-session', '2026-01-01', '2026-01-02');
  insertSession.run('s2', 'cursor', 'Database Refactor', 'database-refactor', '2026-01-03', '2026-01-04');

  // Seed messages
  const insertMsg = db.prepare(`
    INSERT INTO ai_messages (id, session_id, role, content, timestamp, model, line_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertMsg.run('m1', 's1', 'user', 'How do I implement JWT authentication?', '2026-01-01T10:00:00Z', 'claude-sonnet', 0);
  insertMsg.run('m2', 's1', 'assistant', 'Here is how to implement JWT: use jsonwebtoken library to sign tokens with a secret key. Tokens expire after 24 hours.', '2026-01-01T10:01:00Z', 'claude-sonnet', 1);
  insertMsg.run('m3', 's2', 'user', 'Refactor the database connection pool', '2026-01-03T09:00:00Z', 'cursor-fast', 0);
  insertMsg.run('m4', 's2', 'assistant', 'Use a connection pool with max 10 connections. Each database query should use await pool.query().', '2026-01-03T09:01:00Z', 'cursor-fast', 1);
  insertMsg.run('m5', 's1', 'user', 'What about refresh tokens?', '2026-01-01T11:00:00Z', 'claude-sonnet', 2);
  insertMsg.run('m6', 's1', 'assistant', 'Refresh tokens are long-lived tokens used to obtain new access tokens without re-authentication.', '2026-01-01T11:01:00Z', 'claude-sonnet', 3);

  return db;
}

// ── Inline ConversationSearcher with injected DB ─────────────────────────────
// We test the core logic by importing the module but overriding the DB

const ConversationSearcher = require('../lib/conversation-searcher');

// Patch: override _initDb to use our test DB
function makeTestSearcher(db) {
  const searcher = new ConversationSearcher('/tmp/test.db');
  searcher.db = db; // inject test db
  searcher._initDb = () => {}; // no-op
  return searcher;
}

// ── Tests: _buildFTSQuery ────────────────────────────────────────────────────

console.log('\n_buildFTSQuery():');

test('single word uses prefix match', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const q = s._buildFTSQuery('auth');
  assertTrue(q.includes('auth'), 'Should contain term');
  assertTrue(q.endsWith('*'), 'Should end with prefix wildcard');
});

test('multi-word uses phrase search', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const q = s._buildFTSQuery('jwt authentication');
  assertTrue(q.startsWith('"'), 'Phrase search starts with quote');
  assertTrue(q.endsWith('"'), 'Phrase search ends with quote');
});

test('escapes FTS5 special chars', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const q = s._buildFTSQuery('foo:bar');
  assertTrue(q.includes('\\:'), 'Colon should be escaped');
});

// ── Tests: _extractRegexMatches ──────────────────────────────────────────────

console.log('\n_extractRegexMatches():');

test('finds single match on one line', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const regex = /jwt/gi;
  const matches = s._extractRegexMatches('Use JWT authentication here', regex);
  assertEqual(matches.length, 1, 'Should find one match');
  assertEqual(matches[0].lineNo, 1, 'Line number should be 1');
  assertEqual(matches[0].colStart, 4, 'Column should be 4');
});

test('finds multiple matches on same line', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const regex = /token/gi;
  const matches = s._extractRegexMatches('Token and token are both tokens', regex);
  assertTrue(matches.length >= 2, 'Should find at least 2 matches');
});

test('reports correct line numbers across newlines', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const regex = /found/gi;
  const matches = s._extractRegexMatches('line one\nfound here\nline three', regex);
  assertEqual(matches.length, 1);
  assertEqual(matches[0].lineNo, 2, 'Match on second line');
});

test('returns empty array for no match', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const regex = /xyz123/gi;
  const matches = s._extractRegexMatches('nothing interesting here', regex);
  assertEqual(matches.length, 0);
});

test('handles zero-width match without infinite loop', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const regex = /a*/gi;
  let threw = false;
  try {
    s._extractRegexMatches('abc', regex);
  } catch {
    threw = true;
  }
  assertFalse(threw, 'Should not throw on zero-width match');
});

// ── Tests: _extractFTSMatches ────────────────────────────────────────────────

console.log('\n_extractFTSMatches():');

test('finds case-insensitive substring match', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const matches = s._extractFTSMatches('JWT tokens are cool', 'jwt');
  assertEqual(matches.length, 1);
  assertEqual(matches[0].colStart, 0);
});

test('finds multiple occurrences on same line', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const matches = s._extractFTSMatches('test this and test that', 'test');
  assertEqual(matches.length, 2);
});

test('returns empty for no match', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const matches = s._extractFTSMatches('nothing here', 'xyz');
  assertEqual(matches.length, 0);
});

// ── Tests: _highlightMatch ───────────────────────────────────────────────────

console.log('\n_highlightMatch():');

test('wraps match in bold markers', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const result = s._highlightMatch('foo bar baz', 4, 7);
  assertEqual(result, 'foo **bar** baz');
});

test('handles match at start of string', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const result = s._highlightMatch('hello world', 0, 5);
  assertEqual(result, '**hello** world');
});

test('handles match at end of string', () => {
  const s = new ConversationSearcher('/tmp/test.db');
  const result = s._highlightMatch('hello world', 6, 11);
  assertEqual(result, 'hello **world**');
});

// ── Tests: FTS search against live DB ───────────────────────────────────────

console.log('\nFTS search (live DB):');

test('FTS search finds message containing term', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = searcher._ftsSearch({ query: 'JWT', maxResults: 10 });
  assertTrue(results.length > 0, 'Should find JWT results');
  const ids = results.map(r => r.messageID);
  assertTrue(ids.includes('m2') || ids.includes('m1'), 'Should include messages with JWT');
  db.close();
});

test('FTS search returns empty for unknown term', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = searcher._ftsSearch({ query: 'xyzzy_nonexistent_term', maxResults: 10 });
  assertEqual(results.length, 0);
  db.close();
});

test('FTS search respects roleFilter', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = searcher._ftsSearch({ query: 'jwt', maxResults: 10, roleFilter: 'user' });
  for (const r of results) {
    assertEqual(r.role, 'user', 'All results should be from user role');
  }
  db.close();
});

test('FTS search respects sessionID filter', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = searcher._ftsSearch({ query: 'database', maxResults: 10, sessionID: 's2' });
  for (const r of results) {
    assertEqual(r.sessionID, 's2', 'All results should be from session s2');
  }
  db.close();
});

test('FTS search respects maxResults', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = searcher._ftsSearch({ query: 'token', maxResults: 2 });
  assertTrue(results.length <= 2, 'Should respect maxResults cap');
  db.close();
});

// ── Tests: Regex search ───────────────────────────────────────────────────────

console.log('\nRegex search (live DB):');

test('regex search with simple pattern finds results', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = searcher._regexSearch({ query: 'JWT', caseSensitive: false, maxResults: 10 });
  assertTrue(results.length > 0, 'Should find JWT results');
  db.close();
});

test('regex search with anchored pattern', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = searcher._regexSearch({ query: '^How', caseSensitive: false, maxResults: 10 });
  // Message m1 starts with "How do I..."
  assertTrue(results.length > 0, 'Should find messages starting with "How"');
  db.close();
});

test('regex search throws on invalid pattern', () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  let threw = false;
  try {
    searcher._regexSearch({ query: '[invalid', caseSensitive: false, maxResults: 10 });
  } catch {
    threw = true;
  }
  assertTrue(threw, 'Should throw on invalid regex');
  db.close();
});

test('regex search empty query returns empty', async () => {
  const db = buildTestDb();
  const searcher = makeTestSearcher(db);
  const results = await searcher.search({ query: '', useRegex: false, maxResults: 10 });
  assertEqual(results.length, 0);
  db.close();
});

// ── Tests: Search history ─────────────────────────────────────────────────────

console.log('\nSearch history:');

test('getSearchSuggestions returns recent queries', () => {
  const db = buildTestDb();
  db.prepare(`
    INSERT INTO ai_search_history (query, result_count) VALUES ('jwt tokens', 5), ('database pool', 3)
  `).run();
  const searcher = makeTestSearcher(db);
  const suggestions = searcher.getSearchSuggestions(10);
  assertTrue(suggestions.length >= 2, 'Should return suggestions');
  assertTrue(suggestions.includes('jwt tokens') || suggestions.includes('database pool'), 'Should include inserted queries');
  db.close();
});

test('getSearchSuggestions filters zero-result queries', () => {
  const db = buildTestDb();
  db.prepare(`INSERT INTO ai_search_history (query, result_count) VALUES ('dead end', 0)`).run();
  const searcher = makeTestSearcher(db);
  const suggestions = searcher.getSearchSuggestions(10);
  assertFalse(suggestions.includes('dead end'), 'Zero-result queries should not be suggested');
  db.close();
});

test('getSearchStats returns correct totals', () => {
  const db = buildTestDb();
  db.prepare(`INSERT INTO ai_search_history (query, result_count, use_regex, execution_time_ms) VALUES
    ('query1', 5, 0, 10),
    ('query2', 0, 1, 20)
  `).run();
  const searcher = makeTestSearcher(db);
  const stats = searcher.getSearchStats();
  assertTrue(stats.total_searches >= 2, 'Should count searches');
  assertTrue(stats.regex_searches >= 1, 'Should count regex searches');
  assertTrue(stats.zero_result_searches >= 1, 'Should count zero-result searches');
  db.close();
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
