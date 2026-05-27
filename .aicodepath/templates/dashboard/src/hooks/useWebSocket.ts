import { useEffect, useRef, useState, useCallback } from 'react';

// Types
export interface ActiveAgent {
  agentIndex: number;
  agentName: string;
  featureId: number;
  featureName: string;
  state: 'thinking' | 'working' | 'testing' | 'success' | 'error';
  thought?: string;
  progress?: number;
  timestamp: string;
}

export interface LogEntry {
  line: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  agentIndex?: number;
  featureId?: number;
  source: string;
  timestamp: string;
}

export interface ProgressData {
  passing: number;
  inProgress: number;
  total: number;
  percentage: number;
}

export interface OrchestratorStatus {
  state: 'idle' | 'initializing' | 'orchestrating' | 'complete';
  codingAgents: number;
  testingAgents: number;
  readyCount: number;
  blockedCount: number;
}

export interface CelebrationTrigger {
  featureId: number;
  featureName: string;
  agentName: string;
  timestamp: string;
}

export interface SwarmTeamMember {
  agentName: string;
  role: string;
  status: string;
  currentTask?: string;
}

export interface SwarmTeam {
  teamName: string;
  pattern: 'parallel' | 'pipeline' | 'swarm' | 'review';
  phase: string;
  status: 'forming' | 'active' | 'disbanding' | 'disbanded';
  tasksCompleted: number;
  tasksTotal: number;
  members: SwarmTeamMember[];
}

export interface WebSocketState {
  isConnected: boolean;
  reconnectAttempts: number;
  logs: LogEntry[];
  activeAgents: ActiveAgent[];
  progress: ProgressData | null;
  orchestratorStatus: OrchestratorStatus | null;
  celebrationQueue: CelebrationTrigger[];
  currentPhase: string | null;
  swarmTeam: SwarmTeam | null;
  lastFeatureUpdate: number | null;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  lastSessionUpdate: number | null;
  fileChanges: Array<{
    path: string;
    tier: 'hot' | 'cold';
    timestamp: string;
  }>;
}

interface WebSocketMessage {
  type: string;
  timestamp?: string;
  [key: string]: any;
}

interface WebSocketOptions {
  url?: string;
  maxLogs?: number;
  maxActivity?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeatTimeout?: number;
}

