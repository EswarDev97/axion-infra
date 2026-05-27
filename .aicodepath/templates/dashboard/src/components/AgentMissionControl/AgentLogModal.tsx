import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Download, Maximize2, Minimize2 } from 'lucide-react';
import type { ActiveAgent, LogEntry } from '../../hooks/useWebSocket';
import { AgentAvatar } from './AgentAvatar';
import './styles.css';

interface AgentLogModalProps {
  agentIndex: number;
  agent: ActiveAgent | undefined;
  logs: LogEntry[];
  onClose: () => void;
}

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVEL_CONFIG: Record<LogLevel, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  all: { label: 'ALL', color: 'text-gray-400', bgColor: 'bg-gray-800', icon: '📋' },
  info: { label: 'INFO', color: 'text-cyan-400', bgColor: 'bg-cyan-950/50', icon: 'ℹ️' },
  warn: { label: 'WARN', color: 'text-amber-400', bgColor: 'bg-amber-950/50', icon: '⚠️' },
  error: { label: 'ERROR', color: 'text-red-400', bgColor: 'bg-red-950/50', icon: '❌' },
  debug: { label: 'DEBUG', color: 'text-purple-400', bgColor: 'bg-purple-950/50', icon: '🔍' },
};

const LOG_LEVELS: LogLevel[] = ['all', 'info', 'warn', 'error', 'debug'];

export function AgentLogModal({ agentIndex, agent, logs, onClose }: AgentLogModalProps) {
  const [filterLevel, setFilterLevel] = useState<LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (filterLevel !== 'all' && log.level !== filterLevel) {
        return false;
      }

      // Agent filter
      if (log.agentIndex !== undefined && log.agentIndex !== agentIndex) {
        return false;
      }

      // Search filter
      if (searchQuery && !log.line.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [logs, filterLevel, searchQuery, agentIndex]);

  // Log level counts
  const logCounts = useMemo(() => {
    const counts = { all: 0, info: 0, warn: 0, error: 0, debug: 0 };
    logs.forEach(log => {
      if (log.agentIndex === agentIndex || log.agentIndex === undefined) {
        counts.all++;
        counts[log.level]++;
      }
    });
    return counts;
  }, [logs, agentIndex]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Export logs
  const exportLogs = () => {
    const content = filteredLogs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.line}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${agentIndex}-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="mc-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`
          mc-tech-border
          mc-scanlines
          rounded-2xl
          bg-gradient-to-br
          from-gray-900
          to-gray-950
          shadow-2xl
          w-full
          ${isExpanded ? 'max-w-6xl h-[90vh]' : 'max-w-4xl h-[80vh]'}
          flex
          flex-col
          mc-animate-fade-in-up
          mc-grid-bg
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mc-header-gradient rounded-t-2xl p-5 border-b border-gray-800">
          <div className="flex items-start justify-between">
            {/* Agent info */}
            <div className="flex items-center gap-4">
              <AgentAvatar
                name={agent?.agentName || 'Unknown'}
                state={agent?.state || 'working'}
                size="lg"
              />
              <div>
                <h2 className="mc-font-sans font-bold text-white text-xl flex items-center gap-3">
                  {agent?.agentName || `Agent #${agentIndex}`}
                  <span className="text-sm font-normal text-gray-500 mc-font-mono">
                    IDX: {agentIndex.toString().padStart(2, '0')}
                  </span>
                </h2>
                {agent && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-400">{agent.featureName}</span>
                    <span className={`
                      text-xs
                      px-2
                      py-0.5
                      rounded
                      font-medium
                      ${agent.state === 'working' ? 'bg-cyan-950/50 text-cyan-400' :
                        agent.state === 'thinking' ? 'bg-amber-950/50 text-amber-400' :
                        agent.state === 'testing' ? 'bg-purple-950/50 text-purple-400' :
                        'bg-green-950/50 text-green-400'}
                      mc-font-mono
                    `}>
                      {agent.state.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={exportLogs}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Export logs"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-red-950/50 text-gray-400 hover:text-red-400 transition-colors"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mt-5">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 mc-font-mono text-sm"
              />
            </div>

            {/* Level filters */}
            <div className="flex items-center gap-2">
              {LOG_LEVELS.map((level) => {
                const config = LOG_LEVEL_CONFIG[level];
                const count = logCounts[level];

                return (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    className={`
                      px-3
                      py-2
                      rounded-lg
                      border
                      text-sm
                      font-medium
                      transition-all
                      mc-font-mono
                      flex
                      items-center
                      gap-2
                      ${filterLevel === level
                        ? `${config.bgColor} ${config.color} border-${config.color.replace('text-', '')}/50`
                        : 'bg-gray-900/50 text-gray-500 border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                    <span className={`
                      text-xs
                      px-1.5
                      py-0.5
                      rounded
                      ${filterLevel === level ? 'bg-black/30' : 'bg-gray-800'}
                    `}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Log count summary */}
        <div className="px-5 py-2 bg-gray-950/50 border-b border-gray-800 flex items-center justify-between text-xs mc-font-mono">
          <span className="text-gray-500">
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
          <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-gray-300">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
        </div>

        {/* Logs content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto mc-scroll p-4 bg-gray-950/30"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="text-4xl mb-3">📭</div>
              <p className="mc-font-mono text-sm">No logs to display</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, idx) => (
                <LogLine key={`${log.timestamp}-${idx}`} log={log} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-900/50 border-t border-gray-800 rounded-b-2xl flex items-center justify-between text-xs mc-font-mono">
          <span className="text-gray-500">
            Agent {agentIndex} • Feature {agent?.featureId || 'N/A'}
          </span>
          <span className="text-gray-600">
            Press ESC to close
          </span>
        </div>
      </div>
    </div>
  );
}

interface LogLineProps {
  log: LogEntry;
}

function LogLine({ log }: LogLineProps) {
  const config = LOG_LEVEL_CONFIG[log.level] || LOG_LEVEL_CONFIG.info;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className={`
      group
      flex
      items-start
      gap-3
      py-2
      px-3
      rounded-lg
      hover:bg-gray-900/50
      transition-colors
      border
      border-transparent
      hover:border-gray-800
      ${config.bgColor}
    `}>
      {/* Timestamp */}
      <span className="text-xs text-gray-600 mc-font-mono whitespace-nowrap">
        {formatTime(log.timestamp)}
      </span>

      {/* Level badge */}
      <span className={`
        text-xs
        px-1.5
        py-0.5
        rounded
        font-medium
        ${config.bgColor}
        ${config.color}
        mc-font-mono
        whitespace-nowrap
      `}>
        {config.icon} {log.level.toUpperCase()}
      </span>

      {/* Log message */}
      <span className={`
        text-sm
        ${config.color}
        flex-1
        break-all
        font-mono
        leading-relaxed
      `}>
        {log.line}
      </span>

      {/* Source indicator */}
      {log.source && (
        <span className="text-xs text-gray-600 mc-font-mono whitespace-nowrap">
          {log.source}
        </span>
      )}
    </div>
  );
}
