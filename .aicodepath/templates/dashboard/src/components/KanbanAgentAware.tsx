import { useState, useMemo } from 'react';
import { Plus, Sparkles, RefreshCw, SortAsc } from 'lucide-react';
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
}

interface KanbanBoardAgentAwareProps {
  tasks: Task[];
  activeAgents: ActiveAgent[];
  onAddFeature?: () => void;
  onExpandProject?: () => void;
  onRefresh?: () => void;
  onTaskClick?: (taskId: number) => void;
  isLoading?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, {
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
  order: number;
}> = {
  pending: {
    title: 'PENDING',
    color: 'gray',
    bgColor: 'bg-gray-950/30',
    borderColor: 'border-gray-500/30',
    textColor: 'text-gray-400',
    icon: '⏳',
    order: 0,
  },
  ready: {
    title: 'READY',
    color: 'amber',
    bgColor: 'bg-amber-950/30',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    icon: '🟡',
    order: 1,
  },
  in_progress: {
    title: 'IN PROGRESS',
    color: 'cyan',
    bgColor: 'bg-cyan-950/30',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    icon: '🔵',
    order: 2,
  },
  blocked: {
    title: 'BLOCKED',
    color: 'red',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    icon: '🔴',
    order: 3,
  },
  completed: {
    title: 'COMPLETED',
    color: 'green',
    bgColor: 'bg-green-950/30',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    icon: '✅',
    order: 4,
  },
  failed: {
    title: 'FAILED',
    color: 'red',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    icon: '❌',
    order: 5,
  },
  skipped: {
    title: 'SKIPPED',
    color: 'purple',
    bgColor: 'bg-purple-950/30',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    icon: '⏭️',
    order: 6,
  },
};

const PRIORITY_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  icon: string;
}> = {
  low: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-800/50',
    icon: '🔵',
  },
  medium: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/30',
    icon: '🟡',
  },
  high: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/30',
    icon: '🟠',
  },
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-950/30',
    icon: '🔴',
  },
};

const STATUSES = Object.keys(STATUS_CONFIG).sort(
  (a, b) => STATUS_CONFIG[a].order - STATUS_CONFIG[b].order
);

