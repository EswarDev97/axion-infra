import React from 'react';
import { ChevronRight, Activity, Clock, Zap } from 'lucide-react';
import { AgentAvatar } from './AgentAvatar';
import type { ActiveAgent } from '../../hooks/useWebSocket';
import './styles.css';

interface AgentCardProps {
  agent: ActiveAgent;
  onViewLogs: () => void;
  className?: string;
}

const STATE_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  animation: string;
  glowClass: string;
}> = {
  thinking: {
    label: 'THINKING',
    icon: <Activity className="w-3 h-3" />,
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-gradient-to-br from-amber-950/30 to-orange-950/20',
    textColor: 'text-amber-400',
    accentColor: 'text-amber-500',
    animation: 'mc-animate-thinking',
    glowClass: 'mc-glow-thinking',
  },
  working: {
    label: 'WORKING',
    icon: <Zap className="w-3 h-3" />,
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-gradient-to-br from-cyan-950/30 to-blue-950/20',
    textColor: 'text-cyan-400',
    accentColor: 'text-cyan-500',
    animation: 'mc-animate-working',
    glowClass: 'mc-glow-working',
  },
  testing: {
    label: 'TESTING',
    icon: <Activity className="w-3 h-3" />,
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-gradient-to-br from-purple-950/30 to-violet-950/20',
    textColor: 'text-purple-400',
    accentColor: 'text-purple-500',
    animation: 'mc-animate-testing',
    glowClass: 'mc-glow-testing',
  },
  success: {
    label: 'COMPLETE',
    icon: <Activity className="w-3 h-3" />,
    borderColor: 'border-green-500/30',
    bgColor: 'bg-gradient-to-br from-green-950/30 to-emerald-950/20',
    textColor: 'text-green-400',
    accentColor: 'text-green-500',
    animation: '',
    glowClass: 'mc-glow-success',
  },
  error: {
    label: 'ERROR',
    icon: <Activity className="w-3 h-3" />,
    borderColor: 'border-red-500/30',
    bgColor: 'bg-gradient-to-br from-red-950/30 to-rose-950/20',
    textColor: 'text-red-400',
    accentColor: 'text-red-500',
    animation: '',
    glowClass: 'mc-glow-error',
  },
};

const STATUS_ICONS: Record<string, string> = {
  thinking: '🤔',
  working: '⚡',
  testing: '🧪',
  success: '✅',
  error: '❌',
};

export function AgentCard({ agent, onViewLogs, className = '' }: AgentCardProps) {
  const config = STATE_CONFIG[agent.state] || STATE_CONFIG.working;
  const statusIcon = STATUS_ICONS[agent.state] || '⚡';

  // Calculate duration if timestamp is available
  const duration = agent.timestamp
    ? Math.floor((Date.now() - new Date(agent.timestamp).getTime()) / 1000)
    : null;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div
      className={`
        mc-card-hover
        relative
        flex-shrink-0
        w-72
        rounded-xl
        border-2
        ${config.borderColor}
        ${config.bgColor}
        ${config.glowClass}
        p-4
        transition-all
        duration-300
        ${className}
      `}
    >
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-4 right-4 h-0.5 ${config.accentColor} bg-current opacity-60`} />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={config.animation}>
          <AgentAvatar
            name={agent.agentName}
            state={agent.state}
            size="md"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Agent name */}
          <h3 className="mc-font-sans font-bold text-white text-base truncate mb-1">
            {agent.agentName}
          </h3>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`
              ${config.textColor}
              ${config.animation}
              text-xs
              font-bold
              tracking-wider
              flex
              items-center
              gap-1.5
              mc-font-mono
            `}>
              {statusIcon}
              {config.label}
            </span>

            {/* Duration indicator */}
            {duration !== null && duration > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500 mc-font-mono">
                <Clock className="w-3 h-3" />
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Task/Feature name */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 mc-font-mono">
          TASK
        </div>
        <p className="text-sm text-gray-200 font-medium line-clamp-2 leading-snug">
          {agent.featureName}
        </p>
      </div>

      {/* Thought bubble */}
      {agent.thought && (
        <div className="mc-thought-bubble rounded-lg p-3 mb-3">
          <div className="text-xs text-cyan-400/80 uppercase tracking-wider mb-1.5 mc-font-mono">
            THOUGHT
          </div>
          <p className="text-sm text-gray-300 italic line-clamp-2 leading-relaxed">
            "{agent.thought}"
          </p>
        </div>
      )}

      {/* Progress bar */}
      {agent.progress !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-500 mc-font-mono">PROGRESS</span>
            <span className={`
              ${config.accentColor}
              font-bold
              mc-font-mono
              mc-text-glow-cyan
            `}>
              {agent.progress}%
            </span>
          </div>
          <div className="relative h-2 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
            {/* Background grid pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full" style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 4px)',
              }} />
            </div>
            {/* Progress fill */}
            <div
              className={`
                mc-progress-fill
                h-full
                rounded-full
                relative
                overflow-hidden
              `}
              style={{
                width: `${agent.progress}%`,
                background: config.accentColor === 'text-amber-500'
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : config.accentColor === 'text-cyan-500'
                  ? 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                  : config.accentColor === 'text-purple-500'
                  ? 'linear-gradient(90deg, #a855f7, #c084fc)'
                  : 'linear-gradient(90deg, #22c55e, #4ade80)',
              }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Feature ID */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-600 mc-font-mono">
          ID: {agent.featureId.toString().padStart(4, '0')}
        </span>
        <span className="text-xs text-gray-600 mc-font-mono">
          IDX: {agent.agentIndex}
        </span>
      </div>

      {/* View logs button */}
      <button
        onClick={onViewLogs}
        className={`
          w-full
          group
          flex
          items-center
          justify-center
          gap-2
          py-2.5
          px-4
          rounded-lg
          border
          ${config.borderColor}
          ${config.bgColor}
          text-sm
          ${config.textColor}
          font-medium
          transition-all
          duration-200
          hover:scale-[1.02]
          hover:brightness-110
          active:scale-[0.98]
          mc-font-mono
        `}
      >
        <span>VIEW LOGS</span>
        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current opacity-40" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-current opacity-40" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-current opacity-40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current opacity-40" />
    </div>
  );
}
