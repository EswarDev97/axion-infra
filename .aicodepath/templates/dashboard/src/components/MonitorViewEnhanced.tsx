import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDatabase } from '../hooks/useDatabase';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { Toast } from './shared/Toast';
import { Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface AgentStatus {
  id: number;
  session_id: string | null;
  status: string;
  current_task: string | null;
  progress_percentage: number;
  updated_at: string;
}

interface Validation {
  id: number;
  artifact_id: number | null;
  file_path: string | null;
  validation_type: string;
  score: number | null;
  status: string | null;
  violations: string | null;
  validated_at: string;
  artifact_title: string | null;
}

interface ValidationSummary {
  validation_type: string;
  status: string;
  count: number;
  avg_score: number | null;
}

interface ArtifactStats {
  artifact_type: string;
  phase: string;
  count: number;
  last_updated: string;
}

interface ProgressData {
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  failed: number;
  skipped: number;
  total: number;
  percentage: number;
}

interface PhaseBreakdownEntry {
  phase: string;
  stage: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

interface StatusDistEntry {
  status: string;
  count: number;
}

interface RecentActivityEntry {
  phase: string;
  stage: string;
  unit: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Overview {
  counts: {
    workflows: number;
    artifacts: number;
    validations: number;
    activeAgents: number;
  };
  recentActivity: RecentActivityEntry[];
  currentPhase: string | null;
  currentStage: string | null;
  progress: ProgressData | null;
  statusDistribution: StatusDistEntry[];
  phaseBreakdown: PhaseBreakdownEntry[];
}


const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  in_progress: '#3b82f6',
  pending: '#6b7280',
  blocked: '#f59e0b',
  failed: '#ef4444',
  skipped: '#8b5cf6',
  ready: '#06b6d4',
};

export function MonitorView() {
  const { data: agents } = useDatabase<AgentStatus[]>('/agent-status');
  const { data: validations } = useDatabase<Validation[]>('/validations');
  const { data: validationSummary } = useDatabase<ValidationSummary[]>('/validation-summary');
  const { data: artifactStats } = useDatabase<ArtifactStats[]>('/artifact-stats');
  const { data: overview } = useDatabase<Overview>('/overview');
  const [toast, _setToast] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    progress: true,
    overview: true,
    phases: true,
    activity: true,
    agents: true,
    validations: true,
    artifacts: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated grain overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none bg-noise" />

      {/* Neural grid background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2 tracking-tight">
            Mission Control
          </h2>
          <p className="text-slate-400 font-light text-lg">Real-time system monitoring and analytics</p>
        </motion.div>

        {/* Workflow Progress - NEW primary section */}
        <Section title="Workflow Progress" expanded={expandedSections.progress} onToggle={() => toggleSection('progress')}>
          <WorkflowProgressSection overview={overview} />
        </Section>

        {/* Overview Cards */}
        <Section title="System Overview" expanded={expandedSections.overview} onToggle={() => toggleSection('overview')}>
          <OverviewCards overview={overview} />
        </Section>

        {/* Phase Breakdown - NEW */}
        <Section title="Phase Breakdown" expanded={expandedSections.phases} onToggle={() => toggleSection('phases')}>
          <PhaseBreakdownSection phaseBreakdown={overview?.phaseBreakdown || []} />
        </Section>

        {/* Recent Activity - NEW */}
        <Section title="Recent Activity" expanded={expandedSections.activity} onToggle={() => toggleSection('activity')}>
          <RecentActivitySection activities={overview?.recentActivity || []} />
        </Section>

        {/* Agent Status */}
        <Section title="Agent Fleet" expanded={expandedSections.agents} onToggle={() => toggleSection('agents')}>
          <AgentStatusSection agents={agents} />
        </Section>

        {/* Validation Results */}
        <Section title="Quality Metrics" expanded={expandedSections.validations} onToggle={() => toggleSection('validations')}>
          <ValidationSection validations={validations} validationSummary={validationSummary} />
        </Section>

        {/* Artifact Statistics */}
        <Section title="Artifact Distribution" expanded={expandedSections.artifacts} onToggle={() => toggleSection('artifacts')}>
          <ArtifactSection artifactStats={artifactStats} />
        </Section>
      </div>

      <Toast message={toast} />

      {/* CSS for grain */}
      <style>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0%); }
          70% { transform: translate(0%, 15%); }
          80% { transform: translate(3%, 35%); }
          90% { transform: translate(-10%, 10%); }
        }
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          animation: grain 8s steps(10) infinite;
        }
      `}</style>
    </div>
  );
}

function WorkflowProgressSection({ overview }: { overview: Overview | null }) {
  if (!overview?.progress) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4 opacity-30">📊</div>
        <p className="text-slate-400">Loading workflow data...</p>
      </div>
    );
  }

  const { progress, currentPhase, currentStage, statusDistribution: _statusDistribution } = overview;

  // Build status bar segments
  const segments = [
    { status: 'completed', count: progress.completed, color: STATUS_COLORS.completed, label: 'Completed' },
    { status: 'in_progress', count: progress.inProgress, color: STATUS_COLORS.in_progress, label: 'In Progress' },
    { status: 'pending', count: progress.pending, color: STATUS_COLORS.pending, label: 'Pending' },
    { status: 'blocked', count: progress.blocked, color: STATUS_COLORS.blocked, label: 'Blocked' },
    { status: 'failed', count: progress.failed, color: STATUS_COLORS.failed, label: 'Failed' },
    { status: 'skipped', count: progress.skipped, color: STATUS_COLORS.skipped, label: 'Skipped' },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-6">
      {/* Phase indicator + progress percentage */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {currentPhase && (
              <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium uppercase tracking-wider">
                {currentPhase}
              </span>
            )}
            {currentStage && (
              <span className="text-slate-400 text-sm">
                {currentStage}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white tabular-nums">{progress.percentage}%</div>
          <div className="text-xs text-slate-500">{progress.completed} of {progress.total} completed</div>
        </div>
      </div>

      {/* Stacked progress bar */}
      <div>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
          {segments.map((seg) => (
            <motion.div
              key={seg.status}
              initial={{ width: 0 }}
              animate={{ width: `${(seg.count / progress.total) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full"
              style={{ backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.count}`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {segments.map((seg) => (
            <div key={seg.status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-slate-400">
                {seg.label}: <span className="text-white font-medium tabular-nums">{seg.count}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status distribution cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {segments.map((seg, i) => (
          <motion.div
            key={seg.status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-center"
          >
            <div className="text-2xl font-bold text-white tabular-nums mb-1">
              <AnimatedCounter value={seg.count} />
            </div>
            <div className="text-xs font-medium" style={{ color: seg.color }}>
              {seg.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PhaseBreakdownSection({ phaseBreakdown }: { phaseBreakdown: PhaseBreakdownEntry[] }) {
  if (!phaseBreakdown || phaseBreakdown.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4 opacity-30">📋</div>
        <p className="text-slate-400">No phase data available</p>
      </div>
    );
  }

  // Group by phase
  const phases = new Map<string, PhaseBreakdownEntry[]>();
  for (const entry of phaseBreakdown) {
    const existing = phases.get(entry.phase) || [];
    existing.push(entry);
    phases.set(entry.phase, existing);
  }

  return (
    <div className="space-y-6">
      {Array.from(phases.entries()).map(([phase, stages], phaseIdx) => {
        const phaseTotal = stages.reduce((s, e) => s + e.total, 0);
        const phaseCompleted = stages.reduce((s, e) => s + e.completed, 0);
        const phasePct = phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;

        return (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: phaseIdx * 0.1 }}
            className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5"
          >
            {/* Phase header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 text-xs font-medium uppercase tracking-wider">
                  {phase}
                </span>
                <span className="text-sm text-slate-400">
                  {phaseCompleted}/{phaseTotal} units
                </span>
              </div>
              <span className="text-lg font-bold text-white tabular-nums">{phasePct}%</span>
            </div>

            {/* Phase progress bar */}
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${phasePct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
              />
            </div>

            {/* Stages */}
            <div className="space-y-2">
              {stages.map((stage, _i) => {
                const stagePct = stage.total > 0 ? Math.round((stage.completed / stage.total) * 100) : 0;
                return (
                  <div key={`${phase}-${stage.stage}`} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 w-48 truncate" title={stage.stage}>
                      {stage.stage}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stagePct}%`,
                          backgroundColor: stagePct === 100 ? STATUS_COLORS.completed : STATUS_COLORS.in_progress,
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums w-20 text-right">
                      {stage.completed}/{stage.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function RecentActivitySection({ activities }: { activities: RecentActivityEntry[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4 opacity-30">📡</div>
        <p className="text-slate-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600/50 transition-all"
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: STATUS_COLORS[activity.status] || '#6b7280' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 uppercase tracking-wider">
                {activity.phase}
              </span>
              <span className="text-sm text-white truncate">
                {activity.unit || activity.stage}
              </span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
            activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            activity.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
            activity.status === 'failed' ? 'bg-red-500/20 text-red-400' :
            activity.status === 'blocked' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-slate-600/20 text-slate-400'
          }`}>
            {activity.status}
          </span>
          {activity.started_at && (
            <span className="text-xs text-slate-600 tabular-nums flex-shrink-0">
              {new Date(activity.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function Section({ title, children, expanded, onToggle }: { title: string; children: React.ReactNode; expanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-all"
      >
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function OverviewCards({ overview }: { overview: Overview | null }) {
  if (!overview) return null;

  const cards = [
    { label: 'Workflows', value: overview.counts.workflows, color: 'blue', gradient: 'from-blue-500/10 to-blue-600/5', icon: '📊' },
    { label: 'Artifacts', value: overview.counts.artifacts, color: 'green', gradient: 'from-green-500/10 to-green-600/5', icon: '📄' },
    { label: 'Validations', value: overview.counts.validations, color: 'purple', gradient: 'from-purple-500/10 to-purple-600/5', icon: '✅' },
    { label: 'Active Agents', value: overview.counts.activeAgents, color: 'orange', gradient: 'from-orange-500/10 to-orange-600/5', icon: '🤖' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.02, translateY: -4 }}
          className={`bg-gradient-to-br ${card.gradient} backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 cursor-pointer relative overflow-hidden group`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br from-${card.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">{card.icon}</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            </div>
            <div className="text-4xl font-bold text-white mb-2 tabular-nums">
              <AnimatedCounter value={card.value} />
            </div>
            <div className="text-sm text-slate-400 font-light">{card.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AgentStatusSection({ agents }: { agents: AgentStatus[] | null }) {
  if (!agents || agents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🤖</div>
        <p className="text-slate-400">No agents currently active</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {agents.slice(0, 10).map((agent, i) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.01, x: 4 }}
          className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/50 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${agent.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
              <div>
                <div className="text-white font-medium">{agent.current_task || 'Idle'}</div>
                <div className="text-xs text-slate-500">Session: {agent.session_id || 'N/A'}</div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
              agent.status === 'running' ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
              agent.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
              'bg-slate-600/20 text-slate-400 border border-slate-600/40'
            }`}>
              {agent.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${agent.progress_percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
              />
            </div>
            <span className="text-sm text-white font-medium tabular-nums">{agent.progress_percentage}%</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ValidationSection({ validations, validationSummary }: { validations: Validation[] | null; validationSummary: ValidationSummary[] | null }) {
  if (!validations || validations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-slate-400">No validations recorded yet</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = validationSummary?.map(v => ({
    name: v.validation_type,
    pass: v.status === 'PASS' ? v.count : 0,
    review: v.status === 'REVIEW' ? v.count : 0,
    fail: v.status === 'FAIL' ? v.count : 0
  })) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="text-lg font-bold text-white mb-4">Recent Validations</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {validations.slice(0, 10).map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">{v.validation_type}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  v.status === 'PASS' ? 'bg-green-500/20 text-green-400' :
                  v.status === 'FAIL' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {v.status}
                </span>
              </div>
              {v.file_path && (
                <div className="text-xs text-slate-500 mt-1 truncate">{v.file_path}</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-lg font-bold text-white mb-4">Status Distribution</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
            <Legend />
            <Bar dataKey="pass" fill="#10b981" />
            <Bar dataKey="review" fill="#f59e0b" />
            <Bar dataKey="fail" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ArtifactSection({ artifactStats }: { artifactStats: ArtifactStats[] | null }) {
  if (!artifactStats || artifactStats.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📄</div>
        <p className="text-slate-400">No artifacts created yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {artifactStats.map((stat, i) => (
        <motion.div
          key={`${stat.artifact_type}-${stat.phase}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.03 }}
          className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-5 cursor-pointer hover:border-purple-500/50 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📄</span>
            <span className="text-3xl font-bold text-white tabular-nums">
              <AnimatedCounter value={stat.count} />
            </span>
          </div>
          <div className="text-white font-medium capitalize">{stat.artifact_type}</div>
          <div className="text-xs text-slate-500 mt-1">Phase: {stat.phase}</div>
        </motion.div>
      ))}
    </div>
  );
}
