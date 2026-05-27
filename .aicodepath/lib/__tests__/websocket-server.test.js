/**
 * Tests for WebSocket Server
 *
 * Comprehensive test suite for DashboardWebSocketServer
 * Tests connection handling, message broadcasting, ping/pong, and more
 *
 * Run with: npm test -- websocket-server.test.js
 * Or: node .aicodepath/lib/__tests__/websocket-server.test.js
 */

const WebSocket = require('ws');
const http = require('http');
const { createWebSocketServer } = require('../websocket-server');

// Test configuration
const TEST_PORT = 9999;
const TEST_PATH = '/ws/dashboard';
const WS_URL = `ws://localhost:${TEST_PORT}${TEST_PATH}`;

describe('DashboardWebSocketServer', () => {
  let server;
  let httpServer;
  let clients = [];

  /**
   * Setup: Create HTTP server and WebSocket server before each test
   */
  beforeEach((done) => {
    // Create a test HTTP server
    httpServer = http.createServer();

    // Create WebSocket server instance
    server = createWebSocketServer({
      path: TEST_PATH,
      heartbeatInterval: 1000, // Faster heartbeat for tests
      clientTimeout: 2000, // 2 second timeout for tests
      maxClients: 5, // Low limit for testing max clients
    });

    // Attach WebSocket server to HTTP server
    server.attach(httpServer);

    // Start listening
    httpServer.listen(TEST_PORT, done);
  });

  /**
   * Teardown: Close all client connections and servers after each test
   */
  afterEach((done) => {
    // Close all client connections
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    clients = [];

    // Close WebSocket server
    if (server) {
      server.close();
    }

    // Close HTTP server
    if (httpServer) {
      httpServer.close(() => done());
    } else {
      done();
    }
  });

  /**
   * Helper: Create a new WebSocket client connection
   */
  const createClient = () => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(WS_URL);

      client.on('open', () => resolve(client));
      client.on('error', reject);

      clients.push(client);
    });
  };

  /**
   * Helper: Wait for a message from a client
   */
  const waitForMessage = (client, messageType, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${messageType} message`));
      }, timeout);

      client.once('message', (data) => {
        clearTimeout(timer);
        try {
          const message = JSON.parse(data);
          resolve(message);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  /**
   * Test 1: Welcome message on connection
   * Verifies that connecting clients receive a welcome message with clientId and serverTime
   */
  test('sends welcome message on connection', async () => {
    const client = await createClient();

    const message = await waitForMessage(client, 'welcome');

    expect(message.type).toBe('welcome');
    expect(message.clientId).toBeDefined();
    expect(message.clientId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(message.serverTime).toBeDefined();
    expect(message.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601 format

    console.log('✓ Welcome message received with clientId:', message.clientId);
  });

  /**
   * Test 2: Agent update broadcasting
   * Verifies that agent updates are broadcast to all connected clients
   */
  test('broadcasts agent updates to all clients', async () => {
    const client1 = await createClient();
    const client2 = await createClient();

    // Wait for welcome messages
    await waitForMessage(client1, 'welcome');
    await waitForMessage(client2, 'welcome');

    // Emit an agent update from the server
    server.emitAgentUpdate({
      agentIndex: 0,
      agentName: 'Coder',
      featureId: 1,
      featureName: 'Test Feature',
      state: 'working',
      thought: 'Implementing authentication',
      progress: 45,
    });

    // Both clients should receive the update
    const [msg1, msg2] = await Promise.all([
      waitForMessage(client1, 'agent_update'),
      waitForMessage(client2, 'agent_update'),
    ]);

    expect(msg1.type).toBe('agent_update');
    expect(msg1.agentName).toBe('Coder');
    expect(msg1.state).toBe('working');
    expect(msg1.progress).toBe(45);

    expect(msg2.type).toBe('agent_update');
    expect(msg2.agentName).toBe('Coder');

    console.log('✓ Agent update broadcast to all clients');
  });

  /**
   * Test 3: Ping/pong mechanism
   * Verifies that the server responds to ping messages with pong
   */
  test('responds to ping with pong', async () => {
    const client = await createClient();

    // Wait for welcome message first
    await waitForMessage(client, 'welcome');

    // Send a ping message
    client.send(JSON.stringify({ type: 'ping' }));

    // Wait for pong response
    const pong = await waitForMessage(client, 'pong');

    expect(pong.type).toBe('pong');
    expect(pong.timestamp).toBeDefined();
    expect(typeof pong.timestamp).toBe('number');

    console.log('✓ Ping/pong mechanism working');
  });

  /**
   * Test 4: Client disconnection
   * Verifies that the server properly handles client disconnection
   */
  test('handles client disconnection', async () => {
    const client = await createClient();

    // Wait for welcome
    await waitForMessage(client, 'welcome');

    // Check initial client count
    const statsBefore = server.getStats();
    expect(statsBefore.totalClients).toBe(1);

    // Close the client connection
    client.close();

    // Wait a bit for server to process the disconnection
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that client was removed
    const statsAfter = server.getStats();
    expect(statsAfter.totalClients).toBe(0);

    console.log('✓ Client disconnection handled correctly');
  });

  /**
   * Test 5: Max clients limit
   * Verifies that the server rejects connections when max clients limit is reached
   */
  test('enforces max clients limit', async () => {
    // Create maximum number of clients (5)
    for (let i = 0; i < 5; i++) {
      await createClient();
    }

    // Wait for all connections to establish
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try to create one more client (should be rejected)
    const rejectedClient = new WebSocket(WS_URL);

    const closePromise = new Promise((resolve) => {
      rejectedClient.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    const { code, reason } = await closePromise;

    expect(code).toBe(1013); // Try Again Later
    expect(reason).toContain('Server capacity reached');

    console.log('✓ Max clients limit enforced');
  });

  /**
   * Test 6: Heartbeat timeout
   * Verifies that clients are disconnected after timeout
   */
  test('disconnects clients after heartbeat timeout', async () => {
    const client = await createClient();

    // Wait for welcome
    await waitForMessage(client, 'welcome');

    // Create a promise that resolves when client is closed
    const closePromise = new Promise((resolve) => {
      client.on('close', resolve);
    });

    // Wait for heartbeat timeout (configured as 2000ms in beforeEach)
    // Plus heartbeat interval (1000ms) + buffer
    const result = await Promise.race([
      closePromise,
      new Promise(resolve => setTimeout(() => resolve('timeout'), 4000))
    ]);

    expect(result).not.toBe('timeout');

    // Check that server no longer has this client
    const stats = server.getStats();
    expect(stats.totalClients).toBe(0);

    console.log('✓ Client disconnected after heartbeat timeout');
  });

  /**
   * Test 7: Log message broadcasting
   * Verifies that log messages are broadcast with correct structure
   */
  test('broadcasts log messages', async () => {
    const client = await createClient();

    // Wait for welcome
    await waitForMessage(client, 'welcome');

    // Emit a log message
    server.emitLog('Test log line from agent', {
      level: 'info',
      agentIndex: 0,
      featureId: 1,
      source: 'coder-agent',
    });

    // Wait for log message
    const logMsg = await waitForMessage(client, 'log');

    expect(logMsg.type).toBe('log');
    expect(logMsg.line).toBe('Test log line from agent');
    expect(logMsg.level).toBe('info');
    expect(logMsg.agentIndex).toBe(0);
    expect(logMsg.featureId).toBe(1);
    expect(logMsg.source).toBe('coder-agent');
    expect(logMsg.timestamp).toBeDefined();

    console.log('✓ Log message broadcast correctly');
  });

  /**
   * Test 8: Phase change broadcasting
   * Verifies that phase changes are broadcast to clients
   */
  test('broadcasts phase changes', async () => {
    const client = await createClient();

    // Wait for welcome
    await waitForMessage(client, 'welcome');

    // Emit a phase change
    server.emitPhaseChange({
      previousPhase: 'INCEPTION',
      currentPhase: 'CONSTRUCTION',
      stage: 'unit-implementation',
      unit: 'auth-service',
    });

    // Wait for phase change message
    const phaseMsg = await waitForMessage(client, 'phase_change');

    expect(phaseMsg.type).toBe('phase_change');
    expect(phaseMsg.previousPhase).toBe('INCEPTION');
    expect(phaseMsg.currentPhase).toBe('CONSTRUCTION');
    expect(phaseMsg.stage).toBe('unit-implementation');
    expect(phaseMsg.unit).toBe('auth-service');

    console.log('✓ Phase change broadcast correctly');
  });

  /**
   * Test 9: Progress update broadcasting
   * Verifies that progress updates are broadcast with all fields
   */
  test('broadcasts progress updates', async () => {
    const client = await createClient();

    // Wait for welcome
    await waitForMessage(client, 'welcome');

    // Emit progress update
    server.emitProgress({
      passing: 15,
      inProgress: 5,
      total: 25,
      percentage: 60,
    });

    // Wait for progress message
    const progressMsg = await waitForMessage(client, 'progress');

    expect(progressMsg.type).toBe('progress');
    expect(progressMsg.passing).toBe(15);
    expect(progressMsg.inProgress).toBe(5);
    expect(progressMsg.total).toBe(25);
    expect(progressMsg.percentage).toBe(60);

    console.log('✓ Progress update broadcast correctly');
  });

  /**
   * Test 10: Checkpoint event broadcasting
   * Verifies that checkpoint saved events are broadcast
   */
  test('broadcasts checkpoint events', async () => {
    const client = await createClient();

    // Wait for welcome
    await waitForMessage(client, 'welcome');

    // Emit checkpoint event
    server.emitCheckpoint({
      checkpointId: 'cp-123',
      phase: 'CONSTRUCTION',
      stage: 'unit-implementation',
      message: 'Checkpoint saved before refactoring',
    });

    // Wait for checkpoint message
    const checkpointMsg = await waitForMessage(client, 'checkpoint');

    expect(checkpointMsg.type).toBe('checkpoint');
    expect(checkpointMsg.checkpointId).toBe('cp-123');
    expect(checkpointMsg.phase).toBe('CONSTRUCTION');
    expect(checkpointMsg.message).toBe('Checkpoint saved before refactoring');

    console.log('✓ Checkpoint event broadcast correctly');
  });

  /**
   * Test 11: Celebration trigger broadcasting
   * Verifies that celebration triggers are sent to clients
   */
  test('broadcasts celebration triggers', async () => {
    const client = await createClient();

    // Wait for welcome
    await waitForMessage(client, 'welcome');

    // Emit celebration trigger
    server.emitCelebration({
      featureId: 42,
      featureName: 'User Authentication',
      agentName: 'Coder',
    });

    // Wait for celebration message
    const celebrationMsg = await waitForMessage(client, 'celebration');

    expect(celebrationMsg.type).toBe('celebration');
    expect(celebrationMsg.featureId).toBe(42);
    expect(celebrationMsg.featureName).toBe('User Authentication');
    expect(celebrationMsg.agentName).toBe('Coder');

    console.log('✓ Celebration trigger broadcast correctly');
  });

  /**
   * Test 12: Subscription filtering
   * Verifies that clients can subscribe to specific message types
   */
  test('respects client subscriptions', async () => {
    // Create two clients with different subscriptions
    const client1 = await createClient();
    const client2 = await createClient();

    // Wait for welcome messages
    await waitForMessage(client1, 'welcome');
    await waitForMessage(client2, 'welcome');

    // Subscribe client1 to only log messages
    client1.send(JSON.stringify({
      type: 'subscribe',
      events: ['log']
    }));

    // Subscribe client2 to only agent updates
    client2.send(JSON.stringify({
      type: 'subscribe',
      events: ['agent_update']
    }));

    // Wait a bit for subscriptions to process
    await new Promise(resolve => setTimeout(resolve, 50));

    // Emit both log and agent update
    server.emitLog('Test log', { source: 'test' });
    server.emitAgentUpdate({
      agentIndex: 0,
      agentName: 'TestAgent',
      featureId: 1,
      featureName: 'Test',
      state: 'working',
    });

    // Collect messages from both clients
    const collectMessages = (client, count = 2) => {
      return new Promise((resolve) => {
        const messages = [];
        const timeout = setTimeout(() => resolve(messages), 500);

        client.on('message', function handler(data) {
          try {
            const msg = JSON.parse(data);
            if (msg.type !== 'welcome' && msg.type !== 'heartbeat') {
              messages.push(msg);
              if (messages.length >= count) {
                clearTimeout(timeout);
                client.removeListener('message', handler);
                resolve(messages);
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      });
    };

    const [msgs1, msgs2] = await Promise.all([
      collectMessages(client1, 1),
      collectMessages(client2, 1),
    ]);

    // Client1 should only receive log messages
    expect(msgs1.some(m => m.type === 'log')).toBe(true);
    expect(msgs1.some(m => m.type === 'agent_update')).toBe(false);

    // Client2 should only receive agent updates
    expect(msgs2.some(m => m.type === 'agent_update')).toBe(true);
    expect(msgs2.some(m => m.type === 'log')).toBe(false);

    console.log('✓ Subscription filtering working correctly');
  });

  /**
   * Test 13: Get statistics
   * Verifies that getStats() returns correct client information
   */
  test('returns correct statistics', async () => {
    await createClient();
    await createClient();

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 100));

    const stats = server.getStats();

    expect(stats.totalClients).toBe(2);
    expect(stats.clients).toHaveLength(2);
    expect(stats.clients[0]).toHaveProperty('id');
    expect(stats.clients[0]).toHaveProperty('ip');
    expect(stats.clients[0]).toHaveProperty('lastPing');
    expect(stats.clients[0]).toHaveProperty('subscriptions');

    console.log('✓ Statistics returned correctly');
  });

  /**
   * Test 14: Event emission for client connect/disconnect
   * Verifies that server emits events for client lifecycle
   */
  test('emits events for client connect and disconnect', (done) => {
    let connectEmitted = false;
    let disconnectEmitted = false;

    server.on('client:connect', (data) => {
      expect(data.clientId).toBeDefined();
      expect(data.ip).toBeDefined();
      connectEmitted = true;

      // Close client to trigger disconnect event
      if (clients.length > 0) {
        clients[0].close();
      }
    });

    server.on('client:disconnect', (data) => {
      expect(data.clientId).toBeDefined();
      expect(data.code).toBeDefined();
      disconnectEmitted = true;

      // Both events should have been emitted
      expect(connectEmitted).toBe(true);
      expect(disconnectEmitted).toBe(true);

      console.log('✓ Client lifecycle events emitted correctly');
      done();
    });

    // Create a client to trigger connect event
    createClient().catch(done);
  });

  /**
   * Test 15: Multiple simultaneous connections
   * Verifies that the server can handle multiple concurrent connections
   */
  test('handles multiple simultaneous connections', async () => {
    const clientPromises = [];
    for (let i = 0; i < 3; i++) {
      clientPromises.push(createClient());
    }

    const connectedClients = await Promise.all(clientPromises);

    // All should receive welcome messages
    const welcomePromises = connectedClients.map(client =>
      waitForMessage(client, 'welcome')
    );

    const welcomes = await Promise.all(welcomePromises);

    welcomes.forEach(welcome => {
      expect(welcome.type).toBe('welcome');
      expect(welcome.clientId).toBeDefined();
    });

    // All clientIds should be unique
    const clientIds = welcomes.map(w => w.clientId);
    const uniqueIds = new Set(clientIds);
    expect(uniqueIds.size).toBe(3);

    console.log('✓ Multiple simultaneous connections handled correctly');
  });

  /**
   * Test 16: Graceful shutdown
   * Verifies that server closes all client connections on shutdown
   */
  test('closes all client connections on shutdown', async () => {
    const client1 = await createClient();
    const client2 = await createClient();

    // Wait for welcome messages
    await Promise.all([
      waitForMessage(client1, 'welcome'),
      waitForMessage(client2, 'welcome'),
    ]);

    // Create promises for client close events
    const closePromises = [
      new Promise(resolve => client1.on('close', resolve)),
      new Promise(resolve => client2.on('close', resolve)),
    ];

    // Close the server
    server.close();

    // Both clients should be closed
    await Promise.all(closePromises);

    console.log('✓ Server closed all client connections gracefully');
  });
});

// Allow running this test file directly
if (require.main === module) {
  console.log('Running WebSocket Server tests...\n');

  // Run Jest programmatically
  const jest = require('jest');
  const argv = [
    '/usr/local/bin/node',
    __filename,
    '--verbose',
    '--no-cache',
  ];

  jest.run(argv);
}
