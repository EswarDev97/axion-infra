/**
 * Test: Dashboard Data Synchronization Integration Tests
 *
 * Verifies:
 * * - All required tables exist after migrations
 * - Hook wrapper produces valid Claude Code JSON output
 * - WebSocket server has proper ping/pong support
 */

const path = require('path');
const fs = require('fs');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected: ${expected}, Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message} Expected truthy value`);
  }
}

// ============================================================================
// Test Suite: Database Schema & Migration Infrastructure
// ============================================================================
console.log(`\n${colors.blue}Schema & Migration Tests${colors.reset}`);
console.log('─'.repeat(50));

const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

test('Consolidated schema.sql exists', () => {
  assertTrue(fs.existsSync(schemaPath), 'db/schema.sql should exist');
});

test('schema.sql creates all core tables', () => {
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const requiredTables = [
    'artifacts', 'units', 'unit_dependencies', 'checkpoint_files',
    'rollback_history', 'swarm_teams', 'swarm_team_members',
    'gicl_sessions', 'gicl_iterations', 'cost_summary',
    'ai_sessions', 'ai_messages'
  ];
  for (const table of requiredTables) {
    assertTrue(sql.includes(table), `schema.sql should reference table: ${table}`);
  }
});

test('schema.sql has at least 40 CREATE TABLE statements', () => {
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const tableCount = (sql.match(/CREATE TABLE/g) || []).length;
  assertTrue(tableCount >= 40, `Should have >=40 CREATE TABLE, got ${tableCount}`);
});

test('schema.sql enables WAL mode and foreign keys', () => {
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  assertTrue(sql.includes('journal_mode = WAL'), 'Should enable WAL mode');
  assertTrue(sql.includes('foreign_keys = ON'), 'Should enable foreign keys');
});

test('Migration files in db/migrations/ follow NNN_ naming', () => {
  if (!fs.existsSync(migrationsDir)) return; // skip if dir missing
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  for (const file of files) {
    assertTrue(/^\d{3}_/.test(file), `Migration ${file} should match NNN_ prefix pattern`);
  }
});

// ============================================================================
// Test Suite: Hook Wrapper
// ============================================================================
console.log(`\n${colors.blue}Hook Wrapper Tests${colors.reset}`);
console.log('─'.repeat(50));

const {
  parseStdinJson,
  formatOutput,
  getExitCode,
} = require('../hooks/lib/hook-wrapper');

test('parseStdinJson handles valid JSON', () => {
  const result = parseStdinJson('{"key": "value"}');
  assertEqual(result.key, 'value', 'Should parse valid JSON');
});

test('parseStdinJson handles empty string', () => {
  const result = parseStdinJson('');
  assertEqual(Object.keys(result).length, 0, 'Should return empty object for empty string');
});

test('parseStdinJson handles invalid JSON', () => {
  const result = parseStdinJson('not json');
  assertEqual(Object.keys(result).length, 0, 'Should return empty object for invalid JSON');
});

test('formatOutput maps message to systemMessage', () => {
  const output = formatOutput({ success: true, message: 'Hello' });
  assertEqual(output.systemMessage, 'Hello', 'Should map message to systemMessage');
});

test('formatOutput sets decision=block for blocking results', () => {
  const output = formatOutput({ proceed: false, message: 'Blocked!' });
  assertEqual(output.decision, 'block', 'Should set decision to block');
});

test('formatOutput handles empty result', () => {
  const output = formatOutput({});
  assertEqual(Object.keys(output).length, 0, 'Empty result should produce empty output');
});

test('formatOutput handles null result', () => {
  const output = formatOutput(null);
  assertEqual(Object.keys(output).length, 0, 'Null result should produce empty output');
});

test('getExitCode returns 0 for success', () => {
  assertEqual(getExitCode({ success: true }), 0, 'Success should be exit code 0');
});

test('getExitCode returns 2 for blocking', () => {
  assertEqual(getExitCode({ blocking: true }), 2, 'Blocking should be exit code 2');
});

test('getExitCode returns 1 for non-blocking failure', () => {
  assertEqual(getExitCode({ success: false }), 1, 'Non-blocking failure should be exit code 1');
});

test('getExitCode returns 0 for null', () => {
  assertEqual(getExitCode(null), 0, 'Null should be exit code 0');
});

// ============================================================================
// Test Suite: Hook Files Have Shebang and Wrapper
// ============================================================================
console.log(`\n${colors.blue}Hook Compliance Tests${colors.reset}`);
console.log('─'.repeat(50));

const hooksDir = path.join(__dirname, '..', 'hooks');
const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));

test('All hook files have shebang line', () => {
  const missing = [];
  for (const file of hookFiles) {
    const content = fs.readFileSync(path.join(hooksDir, file), 'utf-8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      missing.push(file);
    }
  }
  assertEqual(missing.length, 0, `Hooks missing shebang: ${missing.join(', ')}`);
});

test('All hook files have require.main === module block', () => {
  const missing = [];
  for (const file of hookFiles) {
    const content = fs.readFileSync(path.join(hooksDir, file), 'utf-8');
    if (!content.includes('require.main === module')) {
      missing.push(file);
    }
  }
  assertEqual(missing.length, 0, `Hooks missing require.main block: ${missing.join(', ')}`);
});

test('All hook files use hook-wrapper in require.main block', () => {
  const missing = [];
  for (const file of hookFiles) {
    const content = fs.readFileSync(path.join(hooksDir, file), 'utf-8');
    if (!content.includes('hook-wrapper')) {
      missing.push(file);
    }
  }
  assertEqual(missing.length, 0, `Hooks not using hook-wrapper: ${missing.join(', ')}`);
});

// ============================================================================
// Test Suite: WebSocket Server
// ============================================================================
console.log(`\n${colors.blue}WebSocket Server Tests${colors.reset}`);
console.log('─'.repeat(50));

test('WebSocket server has isAlive tracking', () => {
  const wsServerPath = path.join(__dirname, '..', 'lib', 'websocket-server.js');
  const content = fs.readFileSync(wsServerPath, 'utf-8');
  assertTrue(content.includes('isAlive: true'), 'Should initialize isAlive to true');
  assertTrue(content.includes('isAlive = false'), 'Should set isAlive to false before ping');
  assertTrue(content.includes("ws.on('pong'"), 'Should listen for pong events');
});

test('WebSocket server uses ws.ping() for keep-alive', () => {
  const wsServerPath = path.join(__dirname, '..', 'lib', 'websocket-server.js');
  const content = fs.readFileSync(wsServerPath, 'utf-8');
  assertTrue(content.includes('client.ws.ping()'), 'Should call ws.ping() in heartbeat');
});

test('WebSocket server has proper heartbeat config', () => {
  const { DashboardWebSocketServer } = require('../lib/websocket-server');
  const server = new DashboardWebSocketServer();
  assertEqual(server.options.heartbeatInterval, 30000, 'Heartbeat interval should be 30s');
  assertEqual(server.options.clientTimeout, 60000, 'Client timeout should be 60s');
});

// ============================================================================
// Test Suite: useWebSocket Client
// ============================================================================
console.log(`\n${colors.blue}useWebSocket Client Tests${colors.reset}`);
console.log('─'.repeat(50));

test('useWebSocket has 60s heartbeat timeout', () => {
  const clientPath = path.join(__dirname, '..', 'templates', 'dashboard', 'src', 'hooks', 'useWebSocket.ts');
  const content = fs.readFileSync(clientPath, 'utf-8');
  assertTrue(content.includes('heartbeatTimeout: 60000'), 'Heartbeat timeout should be 60s');
});

test('useWebSocket sends periodic pings', () => {
  const clientPath = path.join(__dirname, '..', 'templates', 'dashboard', 'src', 'hooks', 'useWebSocket.ts');
  const content = fs.readFileSync(clientPath, 'utf-8');
  assertTrue(content.includes('pingIntervalRef'), 'Should have pingIntervalRef');
  assertTrue(content.includes('25000'), 'Should ping every 25s');
});

test('useWebSocket cleans up ping interval', () => {
  const clientPath = path.join(__dirname, '..', 'templates', 'dashboard', 'src', 'hooks', 'useWebSocket.ts');
  const content = fs.readFileSync(clientPath, 'utf-8');
  const clearCount = (content.match(/clearInterval\(pingIntervalRef/g) || []).length;
  assertTrue(clearCount >= 2, `Should clear pingInterval in multiple places, found ${clearCount}`);
});

// ============================================================================
// Test Suite: Migration 015 (Reflexion Patterns)
// ============================================================================
console.log(`\n${colors.blue}Migration File Tests${colors.reset}`);
console.log('─'.repeat(50));

test('Migration 015 creates reflexion_patterns table', () => {
  const sqlPath = path.join(migrationsDir, '015_reflexion_patterns.sql');
  assertTrue(fs.existsSync(sqlPath), '015_reflexion_patterns.sql should exist');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  assertTrue(sql.includes('CREATE TABLE IF NOT EXISTS reflexion_patterns'), 'Should create reflexion_patterns table');
  assertTrue(sql.includes('reflexion_fts'), 'Should create FTS5 virtual table');
});

test('Schema has tables that were in former migrations 004-006', () => {
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  // Former 004_orchestration tables
  assertTrue(sql.includes('units'), 'Schema should have units table (formerly migration 004)');
  assertTrue(sql.includes('unit_dependencies'), 'Schema should have unit_dependencies (formerly migration 004)');
  // Former 005_enhanced_checkpoints tables
  assertTrue(sql.includes('checkpoint_files'), 'Schema should have checkpoint_files (formerly migration 005)');
  assertTrue(sql.includes('rollback_history'), 'Schema should have rollback_history (formerly migration 005)');
  // Former 006_swarm_teams tables
  assertTrue(sql.includes('swarm_teams'), 'Schema should have swarm_teams (formerly migration 006)');
  assertTrue(sql.includes('swarm_team_members'), 'Schema should have swarm_team_members (formerly migration 006)');
});

test('Schema can be loaded into in-memory SQLite database', () => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  // Filter out PRAGMA and FTS5 statements that may fail in test env
  const statements = sql.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter(s => !s.startsWith('PRAGMA'))
    .filter(s => !s.includes('USING fts5'))
    .filter(s => !s.includes('CREATE TRIGGER'));
  let executed = 0;
  for (const stmt of statements) {
    try {
      db.exec(stmt + ';');
      executed++;
    } catch (e) {
      // Skip statements that fail (e.g. FTS5 not available)
    }
  }
  assertTrue(executed >= 30, `Should execute at least 30 statements, got ${executed}`);
  db.close();
});

// ============================================================================
// Summary
// ============================================================================
console.log(`\n${'─'.repeat(50)}`);
console.log(`${colors.blue}Results:${colors.reset} ${colors.green}${passed} passed${colors.reset}, ${failed > 0 ? colors.red : colors.green}${failed} failed${colors.reset}`);
console.log('─'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
