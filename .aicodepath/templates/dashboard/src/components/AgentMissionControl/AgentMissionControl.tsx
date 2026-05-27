import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Activity, Radio, Minus, Maximize2 } from 'lucide-react';
import { OrchestratorStatus } from './OrchestratorStatus';
import { AgentCard } from './AgentCard';
import { ActivityFeed, ActivityItem } from './ActivityFeed';
import { AgentLogModal } from './AgentLogModal';
import type { ActiveAgent, OrchestratorStatus as OrchestratorStatusType, LogEntry } from '../../hooks/useWebSocket';
import './styles.css';

interface WorkflowSummary {
  currentPhase: string | null;
  currentStage: string | null;
  progress: {
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    percentage: number;
  } | null;
}

interface AgentMissionControlProps {
  agents: ActiveAgent[];
  orchestratorStatus: OrchestratorStatusType | null;
  recentActivity: ActivityItem[];
  agentLogs?: Map<number, string[]> | LogEntry[];
  workflowSummary?: WorkflowSummary;
  onNavigateToMonitor?: () => void;
  className?: string;
}

export function AgentMissionControl({
  agents,
  orchestratorStatus,
  recentActivity,
  agentLogs,
  workflowSummary,
  onNavigateToMonitor,
  className = '',
}: AgentMissionControlProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedAgentForLogs, setSelectedAgentForLogs] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Convert agent logs to expected format
  const agentLogsMap = useMemo(() => {
    if (agentLogs instanceof Map) {
      return agentLogs;
    }
    if (Array.isArray(agentLogs)) {
      const map = new Map<number, LogEntry[]>();
      agentLogs.forEach((log) => {
        if (log.agentIndex !== undefined) {
          const existing = map.get(log.agentIndex) || [];
          existing.push(log);
          map.set(log.agentIndex, existing);
        }
      });
      return map;
    }
    return new Map();
  }, [agentLogs]);

  // Get logs for selected agent
  const selectedAgentLogs = selectedAgentForLogs !== null
    ? (agentLogsMap.get(selectedAgentForLogs) || [])
    : [];

  const selectedAgent = agents.find(a => a.agentIndex === selectedAgentForLogs);

  // Calculate overall stats
  const stats = useMemo(() => {
    return {
      total: agents.length,
      thinking: agents.filter(a => a.state === 'thinking').length,
      working: agents.filter(a => a.state === 'working').length,
      testing: agents.filter(a => a.state === 'testing').length,
      avgProgress: agents.length > 0
        ? Math.round(agents.reduce((sum, a) => sum + (a.progress || 0), 0) / agents.length)
        : 0,
    };
  }, [agents]);

  // Show workflow summary when no agents are active
  if (agents.length === 0 && !orchestratorStatus && recentActivity.length === 0) {
    // If we have workflow data, show a summary instead of "offline"
    if (workflowSummary?.progress && workflowSummary.progress.total > 0) {
      const { progress, currentPhase, currentStage } = workflowSummary;
      return (
        <div className={`mc-tech-border rounded-xl overflow-hidden ${className}`}>
          <div className="mc-header-gradient px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="mc-font-sans font-bold text-white text-lg">Mission Control</h2>
                <span className="text-xs text-gray-500 mc-font-mono">NO ACTIVE AGENTS</span>
              </div>
            </div>
          </div>
          <div className="p-6 bg-gradient-to-br from-gray-900/80 to-gray-950/80 mc-grid-bg space-y-5">
            {/* Current phase/stage */}
            <div className="flex items-center gap-3">
              {currentPhase && (
                <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium uppercase tracking-wider">
                  {currentPhase}
                </span>
              )}
              {currentStage && (
                <span className="text-sm text-gray-400">{currentStage}</span>
              )}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400 mc-font-mono">
                  {progress.completed}/{progress.total} units completed
                </span>
                <span className="font-bold text-white tabular-nums">{progress.percentage}%</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-500 mc-progress-fill transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Status summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-400 tabular-nums">{progress.completed}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-400 tabular-nums">{progress.inProgress}</div>
                <div className="text-xs text-gray-500">In Progress</div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-400 tabular-nums">{progress.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
            </div>

            {/* Link to Monitor view */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-600 mc-font-mono">
                No active agents — workflow progress tracked via database
              </p>
              {onNavigateToMonitor && (
                <button
                  onClick={onNavigateToMonitor}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-cyan-400 hover:text-cyan-300 transition-colors mc-font-mono"
                >
                  View in Monitor →
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // No workflow data at all
    return (
      <div className={`
        mc-tech-border
        rounded-xl
        bg-gradient-to-br
        from-gray-900/50
        to-gray-950/50
        p-12
        text-center
        ${className}
      `}>
        <div className="text-5xl mb-4 opacity-30">🛰️</div>
        <h3 className="mc-font-sans font-bold text-white text-lg mb-2">
          Mission Control Offline
        </h3>
        <p className="text-gray-500 mc-font-mono text-sm">
          Awaiting agent activity...
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`
          mc-tech-border
          mc-scanlines
          rounded-xl
          overflow-hidden
          transition-all
          duration-500
          ${isFullscreen ? 'fixed inset-4 z-40' : ''}
          ${className}
        `}
      >
        {/* Header */}
        <div className="mc-header-gradient">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:brightness-110 transition-all"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`
                p-2.5
                rounded-lg
                ${agents.length > 0 ? 'bg-cyan-950/50 border border-cyan-500/30' : 'bg-gray-800/50 border border-gray-700/50'}
              `}>
                <Activity className={`
                  w-5 h-5
                  ${agents.length > 0 ? 'text-cyan-400 mc-animate-thinking' : 'text-gray-500'}
                `} />
              </div>

              {/* Title */}
              <div className="text-left">
                <h2 className="mc-font-sans font-bold text-white text-lg flex items-center gap-3">
                  Mission Control
                  {agents.length > 0 && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm">
                      <Radio className="w-3 h-3 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-400 mc-font-mono mt-0.5">
                  <span>{agents.length} AGENT{agents.length !== 1 ? 'S' : ''} ACTIVE</span>
                  {orchestratorStatus && (
                    <>
                      <span className="text-gray-700">|</span>
                      <span className={`
                        ${orchestratorStatus.state === 'orchestrating' ? 'text-cyan-400' :
                          orchestratorStatus.state === 'complete' ? 'text-green-400' :
                          orchestratorStatus.state === 'initializing' ? 'text-amber-400' :
                          'text-gray-500'}
                      `}>
                        {orchestratorStatus.state.toUpperCase()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Quick stats */}
              {agents.length > 0 && (
                <div className="hidden md:flex items-center gap-4 mr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs text-gray-400 mc-font-mono">{stats.thinking}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs text-gray-400 mc-font-mono">{stats.working}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-xs text-gray-400 mc-font-mono">{stats.testing}</span>
                  </div>
                  {stats.avgProgress > 0 && (
                    <>
                      <span className="text-gray-700">|</span>
                      <span className="text-xs text-gray-400 mc-font-mono">{stats.avgProgress}%</span>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreen(!isFullscreen);
                }}
                className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minus className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <div className={`
                p-2
                rounded-lg
                transition-all
                ${isExpanded ? 'bg-gray-800/50' : 'bg-transparent'}
              `}>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </button>

          {/* Progress bar for overall workflow */}
          {isExpanded && stats.avgProgress > 0 && (
            <div className="px-5 pb-3">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-green-500 mc-progress-fill"
                  style={{ width: `${stats.avgProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-5 bg-gradient-to-br from-gray-900/80 to-gray-950/80 mc-grid-bg">
            {/* Orchestrator Status */}
            {orchestratorStatus && (
              <OrchestratorStatus status={orchestratorStatus} />
            )}

            {/* Agent Cards Section */}
            {agents.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="mc-font-sans font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Active Agents
                  </h3>
                  <span className="text-xs text-gray-500 mc-font-mono">
                    {agents.length} OPERATIVE
                  </span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 mc-scroll">
                  {agents.map((agent) => (
                    <div key={agent.agentIndex} className="mc-animate-fade-in-up" style={{
                      animationDelay: `${agent.agentIndex * 75}ms`,
                    }}>
                      <AgentCard
                        agent={agent}
                        onViewLogs={() => setSelectedAgentForLogs(agent.agentIndex)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Feed */}
            {recentActivity.length > 0 && (
              <div className={`
                pt-5
                border-t
                border-gray-800
                ${agents.length > 0 ? 'mt-6' : ''}
              `}>
                <ActivityFeed
                  activities={recentActivity}
                  maxItems={8}
                />
              </div>
            )}

            {/* Empty state */}
            {agents.length === 0 && !orchestratorStatus && recentActivity.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-30">📡</div>
                <p className="text-gray-500 mc-font-mono text-sm">
                  No active agents or orchestrator status
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Modal */}
      {selectedAgentForLogs !== null && (
        <AgentLogModal
          agentIndex={selectedAgentForLogs}
          agent={selectedAgent}
          logs={selectedAgentLogs}
          onClose={() => setSelectedAgentForLogs(null)}
        />
      )}
    </>
  );
}

// Export individual components for direct use if needed
export { AgentCard } from './AgentCard';
export { AgentAvatar } from './AgentAvatar';
export { ActivityFeed } from './ActivityFeed';
export { OrchestratorStatus } from './OrchestratorStatus';
export { AgentLogModal } from './AgentLogModal';
