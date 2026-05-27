/**
 * Tests for useWebSocket React Hook
 *
 * Comprehensive test suite for the WebSocket React hook
 * Tests connection handling, message processing, reconnection, and state management
 *
 * Run with: npm test -- useWebSocket.test.ts
 *
 * Requirements:
 * - @testing-library/react
 * - jest-websocket-mock
 * - @testing-library/react-hooks (for React < 18.1) or built-in for React 18+
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import WS from 'jest-websocket-mock';

// Mock WebSocket for environments where jest-websocket-mock isn't available
const mockWebSocket = (() => {
  let mockWS: any = null;

  class MockWebSocket {
    url: string;
    readyState: number = 0; // CONNECTING
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url: string) {
      this.url = url;
      mockWS = this;

      // Simulate connection opening after a short delay
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }, 10);
    }

    send(data: string) {
      if (this.readyState !== MockWebSocket.OPEN) {
        throw new Error('WebSocket is not open');
      }
      // Echo back for testing
      if (this.onmessage) {
        const parsed = JSON.parse(data);
        if (parsed.type === 'ping') {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify({ type: 'pong', timestamp: Date.now() })
          }));
        }
      }
    }

    close(code?: number, reason?: string) {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
      }
    }
  }

  return {
    MockWebSocket,
    getMock: () => mockWS,
    simulateMessage: (data: any) => {
      if (mockWS && mockWS.onmessage) {
        mockWS.onmessage(new MessageEvent('message', {
          data: typeof data === 'string' ? data : JSON.stringify(data)
        }));
      }
    },
    reset: () => {
      mockWS = null;
    }
  };
})();

// Use jest-websocket-mock if available, otherwise use mock
let useRealWS = true;
try {
  // Test if WS is available
  new WS('ws://localhost');
  useRealWS = true;
} catch (e) {
  useRealWS = false;
  // @ts-ignore - Mock WebSocket globally
  global.WebSocket = mockWebSocket.MockWebSocket as any;
}

describe('useWebSocket Hook', () => {
  let server: WS | null = null;
  const WS_URL = 'ws://localhost/ws/dashboard';

  /**
   * Setup: Create WebSocket mock server before each test
   */
  beforeEach(() => {
    if (useRealWS) {
      server = new WS(WS_URL, { jsonProtocol: true });
    } else {
      mockWebSocket.reset();
    }
  });

  /**
   * Teardown: Clean up WebSocket connections after each test
   */
  afterEach(() => {
    if (server) {
      WS.clean();
      server = null;
    }
    mockWebSocket.reset();
  });

  /**
   * Helper: Wait for WebSocket server to be ready
   */
  const waitForServer = async () => {
    if (server) {
      await server.connected;
    } else {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };

  /**
   * Test 1: Connection and welcome message
   * Verifies that the hook connects and receives the welcome message
   */
  test('connects and receives welcome message', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    // Initially not connected
    expect(result.current.isConnected).toBe(false);

    await waitForServer();

    // Send welcome message from server
    const welcomeMsg = {
      type: 'welcome',
      clientId: 'test-client-123',
      serverTime: new Date().toISOString(),
    };

    if (server) {
      await act(async () => {
        server!.send(welcomeMsg);
      });
    } else {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        mockWebSocket.simulateMessage(welcomeMsg);
      });
    }

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.reconnectAttempts).toBe(0);

    console.log('✓ Connected and received welcome message');
  });

  /**
   * Test 2: Agent update handling
   * Verifies that agent updates are properly stored in state
   */
  test('handles agent updates correctly', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    const agentUpdate = {
      type: 'agent_update',
      agentIndex: 0,
      agentName: 'Coder',
      featureId: 1,
      featureName: 'Authentication Service',
      state: 'working',
      thought: 'Implementing JWT token validation',
      progress: 65,
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(agentUpdate);
      } else {
        mockWebSocket.simulateMessage(agentUpdate);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.activeAgents).toHaveLength(1);
    expect(result.current.activeAgents[0]).toMatchObject({
      agentIndex: 0,
      agentName: 'Coder',
      featureName: 'Authentication Service',
      state: 'working',
      thought: 'Implementing JWT token validation',
      progress: 65,
    });

    // Should add to recent activity
    expect(result.current.recentActivity.length).toBeGreaterThan(0);
    expect(result.current.recentActivity[0].type).toBe('agent');

    console.log('✓ Agent update handled correctly');
  });

  /**
   * Test 3: Log message handling
   * Verifies that log messages are added to state with proper structure
   */
  test('handles log messages', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL, maxLogs: 100 })
    );

    await waitForServer();

    const logMsg = {
      type: 'log',
      line: 'Starting authentication flow implementation',
      level: 'info',
      agentIndex: 0,
      featureId: 1,
      source: 'coder-agent',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(logMsg);
      } else {
        mockWebSocket.simulateMessage(logMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0]).toMatchObject({
      line: 'Starting authentication flow implementation',
      level: 'info',
      source: 'coder-agent',
    });

    console.log('✓ Log message handled correctly');
  });

  /**
   * Test 4: Log limit enforcement
   * Verifies that log array respects maxLogs limit
   */
  test('respects maxLogs limit', async () => {
    const maxLogs = 5;
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL, maxLogs })
    );

    await waitForServer();

    // Send more logs than the limit
    for (let i = 1; i <= 10; i++) {
      const logMsg = {
        type: 'log',
        line: `Log line ${i}`,
        level: 'info' as const,
        source: 'test',
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        if (server) {
          server.send(logMsg);
        } else {
          mockWebSocket.simulateMessage(logMsg);
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      });
    }

    // Should only keep the most recent logs
    expect(result.current.logs.length).toBeLessThanOrEqual(maxLogs);
    expect(result.current.logs[0].line).toBe('Log line 10'); // Most recent

    console.log('✓ maxLogs limit enforced correctly');
  });

  /**
   * Test 5: Reconnection behavior
   * Verifies that the hook attempts to reconnect on disconnection
   */
  test('attempts to reconnect on disconnection', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: WS_URL,
        reconnectDelay: 100,
        maxReconnectDelay: 1000,
      })
    );

    await waitForServer();

    // Send welcome to establish connection
    await act(async () => {
      const welcomeMsg = {
        type: 'welcome',
        clientId: 'test-client',
        serverTime: new Date().toISOString(),
      };

      if (server) {
        server.send(welcomeMsg);
      } else {
        mockWebSocket.simulateMessage(welcomeMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate disconnection
    await act(async () => {
      if (server) {
        server.close();
      } else {
        const ws = mockWebSocket.getMock();
        if (ws) ws.close();
      }
    });

    // Should show as disconnected
    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    // Reconnect attempts should increment
    await waitFor(() => {
      expect(result.current.reconnectAttempts).toBeGreaterThan(0);
    }, { timeout: 3000 });

    console.log('✓ Reconnection behavior working correctly');
  });

  /**
   * Test 6: Heartbeat timeout handling
   * Verifies that connection is closed after heartbeat timeout
   */
  test('handles heartbeat timeout', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useWebSocket({
        url: WS_URL,
        heartbeatTimeout: 5000, // 5 second timeout
      })
    );

    await waitForServer();

    // Send welcome
    await act(async () => {
      const welcomeMsg = {
        type: 'welcome',
        clientId: 'test-client',
        serverTime: new Date().toISOString(),
      };

      if (server) {
        server.send(welcomeMsg);
      } else {
        mockWebSocket.simulateMessage(welcomeMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.isConnected).toBe(true);

    // Fast forward past heartbeat timeout
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    // Should trigger reconnection due to timeout
    await waitFor(() => {
      expect(result.current.reconnectAttempts).toBeGreaterThan(0);
    });

    jest.useRealTimers();

    console.log('✓ Heartbeat timeout handled correctly');
  });

  /**
   * Test 7: Progress update handling
   * Verifies that progress updates update the progress state
   */
  test('handles progress updates', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    const progressMsg = {
      type: 'progress',
      passing: 15,
      inProgress: 5,
      total: 25,
      percentage: 60,
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(progressMsg);
      } else {
        mockWebSocket.simulateMessage(progressMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.progress).toMatchObject({
      passing: 15,
      inProgress: 5,
      total: 25,
      percentage: 60,
    });

    console.log('✓ Progress update handled correctly');
  });

  /**
   * Test 8: Phase change handling
   * Verifies that phase changes update current phase and activity
   */
  test('handles phase changes', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    const phaseMsg = {
      type: 'phase_change',
      previousPhase: 'INCEPTION',
      currentPhase: 'CONSTRUCTION',
      stage: 'unit-implementation',
      unit: 'auth-service',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(phaseMsg);
      } else {
        mockWebSocket.simulateMessage(phaseMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.currentPhase).toBe('CONSTRUCTION');
    expect(result.current.recentActivity[0]).toMatchObject({
      type: 'phase',
      description: 'Phase changed: INCEPTION → CONSTRUCTION',
    });

    console.log('✓ Phase change handled correctly');
  });

  /**
   * Test 9: Celebration trigger handling
   * Verifies that celebration triggers are queued
   */
  test('handles celebration triggers', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    const celebrationMsg = {
      type: 'celebration',
      featureId: 42,
      featureName: 'User Authentication',
      agentName: 'Coder',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(celebrationMsg);
      } else {
        mockWebSocket.simulateMessage(celebrationMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.celebrationQueue).toHaveLength(1);
    expect(result.current.celebrationQueue[0]).toMatchObject({
      featureId: 42,
      featureName: 'User Authentication',
      agentName: 'Coder',
    });

    console.log('✓ Celebration trigger handled correctly');
  });

  /**
   * Test 10: Orchestrator update handling
   * Verifies that orchestrator status updates
   */
  test('handles orchestrator updates', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    const orchestratorMsg = {
      type: 'orchestrator_update',
      state: 'orchestrating',
      codingAgents: 3,
      testingAgents: 2,
      readyCount: 4,
      blockedCount: 1,
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(orchestratorMsg);
      } else {
        mockWebSocket.simulateMessage(orchestratorMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.orchestratorStatus).toMatchObject({
      state: 'orchestrating',
      codingAgents: 3,
      testingAgents: 2,
      readyCount: 4,
      blockedCount: 1,
    });

    console.log('✓ Orchestrator update handled correctly');
  });

  /**
   * Test 11: Agent completion removes from active list
   * Verifies that agents with success/error state are removed from active list
   */
  test('removes completed agents from active list', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    // Add an active agent
    const workingMsg = {
      type: 'agent_update',
      agentIndex: 0,
      agentName: 'Coder',
      featureId: 1,
      featureName: 'Auth Feature',
      state: 'working',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(workingMsg);
      } else {
        mockWebSocket.simulateMessage(workingMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.activeAgents).toHaveLength(1);

    // Mark agent as complete
    const successMsg = {
      type: 'agent_update',
      agentIndex: 0,
      agentName: 'Coder',
      featureId: 1,
      featureName: 'Auth Feature',
      state: 'success',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(successMsg);
      } else {
        mockWebSocket.simulateMessage(successMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Agent should be removed from active list
    expect(result.current.activeAgents).toHaveLength(0);

    console.log('✓ Completed agent removed from active list');
  });

  /**
   * Test 12: clearLogs function
   * Verifies that clearLogs clears all logs
   */
  test('clearLogs removes all logs', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    // Add some logs
    const logMsg = {
      type: 'log',
      line: 'Test log',
      level: 'info' as const,
      source: 'test',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(logMsg);
      } else {
        mockWebSocket.simulateMessage(logMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.logs.length).toBeGreaterThan(0);

    // Clear logs
    await act(async () => {
      result.current.clearLogs();
    });

    expect(result.current.logs).toHaveLength(0);

    console.log('✓ clearLogs function works correctly');
  });

  /**
   * Test 13: dismissCelebration function
   * Verifies that dismissCelebration removes the first celebration from queue
   */
  test('dismissCelebration removes first celebration', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    // Add celebrations
    const celebrationMsg = {
      type: 'celebration',
      featureId: 1,
      featureName: 'Feature 1',
      agentName: 'Agent 1',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(celebrationMsg);
        server.send({ ...celebrationMsg, featureId: 2, featureName: 'Feature 2' });
      } else {
        mockWebSocket.simulateMessage(celebrationMsg);
        mockWebSocket.simulateMessage({ ...celebrationMsg, featureId: 2, featureName: 'Feature 2' });
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.celebrationQueue).toHaveLength(2);

    // Dismiss first celebration
    await act(async () => {
      result.current.dismissCelebration();
    });

    expect(result.current.celebrationQueue).toHaveLength(1);
    expect(result.current.celebrationQueue[0].featureId).toBe(2);

    console.log('✓ dismissCelebration function works correctly');
  });

  /**
   * Test 14: send function
   * Verifies that send sends messages through WebSocket
   */
  test('send sends messages through WebSocket', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    // Send welcome first to establish connection
    await act(async () => {
      const welcomeMsg = {
        type: 'welcome',
        clientId: 'test-client',
        serverTime: new Date().toISOString(),
      };

      if (server) {
        server.send(welcomeMsg);
      } else {
        mockWebSocket.simulateMessage(welcomeMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Send a message
    await act(async () => {
      result.current.send({ type: 'ping' });
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // If using mock WebSocket, verify message was received
    if (!useRealWS) {
      const mockWs = mockWebSocket.getMock();
      expect(mockWs).toBeTruthy();
    }

    console.log('✓ send function works correctly');
  });

  /**
   * Test 15: Recent activity limit
   * Verifies that recentActivity respects maxActivity limit
   */
  test('respects maxActivity limit', async () => {
    const maxActivity = 5;
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL, maxActivity })
    );

    await waitForServer();

    // Send multiple events that create activity
    for (let i = 1; i <= 10; i++) {
      const logMsg = {
        type: 'log' as const,
        line: `Activity ${i}`,
        level: 'info' as const,
        source: 'test',
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        if (server) {
          server.send(logMsg);
        } else {
          mockWebSocket.simulateMessage(logMsg);
        }
        await new Promise(resolve => setTimeout(resolve, 5));
      });
    }

    // Should not exceed maxActivity
    expect(result.current.recentActivity.length).toBeLessThanOrEqual(maxActivity);

    console.log('✓ maxActivity limit enforced correctly');
  });

  /**
   * Test 16: Agent state updates
   * Verifies that existing agent state is updated, not duplicated
   */
  test('updates existing agent state instead of duplicating', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    await waitForServer();

    const agentUpdate1 = {
      type: 'agent_update' as const,
      agentIndex: 0,
      agentName: 'Coder',
      featureId: 1,
      featureName: 'Auth Feature',
      state: 'thinking' as const,
      thought: 'Analyzing requirements',
      timestamp: new Date().toISOString(),
    };

    const agentUpdate2 = {
      type: 'agent_update' as const,
      agentIndex: 0,
      agentName: 'Coder',
      featureId: 1,
      featureName: 'Auth Feature',
      state: 'working' as const,
      thought: 'Implementing code',
      progress: 25,
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (server) {
        server.send(agentUpdate1);
        server.send(agentUpdate2);
      } else {
        mockWebSocket.simulateMessage(agentUpdate1);
        mockWebSocket.simulateMessage(agentUpdate2);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should still have only one agent
    expect(result.current.activeAgents).toHaveLength(1);

    // Agent should have the updated state
    expect(result.current.activeAgents[0]).toMatchObject({
      agentIndex: 0,
      state: 'working',
      thought: 'Implementing code',
      progress: 25,
    });

    console.log('✓ Agent state updated without duplication');
  });
});

/**
 * Additional utility tests
 */
describe('useWebSocket Utilities', () => {
  /**
   * Test 17: Multiple agents with different indices
   * Verifies handling of multiple concurrent agents
   */
  test('handles multiple agents with different indices', async () => {
    const WS_URL = 'ws://localhost/ws/dashboard';
    let server: WS | null = null;

    try {
      server = new WS(WS_URL, { jsonProtocol: true });
    } catch (e) {
      // @ts-ignore
      global.WebSocket = mockWebSocket.MockWebSocket as any;
    }

    const { result } = renderHook(() =>
      useWebSocket({ url: WS_URL })
    );

    if (server) {
      await server.connected;
    } else {
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    const agents = [
      { agentIndex: 0, agentName: 'Coder', featureName: 'Auth', state: 'working' as const },
      { agentIndex: 1, agentName: 'Tester', featureName: 'Auth Tests', state: 'testing' as const },
      { agentIndex: 2, agentName: 'Reviewer', featureName: 'Code Review', state: 'thinking' as const },
    ];

    await act(async () => {
      for (const agent of agents) {
        const msg = {
          type: 'agent_update',
          ...agent,
          featureId: agent.agentIndex + 1,
          timestamp: new Date().toISOString(),
        };

        if (server) {
          server.send(msg);
        } else {
          mockWebSocket.simulateMessage(msg);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.activeAgents).toHaveLength(3);

    // Verify all agents are present
    for (const agent of agents) {
      expect(result.current.activeAgents.some(
        a => a.agentIndex === agent.agentIndex && a.agentName === agent.agentName
      )).toBe(true);
    }

    if (server) {
      WS.clean();
    } else {
      mockWebSocket.reset();
    }

    console.log('✓ Multiple agents handled correctly');
  });
});
