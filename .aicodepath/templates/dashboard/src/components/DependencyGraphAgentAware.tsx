import { useMemo, useState } from 'react';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { AgentAvatar } from './AgentMissionControl/AgentAvatar';
import type { ActiveAgent } from '../hooks/useWebSocket';
import './AgentMissionControl/styles.css';

// Task types matching the workflow state structure
export interface Task {
  id: number;
  crNumber: string | null;
  phase: string;
  stage: string;
  unit: string | null;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'skipped';
  startedAt: string | null;
  completedAt: string | null;
  stepsTotal: number;
  stepsCompleted: number;
  artifactsCreated: string | null;
  notes: string | null;
  blockers: string | null;
  blockedBy?: number[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort?: number;
  x?: number;
  y?: number;
}

interface DependencyGraphProps {
  tasks: Task[];
  activeAgents: ActiveAgent[];
  onTaskClick?: (taskId: number) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
  icon: string;
}> = {
  pending: {
    bg: 'bg-gray-950/50',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    icon: '⏳',
  },
  ready: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: '🟡',
  },
  in_progress: {
    bg: 'bg-cyan-950/50',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    icon: '🔵',
  },
  blocked: {
    bg: 'bg-red-950/50',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: '🔴',
  },
  completed: {
    bg: 'bg-green-950/50',
    border: 'border-green-500/30',
    text: 'text-green-400',
    icon: '✅',
  },
  failed: {
    bg: 'bg-red-950/50',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: '❌',
  },
  skipped: {
    bg: 'bg-purple-950/50',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    icon: '⏭️',
  },
};

type LayoutDirection = 'horizontal' | 'vertical' | 'radial';

