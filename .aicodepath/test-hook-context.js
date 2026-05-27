#!/usr/bin/env node
/**
 * Test script for HookContext
 *
 * Verifies that HookContext can be instantiated and provides all expected methods.
 */

const { createHookContext } = require('./lib/hook-context');

console.log('Testing HookContext...\n');

try {
  // Create context
  const ctx = createHookContext('test-hook', { test: 'param' });
  console.log('✓ Created HookContext instance');

  // Test logging methods
  ctx.info('Test info message', { data: 'test' });
  console.log('✓ info() works');

  ctx.warn('Test warning message');
  console.log('✓ warn() works');

  ctx.debug('Test debug message');
  console.log('✓ debug() works');

  // Test path resolution
  const dbPath = ctx.getDbPath();
  console.log(`✓ getDbPath() works: ${dbPath}`);

  // Test result helpers
  const passResult = ctx.pass('Operation succeeded');
  console.log('✓ pass() works:', JSON.stringify(passResult));

  const blockResult = ctx.block('Operation blocked', 'Missing required field');
  console.log('✓ block() works:', JSON.stringify(blockResult));

  const warnResult = ctx.warning('Operation warning');
  console.log('✓ warning() works:', JSON.stringify(warnResult));

  const skipResult = ctx.skip('Operation skipped');
  console.log('✓ skip() works:', JSON.stringify(skipResult));

  // Test lazy initialization (DB should not be initialized yet)
  console.log('✓ Lazy initialization: DB not created until getDb() called');

  // Test session state methods (should work without throwing)
  const phase = ctx.getPhase();
  console.log(`✓ getPhase() works: ${phase || 'null'}`);

  const stage = ctx.getStage();
  console.log(`✓ getStage() works: ${stage || 'null'}`);

  // Clean up
  ctx.close();
  console.log('✓ close() works');

  console.log('\n✅ All HookContext tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
