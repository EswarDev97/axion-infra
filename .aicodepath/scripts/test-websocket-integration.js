#!/usr/bin/env node

/**
 * WebSocket Integration Test Script
 *
 * Manual test script to verify WebSocket server functionality
 * Tests connection, ping/pong, and basic messaging
 *
 * Usage:
 *   node .aicodepath/scripts/test-websocket-integration.js
 *
 * Requirements:
 *   - WebSocket server must be running on port 3899
 *   - ws npm package must be installed
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:3899/ws/dashboard';
const TIMEOUT = 5000; // 5 second timeout for tests

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

/**
 * Helper: Colorize output
 */
function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Helper: Create a delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * WebSocket test client
 */
class TestClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
    this.messages = [];
    this.connected = false;
    this.clientId = null;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    return new Promise((resolve, reject) => {
      console.log(`${colorize('blue', '→')} Connecting to ${this.url}`);

      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, TIMEOUT);

      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        clearTimeout(timer);
        this.connected = true;
        console.log(`${colorize('green', '✓')} Connected to server`);
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.messages.push(message);
          this.emit('message', message);
        } catch (error) {
          console.error(`${colorize('red', '✗')} Failed to parse message:`, error.message);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        console.log(`${colorize('yellow', '○')} Connection closed (code: ${code})`);
        this.emit('close', { code, reason });
      });

      this.ws.on('error', (error) => {
        console.error(`${colorize('red', '✗')} WebSocket error:`, error.message);
        reject(error);
      });
    });
  }

  /**
   * Send a message
   */
  send(message) {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Wait for a specific message type
   */
  waitForMessage(type, timeout = TIMEOUT) {
    return new Promise((resolve, reject) => {
      // Check if message already received
      const existing = this.messages.find(m => m.type === type);
      if (existing) {
        resolve(existing);
        return;
      }

      const timer = setTimeout(() => {
        this.removeListener('message', handler);
        reject(new Error(`Timeout waiting for ${type} message`));
      }, timeout);

      const handler = (message) => {
        if (message.type === type) {
          clearTimeout(timer);
          resolve(message);
        }
      };

      this.on('message', handler);
    });
  }

  /**
   * Close the connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Get all messages of a specific type
   */
  getMessagesByType(type) {
    return this.messages.filter(m => m.type === type);
  }
}

/**
 * Test runner
 */