export function DependencyGraphAgentAware({
  tasks,
  activeAgents,
  onTaskClick,
  onRefresh,
  isLoading = false,
  className = '',
}: DependencyGraphProps) {
  const [layout, setLayout] = useState<LayoutDirection>('horizontal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);

  // Get assigned agent for a task
  const getAssignedAgent = (taskId: number) => {
    return activeAgents.find(a => a.featureId === taskId);
  };

  // Calculate graph layout (simple hierarchical layout)
  const graphData = useMemo(() => {
    // Create levels based on dependencies
    const levels: Map<number, number> = new Map();
    const visited = new Set<number>();

    const calculateLevel = (taskId: number, level: number): number => {
      if (visited.has(taskId)) {
        return levels.get(taskId) || 0;
      }
      visited.add(taskId);

      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.blockedBy || !Array.isArray(task.blockedBy) || task.blockedBy.length === 0) {
        levels.set(taskId, level);
        return level;
      }

      const maxDepLevel = Math.max(
        ...task.blockedBy
          .filter(depId => typeof depId === 'number' || typeof depId === 'string')
          .map(depId => calculateLevel(depId, level + 1))
      );
      levels.set(taskId, maxDepLevel + 1);
      return maxDepLevel + 1;
    };

    // Calculate levels for all tasks
    tasks.forEach(task => {
      if (!levels.has(task.id)) {
        calculateLevel(task.id, 0);
      }
    });

    // Group by levels
    const tasksByLevel: Map<number, Task[]> = new Map();
    levels.forEach((level, taskId) => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        if (!tasksByLevel.has(level)) {
          tasksByLevel.set(level, []);
        }
        tasksByLevel.get(level)!.push(task);
      }
    });

    // Calculate positions
    const nodePositions: Map<number, { x: number; y: number }> = new Map();
    const nodeSize = { width: 200, height: 80 };
    const gap = { x: 50, y: 100 };

    if (layout === 'radial') {
      // Radial layout
      const centerX = 400;
      const centerY = 300;

      tasks.forEach(task => {
        const level = levels.get(task.id) || 0;
        const tasksInLevel = tasksByLevel.get(level) || [];
        const index = tasksInLevel.indexOf(task);
        const angle = (index / tasksInLevel.length) * Math.PI * 2 - Math.PI / 2;
        const radius = (level + 1) * 120;

        nodePositions.set(task.id, {
          x: centerX + Math.cos(angle) * radius - nodeSize.width / 2,
          y: centerY + Math.sin(angle) * radius - nodeSize.height / 2,
        });
      });
    } else {
      // Hierarchical layout
      tasksByLevel.forEach((levelTasks, level) => {
        levelTasks.forEach((task, index) => {
          if (layout === 'horizontal') {
            nodePositions.set(task.id, {
              x: level * (nodeSize.width + gap.x),
              y: index * (nodeSize.height + gap.y),
            });
          } else {
            nodePositions.set(task.id, {
              x: index * (nodeSize.width + gap.x),
              y: level * (nodeSize.height + gap.y),
            });
          }
        });
      });
    }

    // Create edges
    const edges: Array<{ from: number; to: number; hasAgent: boolean }> = [];
    tasks.forEach(task => {
      if (task.blockedBy) {
        task.blockedBy.forEach(blockedById => {
          edges.push({
            from: blockedById,
            to: task.id,
            hasAgent: activeAgents.some(a => a.featureId === blockedById),
          });
        });
      }
    });

    return { nodePositions, edges, levels };
  }, [tasks, activeAgents, layout]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      blocked: tasks.filter(t => t.status === 'blocked' || (Array.isArray(t.blockedBy) && t.blockedBy.length > 0)).length,
      withAgents: activeAgents.length,
      maxLevel: Math.max(...Array.from(graphData.levels.values()), 0),
    };
  }, [tasks, activeAgents, graphData.levels]);

  // Get SVG dimensions
  const svgDimensions = useMemo(() => {
    if (graphData.nodePositions.size === 0) {
      return { width: 800, height: 600 };
    }

    let maxX = 0, maxY = 0;
    graphData.nodePositions.forEach(pos => {
      maxX = Math.max(maxX, pos.x + 200);
      maxY = Math.max(maxY, pos.y + 80);
    });

    return {
      width: Math.max(800, maxX + 100),
      height: Math.max(600, maxY + 100),
    };
  }, [graphData.nodePositions]);

  return (
    <div className={className}>
      {/* Header */}
      <div className="mc-tech-border rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="mc-font-sans font-bold text-white text-2xl flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Dependency Graph
            </h2>
            <p className="text-gray-500 mc-font-mono text-sm mt-1">
              {stats.total} NODES • DEPTH {stats.maxLevel} • {activeAgents.length} ACTIVE AGENTS
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {activeAgents.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/30 border border-cyan-500/30 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs text-cyan-400 mc-font-mono">{activeAgents.length} AGENT{activeAgents.length > 1 ? 'S' : ''}</span>
              </div>
            )}

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-50 transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Layout controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 mc-font-mono">LAYOUT:</span>
          <div className="flex items-center gap-2">
            {(['horizontal', 'vertical', 'radial'] as LayoutDirection[]).map((layoutOption) => (
              <button
                key={layoutOption}
                onClick={() => setLayout(layoutOption)}
                className={`
                  px-3
                  py-1.5
                  rounded-lg
                  text-sm
                  font-medium
                  transition-all
                  mc-font-mono
                  ${layout === layoutOption
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-gray-900/50 text-gray-500 border border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                {layoutOption === 'horizontal' && '→ HORIZONTAL'}
                {layoutOption === 'vertical' && '↓ VERTICAL'}
                {layoutOption === 'radial' && '◯ RADIAL'}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-500" />
              <span className="text-gray-500 mc-font-mono">ACTIVE DEP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-gray-600" />
              <span className="text-gray-500 mc-font-mono">BLOCKED BY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph canvas */}
      <div className={`
        mc-tech-border
        mc-grid-bg
        rounded-xl
        bg-gradient-to-br
        from-gray-900/80
        to-gray-950/80
        overflow-auto
        mc-scroll
        ${isFullscreen ? 'fixed inset-4 z-40' : ''}
      `}>
        <svg
          width={svgDimensions.width}
          height={svgDimensions.height}
          className="min-w-full min-h-full"
          style={{ minWidth: svgDimensions.width, minHeight: svgDimensions.height }}
        >
          {/* Edge definitions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#64748b"
              />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#06b6d4"
              />
            </marker>
          </defs>

          {/* Edges */}
          {graphData.edges.map((edge, idx) => {
            const fromPos = graphData.nodePositions.get(edge.from);
            const toPos = graphData.nodePositions.get(edge.to);

            if (!fromPos || !toPos) return null;

            const fromX = fromPos.x + 100;
            const fromY = fromPos.y + 40;
            const toX = toPos.x + 100;
            const toY = toPos.y + 40;

            return (
              <g key={`edge-${idx}`}>
                {/* Animated glow for active edges */}
                {edge.hasAgent && (
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="#06b6d4"
                    strokeWidth="4"
                    strokeOpacity="0.3"
                    className="mc-animate-pulse"
                  />
                )}

                {/* Main edge */}
                <path
                  d={`M ${fromX} ${fromY} L ${toX} ${toY}`}
                  stroke={edge.hasAgent ? '#06b6d4' : '#475569'}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={`url(#arrowhead${edge.hasAgent ? '-active' : ''})`}
                  strokeDasharray={edge.hasAgent ? '5,5' : undefined}
                  className={edge.hasAgent ? 'mc-animate-thinking' : ''}
                  style={{
                    animationDirection: 'reverse',
                    ...(edge.hasAgent ? { animationDuration: '1s' } : {}),
                  }}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {tasks.map(task => {
            const pos = graphData.nodePositions.get(task.id);
            const agent = getAssignedAgent(task.id);
            const statusConfig = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
            const isHovered = hoveredTask === task.id;
            const isSelected = selectedTask?.id === task.id;

            if (!pos) return null;

            return (
              <g
                key={task.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => {
                  setSelectedTask(task);
                  onTaskClick?.(task.id);
                }}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
                style={{ cursor: 'pointer' }}
                className="mc-animate-fade-in-up"
              >
                {/* Node background */}
                <rect
                  width="200"
                  height="80"
                  rx="8"
                  className={`
                    ${statusConfig.bg}
                    ${statusConfig.border}
                    border-2
                    transition-all
                    duration-200
                    ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
                    ${isHovered ? 'brightness-125' : ''}
                  `}
                  fill="currentColor"
                />

                {/* Agent indicator glow */}
                {agent && (
                  <rect
                    width="200"
                    height="80"
                    rx="8"
                    fill="#06b6d4"
                    fillOpacity="0.1"
                    className="mc-animate-thinking"
                  />
                )}

                {/* Status indicator bar */}
                <rect
                  width="200"
                  height="3"
                  y={0}
                  className={statusConfig.text.replace('text-', 'fill-')}
                  fill="currentColor"
                  opacity="0.5"
                />

                {/* Content */}
                <g transform="translate(10, 15)">
                  {/* Agent avatar */}
                  {agent && (
                    <foreignObject x="0" y="0" width="32" height="32">
                      <AgentAvatar
                        name={agent.agentName}
                        state={agent.state}
                        size="sm"
                      />
                    </foreignObject>
                  )}

                  {/* Task info */}
                  <text
                    x={agent ? 40 : 0}
                    y={10}
                    className={`
                      ${statusConfig.text}
                      text-sm
                      font-semibold
                      mc-font-sans
                      fill="currentColor"
                    `}
                  >
                    {task.unit || task.stage || `Task ${task.id}`}
                  </text>

                  {/* Status */}
                  <text
                    x={agent ? 40 : 0}
                    y={28}
                    className="text-xs text-gray-500 mc-font-mono"
                    fill="currentColor"
                  >
                    {task.status.replace('_', ' ')}
                  </text>

                  {/* Agent thought */}
                  {agent?.thought && (
                    <text
                      x={agent ? 40 : 0}
                      y={45}
                      className="text-xs text-cyan-400 mc-font-mono italic"
                      fill="currentColor"
                    >
                      "{agent.thought.slice(0, 25)}..."
                    </text>
                  )}

                  {/* Progress */}
                  {task.stepsTotal > 0 && (
                    <g transform={`translate(${agent ? 40 : 0}, 52)`}>
                      <rect
                        width="100"
                        height="4"
                        rx="2"
                        fill="#1f2937"
                      />
                      <rect
                        width={(task.stepsCompleted / task.stepsTotal) * 100}
                        height="4"
                        rx="2"
                        fill="#06b6d4"
                        className="mc-progress-fill"
                      />
                    </g>
                  )}
                </g>

                {/* Blocked indicator */}
                {task.blockedBy && task.blockedBy.length > 0 && (
                  <>
                    <circle
                      cx="180"
                      cy="15"
                      r="8"
                      className="bg-amber-950/50 border border-amber-500/30"
                      fill="#1f2937"
                      stroke="#f59e0b"
                      strokeWidth="1"
                    />
                    <text
                      x="180"
                      y="19"
                      textAnchor="middle"
                      className="text-xs"
                      fill="#f59e0b"
                    >
                      ⏳
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Task detail overlay */}
        {selectedTask && (
          <div className="absolute bottom-4 right-4 mc-tech-border rounded-xl bg-gray-900/95 backdrop-blur-sm p-4 max-w-sm mc-animate-fade-in-up">
            <div className="flex items-start justify-between mb-3">
              <h3 className="mc-font-sans font-bold text-white">
                {selectedTask.unit || selectedTask.stage || `Task ${selectedTask.id}`}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-500 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={STATUS_COLORS[selectedTask.status]?.text}>
                  {STATUS_COLORS[selectedTask.status]?.icon} {selectedTask.status}
                </span>
              </div>

              {getAssignedAgent(selectedTask.id) && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Agent</span>
                  <span className="text-cyan-400">
                    {getAssignedAgent(selectedTask.id)?.agentName}
                  </span>
                </div>
              )}

              {selectedTask.blockedBy && selectedTask.blockedBy.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Blocked by</span>
                  <span className="text-amber-400">
                    {selectedTask.blockedBy.length} task{selectedTask.blockedBy.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {selectedTask.estimatedEffort && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Est. effort</span>
                  <span className="text-gray-300">{selectedTask.estimatedEffort}h</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onTaskClick?.(selectedTask.id);
                setSelectedTask(null);
              }}
              className="w-full mt-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              View Details
            </button>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="mt-4 mc-tech-border rounded-xl bg-gray-900/50 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white mc-font-mono">{stats.total}</div>
            <div className="text-xs text-gray-500">TOTAL</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400 mc-font-mono">{stats.completed}</div>
            <div className="text-xs text-gray-500">DONE</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400 mc-font-mono">{stats.inProgress}</div>
            <div className="text-xs text-gray-500">ACTIVE</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400 mc-font-mono">{stats.blocked}</div>
            <div className="text-xs text-gray-500">BLOCKED</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400 mc-font-mono">{stats.maxLevel + 1}</div>
            <div className="text-xs text-gray-500">LEVELS</div>
          </div>
        </div>
      </div>
    </div>
  );
}


