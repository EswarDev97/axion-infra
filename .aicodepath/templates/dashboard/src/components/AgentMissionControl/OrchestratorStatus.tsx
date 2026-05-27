import React from 'react';
import { Cpu, TestTube, CheckCircle2, XCircle, Activity, Zap, Users } from 'lucide-react';
import type { OrchestratorStatus as OrchestratorStatusType, SwarmTeam } from '../../hooks/useWebSocket';
import './styles.css';

interface OrchestratorStatusProps {
  status: OrchestratorStatusType;
  swarmTeam?: SwarmTeam | null;
  className?: string;
}

const STATE_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  pulse: boolean;
}> = {
  idle: {
    label: 'IDLE',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    icon: <Activity className="w-4 h-4" />,
    pulse: false,
  },
  initializing: {
    label: 'INITIALIZING',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: <Zap className="w-4 h-4" />,
    pulse: true,
  },
  orchestrating: {
    label: 'ORCHESTRATING',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: <Activity className="w-4 h-4" />,
    pulse: true,
  },
  complete: {
    label: 'COMPLETE',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: <CheckCircle2 className="w-4 h-4" />,
    pulse: false,
  },
};

export function OrchestratorStatus({ status, swarmTeam, className = '' }: OrchestratorStatusProps) {
  const config = STATE_CONFIG[status.state] || STATE_CONFIG.idle;

  return (
    <div className={`
      mc-tech-border
      rounded-xl
      bg-gradient-to-br
      from-gray-900/80
      to-gray-950/80
      backdrop-blur-sm
      p-5
      mb-6
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`
            p-2.5
            rounded-lg
            ${config.bgColor}
            ${config.borderColor}
            border-2
            ${config.pulse ? 'mc-animate-thinking' : ''}
          `}>
            <span className={config.color}>{config.icon}</span>
          </div>
          <div>
            <h3 className="mc-font-sans font-bold text-white text-lg">
              Orchestrator
            </h3>
            <div className={`
              ${config.color}
              ${config.pulse ? 'mc-animate-thinking' : ''}
              text-xs
              font-bold
              tracking-widest
              mc-font-mono
              flex
              items-center
              gap-2
            `}>
              {config.pulse && (
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              )}
              {config.label}
            </div>
          </div>
        </div>

        {/* Overall progress indicator */}
        {status.state !== 'idle' && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1 mc-font-mono">TOTAL AGENTS</div>
            <div className="text-2xl font-bold text-white mc-font-mono">
              {status.codingAgents + status.testingAgents}
            </div>
          </div>
        )}
      </div>

      {/* Swarm Team Info */}
      {swarmTeam && swarmTeam.status !== 'disbanded' && (
        <div className="mb-4 p-3 rounded-lg border-2 border-violet-500/30 bg-violet-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-violet-300 mc-font-mono">
                {swarmTeam.teamName}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 mc-font-mono uppercase">
                {swarmTeam.pattern}
              </span>
            </div>
            <div className="text-xs text-gray-500 mc-font-mono">
              {swarmTeam.tasksCompleted}/{swarmTeam.tasksTotal} tasks
            </div>
          </div>
          {swarmTeam.tasksTotal > 0 && (
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                style={{ width: `${(swarmTeam.tasksCompleted / swarmTeam.tasksTotal) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Coding Agents */}
        <StatCard
          icon={<Cpu className="w-4 h-4" />}
          label="CODING"
          value={status.codingAgents}
          color="text-cyan-400"
          bgColor="bg-cyan-950/30"
          borderColor="border-cyan-500/30"
          glowColor="rgba(6, 182, 212, 0.3)"
        />

        {/* Testing Agents */}
        <StatCard
          icon={<TestTube className="w-4 h-4" />}
          label="TESTING"
          value={status.testingAgents}
          color="text-purple-400"
          bgColor="bg-purple-950/30"
          borderColor="border-purple-500/30"
          glowColor="rgba(168, 85, 247, 0.3)"
        />

        {/* Ready Tasks */}
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="READY"
          value={status.readyCount}
          color="text-green-400"
          bgColor="bg-green-950/30"
          borderColor="border-green-500/30"
          glowColor="rgba(34, 197, 94, 0.3)"
        />

        {/* Blocked Tasks */}
        <StatCard
          icon={<XCircle className="w-4 h-4" />}
          label="BLOCKED"
          value={status.blockedCount}
          color="text-red-400"
          bgColor="bg-red-950/30"
          borderColor="border-red-500/30"
          glowColor="rgba(239, 68, 68, 0.3)"
          highlight={status.blockedCount > 0}
        />
      </div>

      {/* Progress bar */}
      {status.state === 'orchestrating' && (
        <div className="mt-5 pt-5 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs mb-2 mc-font-mono">
            <span className="text-gray-500">WORKFLOW PROGRESS</span>
            <span className="text-cyan-400">
              {status.readyCount > 0
                ? Math.round((status.readyCount / (status.readyCount + status.blockedCount)) * 100)
                : 0}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 mc-progress-fill"
              style={{
                width: `${status.readyCount > 0
                  ? (status.readyCount / (status.readyCount + status.blockedCount)) * 100
                  : 0}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  highlight?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
  borderColor,
  glowColor,
  highlight = false,
}: StatCardProps) {
  return (
    <div
      className={`
        relative
        rounded-lg
        border-2
        ${borderColor}
        ${bgColor}
        p-3
        transition-all
        duration-300
        ${highlight ? 'mc-glow-error' : ''}
        hover:brightness-110
      `}
      style={highlight ? {} : { boxShadow: `0 0 20px ${glowColor}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-gray-500 font-medium tracking-wide mc-font-mono">
          {label}
        </span>
      </div>
      <div className={`
        text-2xl
        font-bold
        ${color}
        mc-font-mono
        ${highlight ? 'mc-text-glow-amber' : ''}
      `}>
        {value.toString().padStart(2, '0')}
      </div>

      {/* Corner accent */}
      <div className={`absolute top-0 right-0 w-1.5 h-1.5 rounded-br ${color.replace('text-', 'bg-')} opacity-60`} />
    </div>
  );
}