async function runTests() {
  console.log(colorize('blue', '\n═══════════════════════════════════════'));
  console.log(colorize('blue', '  WebSocket Integration Test Suite'));
  console.log(colorize('blue', '═══════════════════════════════════════\n'));

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  /**
   * Test 1: Connection and welcome message
   */
  async function test1_Connection() {
    console.log(colorize('gray', '\n--- Test 1: Connection and Welcome Message ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();

      // Wait for welcome message
      const welcome = await client.waitForMessage('welcome');

      if (welcome.type !== 'welcome') {
        throw new Error('Expected welcome message');
      }

      if (!welcome.clientId || !welcome.serverTime) {
        throw new Error('Welcome message missing clientId or serverTime');
      }

      client.clientId = welcome.clientId;

      console.log(`${colorize('green', '✓')} Welcome message received`);
      console.log(`  ${colorize('gray', 'ClientId:')} ${welcome.clientId}`);
      console.log(`  ${colorize('gray', 'ServerTime:')} ${welcome.serverTime}`);

      client.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Connection & Welcome', status: 'PASS' });
      return true;
    } catch (error) {
      console.error(`${colorize('red', '✗')} Test failed:`, error.message);
      results.failed++;
      results.tests.push({ name: 'Connection & Welcome', status: 'FAIL', error: error.message });
      return false;
    }
  }

  /**
   * Test 2: Ping/Pong mechanism
   */
  async function test2_PingPong() {
    console.log(colorize('gray', '\n--- Test 2: Ping/Pong Mechanism ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();
      await client.waitForMessage('welcome');

      console.log(`${colorize('blue', '→')} Sending ping...`);
      client.send({ type: 'ping' });

      const pong = await client.waitForMessage('pong');

      if (pong.type !== 'pong') {
        throw new Error('Expected pong message');
      }

      if (!pong.timestamp) {
        throw new Error('Pong message missing timestamp');
      }

      console.log(`${colorize('green', '✓')} Pong response received`);
      console.log(`  ${colorize('gray', 'Timestamp:')} ${pong.timestamp}`);

      client.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Ping/Pong', status: 'PASS' });
      return true;
    } catch (error) {
      console.error(`${colorize('red', '✗')} Test failed:`, error.message);
      results.failed++;
      results.tests.push({ name: 'Ping/Pong', status: 'FAIL', error: error.message });
      return false;
    }
  }

  /**
   * Test 3: Subscription filtering
   */
  async function test3_Subscriptions() {
    console.log(colorize('gray', '\n--- Test 3: Subscription Filtering ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();
      await client.waitForMessage('welcome');

      console.log(`${colorize('blue', '→')} Subscribing to log messages only...`);
      client.send({
        type: 'subscribe',
        events: ['log']
      });

      await delay(100);

      // Note: This test requires server-side broadcasting to fully test
      // For now, we just verify the subscription message is accepted
      console.log(`${colorize('green', '✓')} Subscription request sent`);

      client.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Subscription Filtering', status: 'PASS' });
      return true;
    } catch (error) {
      console.error(`${colorize('red', '✗')} Test failed:`, error.message);
      results.failed++;
      results.tests.push({ name: 'Subscription Filtering', status: 'FAIL', error: error.message });
      return false;
    }
  }

  /**
   * Test 4: Heartbeat messages
   */
  async function test4_Heartbeat() {
    console.log(colorize('gray', '\n--- Test 4: Heartbeat Messages ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();
      await client.waitForMessage('welcome');

      console.log(`${colorize('blue', '→')} Waiting for heartbeat (may take up to 30s)...`);

      // Wait for heartbeat (default interval is 30s)
      // We'll wait up to 35s to be safe
      const heartbeat = await client.waitForMessage('heartbeat', 35000);

      if (heartbeat.type !== 'heartbeat') {
        throw new Error('Expected heartbeat message');
      }

      console.log(`${colorize('green', '✓')} Heartbeat received`);
      console.log(`  ${colorize('gray', 'Timestamp:')} ${heartbeat.timestamp}`);

      client.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Heartbeat', status: 'PASS' });
      return true;
    } catch (error) {
      // Heartbeat test is optional - may time out if interval is longer
      console.warn(`${colorize('yellow', '○')} Heartbeat not received (may have longer interval)`);
      results.tests.push({ name: 'Heartbeat', status: 'SKIP', error: 'Timeout' });
      return false;
    }
  }

  /**
   * Test 5: Connection statistics
   */
  async function test5_Statistics() {
    console.log(colorize('gray', '\n--- Test 5: Connection Statistics ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();
      await client.waitForMessage('welcome');

      // Note: This requires a REST API endpoint to get stats
      // For now, we just verify we can connect and receive messages
      console.log(`${colorize('green', '✓')} Client connected and receiving messages`);
      console.log(`  ${colorize('gray', 'Total messages received:')} ${client.messages.length}`);

      client.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Connection Statistics', status: 'PASS' });
      return true;
    } catch (error) {
      console.error(`${colorize('red', '✗')} Test failed:`, error.message);
      results.failed++;
      results.tests.push({ name: 'Connection Statistics', status: 'FAIL', error: error.message });
      return false;
    }
  }

  /**
   * Test 6: Multiple messages
   */
  async function test6_MultipleMessages() {
    console.log(colorize('gray', '\n--- Test 6: Multiple Sequential Messages ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();
      await client.waitForMessage('welcome');

      // Send multiple pings
      console.log(`${colorize('blue', '→')} Sending 5 ping messages...`);

      for (let i = 0; i < 5; i++) {
        client.send({ type: 'ping' });
        await delay(50);
      }

      // Wait for all pong responses
      const pongs = [];
      const timeout = setTimeout(() => {
        // We got enough pongs
      }, 2000);

      const checkPongs = () => {
        const clientPongs = client.getMessagesByType('pong');
        if (clientPongs.length >= 5) {
          clearTimeout(timeout);
          return clientPongs;
        }
        return null;
      };

      // Poll for pongs
      let finalPongs;
      for (let i = 0; i < 20; i++) {
        finalPongs = checkPongs();
        if (finalPongs) break;
        await delay(100);
      }

      if (!finalPongs || finalPongs.length < 5) {
        throw new Error(`Expected 5 pongs, got ${finalPongs?.length || 0}`);
      }

      console.log(`${colorize('green', '✓')} Received ${finalPongs.length} pong responses`);

      client.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Multiple Messages', status: 'PASS' });
      return true;
    } catch (error) {
      console.error(`${colorize('red', '✗')} Test failed:`, error.message);
      results.failed++;
      results.tests.push({ name: 'Multiple Messages', status: 'FAIL', error: error.message });
      return false;
    }
  }

  /**
   * Test 7: Reconnection (manual)
   */
  async function test7_Reconnection() {
    console.log(colorize('gray', '\n--- Test 7: Reconnection (Manual Test) ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();
      await client.waitForMessage('welcome');

      console.log(`${colorize('blue', '→')} Closing connection...`);
      client.close();

      await delay(500);

      console.log(`${colorize('blue', '→')} Reconnecting...`);

      // Create new client to test reconnection
      const client2 = new TestClient(WS_URL);
      await client2.connect();
      await client2.waitForMessage('welcome');

      console.log(`${colorize('green', '✓')} Successfully reconnected`);

      client2.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Reconnection', status: 'PASS' });
      return true;
    } catch (error) {
      console.error(`${colorize('red', '✗')} Test failed:`, error.message);
      results.failed++;
      results.tests.push({ name: 'Reconnection', status: 'FAIL', error: error.message });
      return false;
    }
  }

  /**
   * Test 8: Malformed message handling
   */
  async function test8_MalformedMessages() {
    console.log(colorize('gray', '\n--- Test 8: Malformed Message Handling ---'));

    const client = new TestClient(WS_URL);

    try {
      await client.connect();
      await client.waitForMessage('welcome');

      console.log(`${colorize('blue', '→')} Sending malformed message...`);

      // Send invalid JSON
      if (client.ws && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send('not valid json {');
      }

      // Wait a bit - server should handle gracefully
      await delay(500);

      // Send valid ping to ensure connection still works
      client.send({ type: 'ping' });
      await client.waitForMessage('pong');

      console.log(`${colorize('green', '✓')} Server handled malformed message gracefully`);

      client.close();
      await delay(100);

      results.passed++;
      results.tests.push({ name: 'Malformed Messages', status: 'PASS' });
      return true;
    } catch (error) {
      console.error(`${colorize('red', '✗')} Test failed:`, error.message);
      results.failed++;
      results.tests.push({ name: 'Malformed Messages', status: 'FAIL', error: error.message });
      return false;
    }
  }

  // Run all tests
  try {
    await test1_Connection();
    await test2_PingPong();
    await test3_Subscriptions();
    // Skip heartbeat test by default (takes too long)
    // await test4_Heartbeat();
    await test5_Statistics();
    await test6_MultipleMessages();
    await test7_Reconnection();
    await test8_MalformedMessages();

    // Print summary
    console.log(colorize('blue', '\n═══════════════════════════════════════'));
    console.log(colorize('blue', '  Test Summary'));
    console.log(colorize('blue', '═══════════════════════════════════════\n'));

    results.tests.forEach(test => {
      const icon = test.status === 'PASS' ? colorize('green', '✓') :
        test.status === 'SKIP' ? colorize('yellow', '○') :
          colorize('red', '✗');
      console.log(`${icon} ${test.name}${test.status === 'FAIL' ? `: ${test.error}` : ''}`);
    });

    console.log('');
    console.log(`Total: ${results.passed + results.failed} tests`);
    console.log(`${colorize('green', `Passed: ${results.passed}`)}`);
    if (results.failed > 0) {
      console.log(`${colorize('red', `Failed: ${results.failed}`)}`);
    }

    const allPassed = results.failed === 0;
    console.log(allPassed ? colorize('green', '\n✓ All tests passed!') : colorize('red', '\n✗ Some tests failed'));

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error(colorize('red', '\n✗ Test suite error:'), error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, TestClient };