const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/dashboard`,
  maxLogs: 500,
  maxActivity: 50,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatTimeout: 60000,
};

export function useWebSocket(options: WebSocketOptions = {}): WebSocketState & {
  send: (message: object) => void;
  clearLogs: () => void;
  dismissCelebration: () => void;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    reconnectAttempts: 0,
    logs: [],
    activeAgents: [],
    progress: null,
    orchestratorStatus: null,
    celebrationQueue: [],
    currentPhase: null,
    swarmTeam: null,
    lastFeatureUpdate: null,
    recentActivity: [],
    lastSessionUpdate: null,
    fileChanges: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Reset heartbeat timer
  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = window.setTimeout(() => {
      console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
      wsRef.current?.close();
    }, opts.heartbeatTimeout);
  }, [opts.heartbeatTimeout]);

  // Send periodic pings to keep connection alive
  const pingIntervalRef = useRef<number | null>(null);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    resetHeartbeat();

    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'welcome':
          console.log('[WebSocket] Connected:', message.clientId);
          break;

        case 'heartbeat':
        case 'pong':
          // Just reset the heartbeat timer (already done above)
          break;

        case 'log':
          setState(prev => ({
            ...prev,
            logs: [
              ...prev.logs.slice(-(opts.maxLogs - 1)),
              {
                line: message.line,
                level: message.level || 'info',
                agentIndex: message.agentIndex,
                featureId: message.featureId,
                source: message.source || 'system',
                timestamp: message.timestamp || new Date().toISOString(),
              },
            ],
          }));
          break;

        case 'agent_update':
          setState(prev => {
            const existingIdx = prev.activeAgents.findIndex(
              a => a.agentIndex === message.agentIndex
            );

            let newAgents = [...prev.activeAgents];

            // Remove agent if completed or errored
            if (message.state === 'success' || message.state === 'error') {
              newAgents = newAgents.filter(a => a.agentIndex !== message.agentIndex);
            } else if (existingIdx >= 0) {
              // Update existing agent
              newAgents[existingIdx] = {
                agentIndex: message.agentIndex,
                agentName: message.agentName,
                featureId: message.featureId,
                featureName: message.featureName,
                state: message.state,
                thought: message.thought,
                progress: message.progress,
                timestamp: message.timestamp || new Date().toISOString(),
              };
            } else {
              // Add new agent
              newAgents.push({
                agentIndex: message.agentIndex,
                agentName: message.agentName,
                featureId: message.featureId,
                featureName: message.featureName,
                state: message.state,
                thought: message.thought,
                progress: message.progress,
                timestamp: message.timestamp || new Date().toISOString(),
              });
            }

            return {
              ...prev,
              activeAgents: newAgents,
              recentActivity: [
                {
                  type: 'agent',
                  description: `${message.agentName} is ${message.state} on "${message.featureName}"`,
                  timestamp: message.timestamp || new Date().toISOString(),
                },
                ...prev.recentActivity.slice(0, opts.maxActivity - 1),
              ],
            };
          });
          break;

        case 'progress':
          setState(prev => ({
            ...prev,
            progress: {
              passing: message.passing,
              inProgress: message.inProgress,
              total: message.total,
              percentage: message.percentage,
            },
          }));
          break;

        case 'phase_change':
          setState(prev => ({
            ...prev,
            currentPhase: message.currentPhase,
            recentActivity: [
              {
                type: 'phase',
                description: `Phase changed: ${message.previousPhase} → ${message.currentPhase}`,
                timestamp: message.timestamp || new Date().toISOString(),
              },
              ...prev.recentActivity.slice(0, opts.maxActivity - 1),
            ],
          }));
          break;

        case 'orchestrator_update':
          setState(prev => ({
            ...prev,
            orchestratorStatus: {
              state: message.state,
              codingAgents: message.codingAgents,
              testingAgents: message.testingAgents,
              readyCount: message.readyCount,
              blockedCount: message.blockedCount,
            },
          }));
          break;

        case 'celebration':
          setState(prev => ({
            ...prev,
            celebrationQueue: [
              ...prev.celebrationQueue,
              {
                featureId: message.featureId,
                featureName: message.featureName,
                agentName: message.agentName,
                timestamp: message.timestamp || new Date().toISOString(),
              },
            ],
          }));
          break;

        case 'checkpoint':
          setState(prev => ({
            ...prev,
            recentActivity: [
              {
                type: 'checkpoint',
                description: `Checkpoint saved: ${message.message || message.checkpointId}`,
                timestamp: message.timestamp || new Date().toISOString(),
              },
              ...prev.recentActivity.slice(0, opts.maxActivity - 1),
            ],
          }));
          break;

        case 'feature_update':
          setState(prev => ({
            ...prev,
            lastFeatureUpdate: Date.now(),
            recentActivity: [
              {
                type: 'feature',
                description: `Feature "${message.title}" is now ${message.status}`,
                timestamp: message.timestamp || new Date().toISOString(),
              },
              ...prev.recentActivity.slice(0, opts.maxActivity - 1),
            ],
          }));
          break;

        case 'team_formation':
          setState(prev => ({
            ...prev,
            swarmTeam: {
              teamName: message.teamName,
              pattern: message.pattern,
              phase: message.phase || '',
              status: 'forming',
              tasksCompleted: 0,
              tasksTotal: 0,
              members: (message.members || []).map((m: { agentName: string; role: string }) => ({
                agentName: m.agentName,
                role: m.role,
                status: 'spawning',
              })),
            },
            recentActivity: [
              {
                type: 'team',
                description: `Team "${message.teamName}" formed (${message.pattern} pattern, ${message.memberCount} members)`,
                timestamp: message.timestamp || new Date().toISOString(),
              },
              ...prev.recentActivity.slice(0, opts.maxActivity - 1),
            ],
          }));
          break;

        case 'team_update':
          setState(prev => ({
            ...prev,
            swarmTeam: prev.swarmTeam
              ? {
                  ...prev.swarmTeam,
                  status: message.status || prev.swarmTeam.status,
                  tasksCompleted: message.tasksCompleted ?? prev.swarmTeam.tasksCompleted,
                  tasksTotal: message.tasksTotal ?? prev.swarmTeam.tasksTotal,
                }
              : prev.swarmTeam,
          }));
          break;

        case 'team_member_status':
          setState(prev => {
            if (!prev.swarmTeam) return prev;
            const updatedMembers = prev.swarmTeam.members.map(m =>
              m.agentName === message.agentName
                ? { ...m, status: message.status, currentTask: message.currentTask }
                : m
            );
            return {
              ...prev,
              swarmTeam: { ...prev.swarmTeam, members: updatedMembers },
            };
          });
          break;

        case 'cost_update':
          // Notify components in the SAME tab via CustomEvent (StorageEvent only fires cross-tab)
          try {
            window.dispatchEvent(new CustomEvent('aicodepath_cost_update', {
              detail: {
                sessionId: message.sessionId,
                iteration: message.iteration,
                costUsd: message.costUsd,
                timestamp: message.timestamp,
              },
            }));
            // Also write to localStorage for cross-tab notification
            window.localStorage.setItem('aicodepath_cost_update', JSON.stringify({
              sessionId: message.sessionId,
              iteration: message.iteration,
              costUsd: message.costUsd,
              timestamp: message.timestamp,
            }));
          } catch (_) { /* ignore errors */ }
          break;

        case 'session_discovered':
        case 'session_updated':
          setState(prev => ({
            ...prev,
            lastSessionUpdate: Date.now()
          }));
          break;

        case 'message_added':
          setState(prev => ({
            ...prev,
            lastSessionUpdate: Date.now()
          }));
          break;

        case 'file_changed':
          setState(prev => ({
            ...prev,
            fileChanges: [
              {
                path: (message as any).path,
                tier: (message as any).tier as 'hot' | 'cold',
                timestamp: (message as any).timestamp
              },
              ...prev.fileChanges.slice(0, 49)
            ]
          }));
          break;

        default:
          console.log('[WebSocket] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }, [opts.maxLogs, opts.maxActivity, resetHeartbeat]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('[WebSocket] Connecting to', opts.url);

    const ws = new WebSocket(opts.url);
    wsRef.current = ws;

    ws.onopen = () => {
      // Ignore events from stale WebSocket instances (e.g. React StrictMode double-mount)
      if (wsRef.current !== ws) return;
      console.log('[WebSocket] Connected');
      setState(prev => ({
        ...prev,
        isConnected: true,
        reconnectAttempts: 0,
      }));
      reconnectAttemptsRef.current = 0;
      resetHeartbeat();

      // Start periodic ping to keep connection alive
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = window.setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      handleMessage(event);
    };

    ws.onclose = (event) => {
      // Ignore close events from superseded WebSocket instances
      if (wsRef.current !== ws) return;

      console.log('[WebSocket] Disconnected:', event.code, event.reason);

      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isConnected: false,
      }));

      // Reconnect with exponential backoff
      const delay = Math.min(
        opts.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
        opts.maxReconnectDelay
      );

      reconnectAttemptsRef.current++;
      setState(prev => ({ ...prev, reconnectAttempts: reconnectAttemptsRef.current }));

      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

      reconnectTimeoutRef.current = window.setTimeout(connect, delay);
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      console.error('[WebSocket] Connection error');
    };
  }, [opts.url, opts.reconnectDelay, opts.maxReconnectDelay, handleMessage, resetHeartbeat]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  // Send message
  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send, not connected');
    }
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  // Dismiss celebration
  const dismissCelebration = useCallback(() => {
    setState(prev => ({
      ...prev,
      celebrationQueue: prev.celebrationQueue.slice(1),
    }));
  }, []);

  return {
    ...state,
    send,
    clearLogs,
    dismissCelebration,
  };
}
