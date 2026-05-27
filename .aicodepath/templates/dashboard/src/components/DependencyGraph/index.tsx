import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDatabase } from '../../hooks/useDatabase';
import { useGraphLayout, type LayoutDirection } from './useGraphLayout';
import TaskNode from './TaskNode';
import type { ActiveAgent } from '../../hooks/useWebSocket';

interface GraphApiResponse {
  nodes: Node[];
  edges: Edge[];
}

interface TaskDependencyGraphProps {
  activeAgents: ActiveAgent[];
  onTaskClick?: (taskId: number) => void;
}

const NODE_TYPES = { taskNode: TaskNode };

const STATUS_LEGEND = [
  { label: 'Pending', color: '#6b7280' },
  { label: 'In Progress', color: '#06b6d4' },
  { label: 'Done', color: '#22c55e' },
  { label: 'Blocked', color: '#ef4444' },
];

function TaskDependencyGraphInner({ activeAgents, onTaskClick }: TaskDependencyGraphProps) {
  const [direction, setDirection] = useState<LayoutDirection>('TB');
  const { data: graphData, loading, error } = useDatabase<GraphApiResponse>('/units/graph', 15000);

  // Merge active agents into node data
  const rawNodes = useMemo((): Node[] => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map(node => {
      const agent = activeAgents.find(a => a.featureId === Number(node.id));
      return {
        ...node,
        data: {
          ...node.data,
          assignedAgent: agent?.agentName || node.data.assignedAgent,
          agentState: agent?.state,
          onClick: onTaskClick ? () => onTaskClick(Number(node.id)) : undefined,
        },
      };
    });
  }, [graphData?.nodes, activeAgents, onTaskClick]);

  const rawEdges = useMemo((): Edge[] => {
    if (!graphData?.edges) return [];
    // Highlight edges connected to active agents
    const activeIds = new Set(activeAgents.map(a => String(a.featureId)));
    return graphData.edges.map(edge => ({
      ...edge,
      animated: activeIds.has(edge.source) || activeIds.has(edge.target),
      style: {
        stroke: activeIds.has(edge.source) ? '#06b6d4' : '#475569',
        strokeWidth: 2,
      },
    }));
  }, [graphData?.edges, activeAgents]);

  // Apply Dagre layout
  const { nodes: layoutNodes, edges: layoutEdges } = useGraphLayout(rawNodes, rawEdges, direction);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  // Sync layout into React Flow state, then fit view
  useEffect(() => {
    if (layoutNodes.length > 0) {
      setNodes(layoutNodes);
      setEdges(layoutEdges);
      // Allow React Flow to measure custom nodes before fitting
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [layoutNodes, layoutEdges, setNodes, setEdges, fitView]);

  // Stats
  const stats = useMemo(() => {
    const statusCounts = { pending: 0, in_progress: 0, done: 0, blocked: 0 };
    for (const node of rawNodes) {
      const status = node.data?.status as keyof typeof statusCounts;
      if (status in statusCounts) statusCounts[status]++;
    }
    return { ...statusCounts, total: rawNodes.length, edgeCount: rawEdges.length };
  }, [rawNodes, rawEdges]);

  const toggleDirection = useCallback(() => {
    setDirection(prev => (prev === 'LR' ? 'TB' : 'LR'));
  }, []);

  // Empty state
  if (!loading && (!graphData?.nodes || graphData.nodes.length === 0)) {
    return (
      <div className="mc-tech-border rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-12 text-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h3 className="text-xl font-bold text-white mb-2">No Workflow Data</h3>
        <p className="text-gray-500 mc-font-mono text-sm">
          Start a workflow session to see task dependencies here.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mc-tech-border rounded-xl bg-red-950/20 border-red-500/30 p-8 text-center">
        <p className="text-red-400 mc-font-mono">Failed to load graph: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mc-tech-border rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="mc-font-sans font-bold text-white text-2xl flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Dependency Graph
            </h2>
            <p className="text-gray-500 mc-font-mono text-sm mt-1">
              {stats.total} NODES / {stats.edgeCount} EDGES / {activeAgents.length} ACTIVE AGENTS
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Direction toggle */}
            <button
              onClick={toggleDirection}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all mc-font-mono bg-gray-900/50 text-gray-400 border border-gray-700 hover:border-cyan-500/50 hover:text-cyan-400"
            >
              {direction === 'LR' ? '→ LEFT-RIGHT' : '↓ TOP-BOTTOM'}
            </button>

            {/* Legend */}
            <div className="flex items-center gap-3">
              {STATUS_LEGEND.map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: item.color, display: 'inline-block' }} />
                  <span className="text-xs text-gray-500 mc-font-mono">{item.label.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="mc-tech-border rounded-xl bg-gray-950" style={{ height: 600 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          colorMode="dark"
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={20} />
          <Controls
            showInteractive={false}
            style={{ background: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
          />
          <MiniMap
            nodeColor={(node) => {
              const status = node.data?.status;
              if (status === 'done') return '#22c55e';
              if (status === 'in_progress') return '#06b6d4';
              if (status === 'blocked') return '#ef4444';
              return '#6b7280';
            }}
            maskColor="rgba(0,0,0,0.7)"
            style={{ background: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
          />
        </ReactFlow>
      </div>

      {/* Stats footer */}
      <div className="mt-4 mc-tech-border rounded-xl bg-gray-900/50 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white mc-font-mono">{stats.total}</div>
            <div className="text-xs text-gray-500">TOTAL</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400 mc-font-mono">{stats.done}</div>
            <div className="text-xs text-gray-500">DONE</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400 mc-font-mono">{stats.in_progress}</div>
            <div className="text-xs text-gray-500">ACTIVE</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400 mc-font-mono">{stats.blocked}</div>
            <div className="text-xs text-gray-500">BLOCKED</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400 mc-font-mono">{stats.pending}</div>
            <div className="text-xs text-gray-500">PENDING</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskDependencyGraph(props: TaskDependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <TaskDependencyGraphInner {...props} />
    </ReactFlowProvider>
  );
}
