'use strict';
/**
 * Test: TieredWatcher
 * Tests hot/cold tier management, promotions, access notifications, stats, cleanup.
 * Does NOT depend on chokidar.
 */
const { TieredWatcher, getTieredWatcher } = require('../lib/tiered-watcher');
const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' };
let passed = 0, failed = 0;
const watchers = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(colors.green + '\u2713' + colors.reset + ' ' + name);
  } catch (error) {
    failed++;
    console.log(colors.red + '\u2717' + colors.reset + ' ' + name);
    console.log('  ' + colors.yellow + error.message + colors.reset);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(colors.green + '\u2713' + colors.reset + ' ' + name);
  } catch (error) {
    failed++;
    console.log(colors.red + '\u2717' + colors.reset + ' ' + name);
    console.log('  ' + colors.yellow + error.message + colors.reset);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || '') + ' | Expected: ' + JSON.stringify(expected) + ' Got: ' + JSON.stringify(actual));
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error((msg || '') + ' | Expected truthy');
}

function makeWatcher(opts) {
  const w = new TieredWatcher(opts);
  watchers.push(w);
  return w;
}

function writeTmp(name, content) {
  const p = path.join(os.tmpdir(), name);
  fs.writeFileSync(p, content);
  return p;
}

// ============================================================
// Sync tests
// ============================================================

test('1. TieredWatcher constructs with default options', () => {
  const w = makeWatcher({ pollingInterval: 99999 });
  assertEqual(w.options.maxHotPaths, 50, 'maxHotPaths');
  assertEqual(w.options.hotTierTimeout, 600000, 'hotTierTimeout');
  assertEqual(w.options.promoteOnAccess, true, 'promoteOnAccess');
  assertTrue(w.hotPaths instanceof Map, 'hotPaths is Map');
  assertTrue(w.coldPaths instanceof Map, 'coldPaths is Map');
  assertTrue(w.pollingTimer !== null, 'pollingTimer set');
});

test('5. promoteToHot returns already_hot when path in hot', () => {
  const w = makeWatcher({ maxHotPaths: 5, pollingInterval: 99999 });
  const p = '/tmp/tw-sync5.txt';
  w.hotPaths.set(p, { addedAt: Date.now(), lastAccess: Date.now(), stats: null });
  const result = w.promoteToHot(p);
  assertEqual(result.tier, 'hot', 'tier');
  assertEqual(result.success, true, 'success');
  assertEqual(result.reason, 'already_hot', 'reason');
});

test('6. promoteToHot returns hot_tier_full at capacity', () => {
  const w = makeWatcher({ maxHotPaths: 0, pollingInterval: 99999 });
  const result = w.promoteToHot('/tmp/tw-sync6.txt');
  assertEqual(result.tier, 'cold', 'tier');
  assertEqual(result.success, false, 'success');
  assertEqual(result.reason, 'hot_tier_full', 'reason');
});

test('10. notifyAccess updates lastAccess for hot path', () => {
  const w = makeWatcher({ pollingInterval: 99999 });
  const p = '/tmp/tw-sync10.txt';
  const initialTime = Date.now() - 5000;
  w.hotPaths.set(p, { addedAt: initialTime, lastAccess: initialTime, stats: null });
  w.notifyAccess(p);
  const entry = w.hotPaths.get(p);
  assertTrue(entry.lastAccess > initialTime, 'lastAccess updated');
});

test('14. getTieredWatcher() returns singleton', () => {
  const modPath = require.resolve('../lib/tiered-watcher');
  delete require.cache[modPath];
  const mod = require('../lib/tiered-watcher');
  const a = mod.getTieredWatcher({ pollingInterval: 99999 });
  const b = mod.getTieredWatcher({ pollingInterval: 12345 });
  assertTrue(a === b, 'same instance');
  watchers.push(a);
});