export function KanbanBoardAgentAware({
  tasks,
  activeAgents,
  onAddFeature,
  onExpandProject,
  onRefresh,
  onTaskClick,
  isLoading = false,
  className = '',
}: KanbanBoardAgentAwareProps) {
  const [sortBy, setSortBy] = useState<'priority' | 'effort' | 'phase'>('priority');

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    STATUSES.forEach(status => {
      grouped[status] = tasks.filter(t => t.status === status);
    });
    return grouped;
  }, [tasks]);

  // Get assigned agent for a task
  const getAssignedAgent = (taskId: number) => {
    return activeAgents.find(a => a.featureId === taskId);
  };

  // Sort tasks within columns
  const sortTasks = (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority || 'medium'] ?? 2;
        const bPriority = priorityOrder[b.priority || 'medium'] ?? 2;
        return aPriority - bPriority;
      }
      if (sortBy === 'effort') {
        return (b.estimatedEffort || 0) - (a.estimatedEffort || 0);
      }
      return a.phase.localeCompare(b.phase);
    });
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      withAgents: activeAgents.length,
    };
  }, [tasks, activeAgents]);

  return (
    <div className={className}>
      {/* Header */}
      <div className="mc-tech-border rounded-xl bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="mc-font-sans font-bold text-white text-2xl flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
              Workflow Board
            </h2>
            <p className="text-gray-500 mc-font-mono text-sm mt-1">
              {stats.total} TASKS • {stats.completed} COMPLETE • {stats.inProgress} ACTIVE • {stats.blocked} BLOCKED
            </p>
          </div>

          {/* Stats pills */}
          <div className="hidden md:flex items-center gap-2">
            {activeAgents.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/30 border border-cyan-500/30 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs text-cyan-400 mc-font-mono">{activeAgents.length} AGENT{activeAgents.length > 1 ? 'S' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={onAddFeature}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all font-medium text-sm mc-font-sans"
          >
            <Plus className="w-4 h-4" />
            Add Feature
          </button>

          <button
            onClick={onExpandProject}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-500 hover:to-violet-500 transition-all font-medium text-sm mc-font-sans"
          >
            <Sparkles className="w-4 h-4" />
            Expand with AI
          </button>

          <div className="flex-1" />

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-50 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Sort */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg">
            <SortAsc className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent text-sm text-gray-400 focus:outline-none mc-font-mono"
            >
              <option value="priority">Priority</option>
              <option value="effort">Effort</option>
              <option value="phase">Phase</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {STATUSES.map((status) => {
          const config = STATUS_CONFIG[status];
          const statusTasks = sortTasks(tasksByStatus[status] || []);
          const hasAgent = statusTasks.some(t => getAssignedAgent(t.id));

          return (
            <div key={status} className="flex flex-col mc-animate-fade-in-up" style={{
              animationDelay: `${config.order * 50}ms`,
            }}>
              {/* Column header */}
              <div className={`
                mc-tech-border
                rounded-t-xl
                ${config.bgColor}
                border-2
                ${config.borderColor}
                px-4
                py-3
                sticky
                top-0
                z-10
                backdrop-blur-sm
              `}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className={`
                      font-bold
                      text-sm
                      tracking-wide
                      ${config.textColor}
                      mc-font-sans
                    `}>
                      {config.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Agent indicator */}
                    {hasAgent && (
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                    <span className={`
                      text-sm
                      font-bold
                      mc-font-mono
                      ${config.textColor}
                    `}>
                      {statusTasks.length}
                    </span>
                  </div>
                </div>

                {/* Progress bar for in-progress column */}
                {status === 'in_progress' && statusTasks.length > 0 && (
                  <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 mc-progress-fill"
                      style={{
                        width: `${statusTasks.reduce((sum, t) => sum + (t.stepsCompleted / t.stepsTotal) * 100, 0) / statusTasks.length}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className={`
                mc-scroll
                flex-1
                rounded-b-xl
                ${config.bgColor}
                border-x-2
                ${config.borderColor}
                border-b-2
                p-2
                space-y-2
                min-h-[200px]
                max-h-[calc(100vh-400px)]
                overflow-y-auto
              `}>
                {statusTasks.map((task) => {
                  const assignedAgent = getAssignedAgent(task.id);
                  return (
                    <AgentAwareTaskCard
                      key={task.id}
                      task={task}
                      assignedAgent={assignedAgent}
                      onClick={() => onTaskClick?.(task.id)}
                    />
                  );
                })}

                {statusTasks.length === 0 && (
                  <div className="text-center py-8">
                    <span className="text-2xl opacity-30">{config.icon}</span>
                    <p className="text-xs text-gray-600 mc-font-mono mt-2">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Agent-Aware Task Card
interface AgentAwareTaskCardProps {
  task: Task;
  assignedAgent?: ActiveAgent;
  onClick?: () => void;
}

function AgentAwareTaskCard({ task, assignedAgent, onClick }: AgentAwareTaskCardProps) {
  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;

  const progressPercentage = task.stepsTotal > 0
    ? Math.round((task.stepsCompleted / task.stepsTotal) * 100)
    : 0;

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;

  return (
    <div
      onClick={onClick}
      className={`
        mc-card-hover
        relative
        mc-tech-border
        rounded-lg
        ${statusConfig.bgColor}
        ${statusConfig.borderColor}
        border
        p-3
        cursor-pointer
        transition-all
        duration-200
        ${task.status === 'blocked' ? 'mc-glow-error' : ''}
        ${assignedAgent ? 'ring-1 ring-cyan-500/30' : ''}
      `}
    >
      {/* Agent Badge Overlay */}
      {assignedAgent && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <AgentAvatar
              name={assignedAgent.agentName}
              state={assignedAgent.state}
              size="sm"
            />
            {/* State indicator dot */}
            <span className={`
              absolute
              -bottom-0.5
              -right-0.5
              w-3
              h-3
              rounded-full
              border-2
              border-gray-900
              ${assignedAgent.state === 'working' ? 'bg-cyan-400 animate-pulse' : ''}
              ${assignedAgent.state === 'thinking' ? 'bg-amber-400' : ''}
              ${assignedAgent.state === 'testing' ? 'bg-purple-400' : ''}
              ${assignedAgent.state === 'success' ? 'bg-green-400' : ''}
              ${assignedAgent.state === 'error' ? 'bg-red-400' : ''}
            `} />
          </div>
        </div>
      )}

      {/* Priority Badge */}
      {priorityConfig && task.priority !== 'low' && (
        <span className={`
          absolute
          top-2
          left-2
          px-2
          py-0.5
          text-xs
          font-medium
          rounded
          ${priorityConfig.bgColor}
          ${priorityConfig.color}
          mc-font-mono
        `}>
          {priorityConfig.icon} {task.priority?.toUpperCase()}
        </span>
      )}

      {/* Task Content */}
      <div className="mt-4 space-y-2">
        {/* CR Number */}
        {task.crNumber && (
          <div className="text-xs font-mono text-gray-500">
            CR-{task.crNumber}
          </div>
        )}

        {/* Title */}
        <h4 className="font-semibold text-sm text-gray-100 leading-snug">
          {task.unit || task.stage}
        </h4>

        {/* Phase & Stage badges */}
        <div className="flex flex-wrap gap-1">
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-950/50 text-purple-400 rounded border border-purple-500/30 mc-font-mono">
            {task.phase}
          </span>
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-950/50 text-blue-400 rounded border border-blue-500/30 mc-font-mono">
            {task.stage}
          </span>
        </div>

        {/* Agent Thought (if active) */}
        {assignedAgent?.thought && (
          <div className="mc-thought-bubble rounded p-2 border border-cyan-500/20">
            <div className="text-xs text-cyan-400/80 mb-1 mc-font-mono">
              {assignedAgent.agentName}
            </div>
            <p className="text-xs text-gray-300 italic line-clamp-2">
              "{assignedAgent.thought}"
            </p>
          </div>
        )}

        {/* Progress bar */}
        {task.stepsTotal > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500 mc-font-mono">{task.stepsCompleted}/{task.stepsTotal}</span>
              <span className="text-cyan-400 mc-font-mono font-medium">{progressPercentage}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 mc-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Blocked by indicator */}
        {task.blockedBy && task.blockedBy.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/30 px-2 py-1.5 rounded border border-amber-500/30">
            <span>⏳</span>
            <span>Waiting on {task.blockedBy.length} task{task.blockedBy.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Blockers */}
        {task.blockers && (
          <div className="text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-500/30">
            <span className="font-medium">⚠️ BLOCKED:</span> {task.blockers}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800/50 text-xs">
          <span className="text-gray-600 mc-font-mono">#{task.id.toString().padStart(4, '0')}</span>
          <div className="flex items-center gap-2">
            {task.estimatedEffort && (
              <span className="text-gray-500 mc-font-mono">{task.estimatedEffort}h</span>
            )}
            {assignedAgent && (
              <span className="text-cyan-400/80 mc-font-mono">
                {assignedAgent.agentName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status indicator line */}
      <div className={`
        absolute
        bottom-0
        left-0
        right-0
        h-0.5
        ${statusConfig.textColor.replace('text-', 'bg-')}
        opacity-50
      `} />
    </div>
  );
}