// ============================================================
// Async tests runner
// ============================================================
async function main() {
  await testAsync('2. addPath auto assigns to cold tier when hot is full (maxHotPaths:0)', async () => {
    const w = makeWatcher({ maxHotPaths: 0, pollingInterval: 99999 });
    const p = writeTmp('tw-2.txt', 'hello');
    await w.addPath(p);
    const stats = w.getStats();
    assertEqual(stats.hot.count, 0, 'hot count');
    assertEqual(stats.cold.count, 1, 'cold count');
  });

  await testAsync('3. addPath auto: path tracked in some tier (chokidar absent => cold)', async () => {
    const w = makeWatcher({ maxHotPaths: 5, pollingInterval: 99999 });
    const p = writeTmp('tw-3.txt', 'hi');
    await w.addPath(p, 'auto');
    const stats = w.getStats();
    assertEqual(stats.hot.count + stats.cold.count, 1, 'path tracked in some tier');
  });

  await testAsync('4. addPath with explicit cold tier', async () => {
    const w = makeWatcher({ maxHotPaths: 10, pollingInterval: 99999 });
    const p = writeTmp('tw-4.txt', 'cold');
    await w.addPath(p, 'cold');
    const stats = w.getStats();
    assertEqual(stats.cold.count, 1, 'cold count');
    assertEqual(stats.hot.count, 0, 'hot count');
  });

  await testAsync('7. promoteToCold moves from hot to cold', async () => {
    const w = makeWatcher({ maxHotPaths: 5, pollingInterval: 99999 });
    const p = writeTmp('tw-7.txt', 'data');
    w.hotPaths.set(p, { addedAt: Date.now(), lastAccess: Date.now(), stats: null });
    const result = await w.promoteToCold(p);
    assertEqual(result.tier, 'cold', 'result tier');
    assertEqual(result.success, true, 'result success');
    assertEqual(w.hotPaths.has(p), false, 'removed from hotPaths');
    assertEqual(w.coldPaths.has(p), true, 'added to coldPaths');
  });

  await testAsync('8. removePath removes from cold tier', async () => {
    const w = makeWatcher({ maxHotPaths: 0, pollingInterval: 99999 });
    const p = writeTmp('tw-8.txt', 'remove-me');
    await w.addPath(p, 'cold');
    assertEqual(w.coldPaths.has(p), true, 'in cold before remove');
    w.removePath(p);
    assertEqual(w.coldPaths.has(p), false, 'removed from cold');
  });

  await testAsync('9. notifyAccess with promoteOnAccess does not throw', async () => {
    const w = makeWatcher({ maxHotPaths: 5, pollingInterval: 99999 });
    const p = writeTmp('tw-9.txt', 'notify');
    w.coldPaths.set(p, { addedAt: Date.now(), lastPoll: Date.now(), stats: null });
    w.notifyAccess(p);
    assertTrue(true, 'no error thrown');
  });

  await testAsync('11. getStats returns correct counts for hot and cold', async () => {
    const w = makeWatcher({ maxHotPaths: 10, pollingInterval: 99999 });
    const p1 = writeTmp('tw-11a.txt', 'a');
    const p2 = writeTmp('tw-11b.txt', 'b');
    await w.addPath(p1, 'cold');
    await w.addPath(p2, 'cold');
    w.hotPaths.set('/tmp/tw-11hot.txt', { addedAt: Date.now(), lastAccess: Date.now(), stats: null });
    const stats = w.getStats();
    assertEqual(stats.hot.count, 1, 'hot count');
    assertEqual(stats.hot.max, 10, 'hot max');
    assertEqual(stats.cold.count, 2, 'cold count');
    assertTrue(Array.isArray(stats.hot.paths), 'hot.paths is array');
    assertTrue(Array.isArray(stats.cold.paths), 'cold.paths is array');
  });

  await testAsync('12. _checkHotTierDemotion demotes idle hot paths (hotTierTimeout:0)', async () => {
    const w = makeWatcher({ hotTierTimeout: 0, pollingInterval: 99999, maxHotPaths: 5 });
    const p = '/tmp/tw-12.txt';
    const oldTime = Date.now() - 1;
    w.hotPaths.set(p, { addedAt: oldTime, lastAccess: oldTime, stats: null });
    w._checkHotTierDemotion();
    await new Promise(r => setTimeout(r, 50));
    assertEqual(w.hotPaths.has(p), false, 'path removed from hot');
    assertEqual(w.coldPaths.has(p), true, 'path moved to cold');
  });

  await testAsync('13. close() clears all state', async () => {
    const w = new TieredWatcher({ pollingInterval: 99999 });
    w.hotPaths.set('/tmp/a13', { addedAt: Date.now(), lastAccess: Date.now(), stats: null });
    w.coldPaths.set('/tmp/b13', { addedAt: Date.now(), lastPoll: Date.now(), stats: null });
    await w.close();
    assertEqual(w.hotPaths.size, 0, 'hotPaths cleared');
    assertEqual(w.coldPaths.size, 0, 'coldPaths cleared');
    assertEqual(w.pollingTimer, null, 'pollingTimer null');
    assertEqual(w.hotWatcher, null, 'hotWatcher null');
  });

  await testAsync('15. cold polling detects file changes via mtime', async () => {
    const w = makeWatcher({ maxHotPaths: 0, pollingInterval: 99999 });
    const p = writeTmp('tw-15.txt', 'original');
    await w.addPath(p, 'cold');
    const events = [];
    w.on('changed', (e) => events.push(e));
    await new Promise(r => setTimeout(r, 10));
    fs.writeFileSync(p, 'modified');
    await w._pollColdPaths();
    assertEqual(events.length, 1, 'one changed event');
    assertEqual(events[0].path, p, 'event path');
    assertEqual(events[0].tier, 'cold', 'event tier');
  });

  await testAsync('16. cold polling emits removed for deleted file', async () => {
    const w = makeWatcher({ maxHotPaths: 0, pollingInterval: 99999 });
    const p = writeTmp('tw-16.txt', 'to-delete');
    await w.addPath(p, 'cold');
    const events = [];
    w.on('removed', (e) => events.push(e));
    fs.unlinkSync(p);
    await w._pollColdPaths();
    assertEqual(events.length, 1, 'one removed event');
    assertEqual(events[0].path, p, 'event path');
    assertEqual(w.coldPaths.has(p), false, 'removed from coldPaths');
  });

  // Close all watchers
  await Promise.all(watchers.map(w => w.close().catch(() => {})));

  const total = passed + failed;
  console.log('');
  const failColor = failed > 0 ? colors.red : '';
  console.log(total + ' tests: ' + colors.green + passed + ' passed' + colors.reset + ', ' + failColor + failed + ' failed' + colors.reset);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });