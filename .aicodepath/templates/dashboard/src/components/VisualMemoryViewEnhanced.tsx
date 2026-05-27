import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDatabase } from '../hooks/useDatabase';
import { DiagramViewer } from './DiagramViewer';
import mermaid from 'mermaid';

// Types
interface VisualDiagram {
  id: number;
  diagramType: string;
  name: string;
  scope: string;
  unitName: string | null;
  title: string;
  description: string | null;
  mermaidContent: string;
  generationMethod: string;
  confidence: number;
  sourceFiles: string;
  syncStrategy: string;
  priority: number;
  relevanceTags: string;
  isStale: number;
  lastValidated: string;
  createdAt: string;
}

interface Stats {
  total: number;
  byType: Record<string, number>;
  staleness: { fresh: number; stale: number; veryStale: number };
  avgConfidence: number;
  lastSync: string;
}

// Diagram type icons and colors
const DIAGRAM_TYPES = {
  class: { icon: '📦', label: 'Class', color: 'from-purple-500 to-pink-500' },
  er: { icon: '🗄️', label: 'ER', color: 'from-blue-500 to-cyan-500' },
  flowchart: { icon: '🔀', label: 'Flowchart', color: 'from-green-500 to-emerald-500' },
  sequence: { icon: '⏱️', label: 'Sequence', color: 'from-orange-500 to-amber-500' },
  journey: { icon: '🚶', label: 'Journey', color: 'from-indigo-500 to-violet-500' }
};

// Filter presets
const FILTER_PRESETS = [
  { id: 'all', label: 'All Diagrams', filters: {} },
  { id: 'fresh', label: 'Fresh Only', filters: { staleness: 'fresh' } },
  { id: 'stale', label: 'Needs Refresh', filters: { staleness: 'stale' } },
  { id: 'high-confidence', label: 'High Confidence', filters: { minConfidence: 0.8 } },
  { id: 'eager-sync', label: 'Auto-Sync', filters: { syncStrategy: 'eager' } }
];

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#e5e7eb',
    primaryBorderColor: '#60a5fa',
    lineColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    tertiaryColor: '#ec4899',
    background: '#111827',
    mainBkg: '#1f2937',
    secondBkg: '#374151'
  }
});

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      setCount(Math.floor(progress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{count}</>;
}

export function VisualMemoryView() {
  const { data: diagrams, loading } = useDatabase<VisualDiagram[]>('/visual-memory');
  const { data: stats } = useDatabase<Stats>('/visual-memory/stats');

  const [selectedDiagram, setSelectedDiagram] = useState<VisualDiagram | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState('all');

  const [filter, setFilter] = useState({
    type: 'all',
    scope: 'all',
    staleness: 'all',
    search: '',
    minConfidence: 0
  });
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'name' | 'staleness'>('date');

  // Apply preset
  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const preset = FILTER_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFilter({ ...filter, ...preset.filters });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilter({
      type: 'all',
      scope: 'all',
      staleness: 'all',
      search: '',
      minConfidence: 0
    });
    setActivePreset('all');
  };

  // Count active filters
  const activeFilterCount = Object.values(filter).filter(v => v !== 'all' && v !== '' && v !== 0).length;

  // Filtered and sorted diagrams
  const filteredDiagrams = diagrams?.filter(d => {
    if (filter.type !== 'all' && d.diagramType !== filter.type) return false;
    if (filter.scope !== 'all' && d.scope !== filter.scope) return false;
    if (filter.staleness !== 'all') {
      const daysSinceUpdate = (Date.now() - new Date(d.lastValidated).getTime()) / (1000 * 60 * 60 * 24);
      if (filter.staleness === 'fresh' && daysSinceUpdate > 7) return false;
      if (filter.staleness === 'stale' && daysSinceUpdate <= 7) return false;
    }
    if (filter.minConfidence && d.confidence < filter.minConfidence) return false;
    if (filter.search && !d.title.toLowerCase().includes(filter.search.toLowerCase()) &&
        !d.relevanceTags?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'confidence': return b.confidence - a.confidence;
      case 'name': return a.title.localeCompare(b.title);
      case 'staleness': return new Date(a.lastValidated).getTime() - new Date(b.lastValidated).getTime();
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  }) || [];

  const getStalenessInfo = (diagram: VisualDiagram) => {
    const daysSinceUpdate = (Date.now() - new Date(diagram.lastValidated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) return { color: 'text-emerald-400', icon: '🟢', label: 'Fresh' };
    if (daysSinceUpdate < 30) return { color: 'text-yellow-400', icon: '🟡', label: 'Stale' };
    return { color: 'text-red-400', icon: '🔴', label: 'Very Stale' };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (confidence >= 0.5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    return 'bg-red-500/20 text-red-400 border-red-500/40';
  };

  const copyToClipboard = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    setShowToast(message);
    setTimeout(() => setShowToast(null), 3000);
  };

  const regenerateDiagram = async (id: number) => {
    try {
      await fetch(`/api/visual-memory/regenerate/${id}`, { method: 'POST' });
      setShowToast('Diagram regeneration queued!');
      setTimeout(() => setShowToast(null), 3000);
    } catch (error) {
      setShowToast('Failed to regenerate diagram');
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  if (loading && !diagrams) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-6"
          />
          <p className="text-slate-400 font-light tracking-wider text-lg">Loading Visual Memory...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated grain overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none bg-noise" />

      {/* Neural grid background effect */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #3b82f6 1px, transparent 1px),
            linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 px-8 py-6">
        {/* Header with animated title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 tracking-tight">
                Visual Memory
              </h2>
              <p className="text-slate-400 font-light text-lg">Neural architecture visualization observatory</p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex items-center gap-2 text-sm text-slate-500"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
              />
              <span>Last sync: {stats?.lastSync || 'Never'}</span>
            </motion.div>
          </div>

          {/* Enhanced Stats Grid with animated counters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            {[
              { label: 'Total Diagrams', value: stats?.total || 0, color: 'blue', gradient: 'from-blue-500/10 to-blue-600/5' },
              { label: 'Fresh', value: stats?.staleness.fresh || 0, color: 'emerald', gradient: 'from-emerald-500/10 to-emerald-600/5' },
              { label: 'Stale', value: stats?.staleness.stale || 0, color: 'yellow', gradient: 'from-yellow-500/10 to-yellow-600/5' },
              { label: 'Avg Confidence', value: stats?.avgConfidence ? Math.round(stats.avgConfidence * 100) : 0, color: 'purple', gradient: 'from-purple-500/10 to-purple-600/5', suffix: '%' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group cursor-pointer`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="text-4xl font-bold text-white mb-2 tabular-nums">
                    <AnimatedCounter value={stat.value} />{stat.suffix || ''}
                  </div>
                  <div className="text-sm text-slate-400 font-light">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Filter Presets */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 mr-2">Quick filters:</span>
              {FILTER_PRESETS.map((preset) => (
                <motion.button
                  key={preset.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => applyPreset(preset.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activePreset === preset.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {preset.label}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Advanced Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  🔍
                </div>
                <input
                  type="text"
                  placeholder="Search diagrams..."
                  value={filter.search}
                  onChange={e => setFilter({ ...filter, search: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filter.type}
                  onChange={e => setFilter({ ...filter, type: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">All Types</option>
                  {Object.entries(DIAGRAM_TYPES).map(([key, { icon, label }]) => (
                    <option key={key} value={key}>{icon} {label}</option>
                  ))}
                </select>
              </div>

              {/* Staleness Filter */}
              <div>
                <select
                  value={filter.staleness}
                  onChange={e => setFilter({ ...filter, staleness: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="fresh">🟢 Fresh</option>
                  <option value="stale">🟡 Stale</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="date">Latest First</option>
                  <option value="confidence">Highest Confidence</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="staleness">Most Stale</option>
                </select>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearFilters}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 font-medium transition-all flex items-center justify-center gap-2"
                >
                  <span>Clear ({activeFilterCount})</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Diagram Grid with staggered animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDiagrams.map((diagram, index) => {
            const typeInfo = DIAGRAM_TYPES[diagram.diagramType as keyof typeof DIAGRAM_TYPES] || DIAGRAM_TYPES.flowchart;
            const staleness = getStalenessInfo(diagram);

            return (
              <motion.div
                key={diagram.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.02, translateY: -4 }}
                onClick={() => setSelectedDiagram(diagram)}
                className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 cursor-pointer hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden"
              >
                {/* Glow effect */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`absolute inset-0 bg-gradient-to-br ${typeInfo.color} opacity-5`}
                />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${typeInfo.color} flex items-center justify-center text-3xl shadow-lg`}
                      >
                        {typeInfo.icon}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg leading-tight truncate">{diagram.title}</h3>
                        <p className="text-slate-500 text-xs mt-1">{typeInfo.label} • {diagram.scope}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {diagram.description && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2 leading-relaxed">{diagram.description}</p>
                  )}

                  {/* Metadata Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getConfidenceColor(diagram.confidence)}`}
                    >
                      {(diagram.confidence * 100).toFixed(0)}% confident
                    </motion.span>

                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${staleness.color} bg-slate-900/50 border border-slate-700/50`}
                    >
                      {staleness.icon} {staleness.label}
                    </motion.span>

                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                    >
                      {diagram.generationMethod.toUpperCase()}
                    </motion.span>

                    {diagram.syncStrategy === 'eager' && (
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/40"
                      >
                        ⚡ Eager
                      </motion.span>
                    )}
                  </div>

                  {/* Tags */}
                  {diagram.relevanceTags && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {JSON.parse(diagram.relevanceTags || '[]').slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Actions (shown on hover) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute top-4 right-4 flex gap-2"
                  >
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(diagram.mermaidContent, 'Diagram code copied!');
                      }}
                      className="w-9 h-9 rounded-lg bg-slate-800/90 backdrop-blur-sm hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-lg"
                      title="Copy code"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </motion.button>
                  </motion.div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-700/50">
                    <span>Updated {new Date(diagram.lastValidated).toLocaleDateString()}</span>
                    <motion.span
                      whileHover={{ x: 3 }}
                      className="text-blue-400 group-hover:text-blue-300 transition-colors font-medium"
                    >
                      View →
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredDiagrams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl mb-6"
            >
              🧠
            </motion.div>
            <h3 className="text-3xl font-bold text-white mb-3">No diagrams found</h3>
            <p className="text-slate-400 text-lg mb-6">Try adjusting your filters or generate new diagrams</p>
            {activeFilterCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearFilters}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all"
              >
                Clear all filters
              </motion.button>
            )}
          </motion.div>
        )}
      </div>

      {/* Enhanced Modal */}
      <AnimatePresence>
        {selectedDiagram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !isFullscreen && setSelectedDiagram(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 rounded-3xl ${
                isFullscreen ? 'w-screen h-screen' : 'max-w-7xl w-full max-h-[90vh]'
              } overflow-hidden shadow-2xl shadow-blue-500/20`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              {!isFullscreen && (
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                        DIAGRAM_TYPES[selectedDiagram.diagramType as keyof typeof DIAGRAM_TYPES]?.color || DIAGRAM_TYPES.flowchart.color
                      } flex items-center justify-center text-4xl shadow-lg`}
                    >
                      {DIAGRAM_TYPES[selectedDiagram.diagramType as keyof typeof DIAGRAM_TYPES]?.icon || DIAGRAM_TYPES.flowchart.icon}
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedDiagram.title}</h2>
                      <p className="text-slate-400 text-sm">
                        {DIAGRAM_TYPES[selectedDiagram.diagramType as keyof typeof DIAGRAM_TYPES]?.label || 'Diagram'} • {selectedDiagram.scope}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05, rotate: 180 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center"
                      title="Toggle fullscreen"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, rotate: 90 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDiagram(null)}
                      className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center"
                    >
                      ✕
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className={`grid ${sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[70%_30%]'} gap-6 p-6 ${
                isFullscreen ? 'h-full' : 'max-h-[calc(90vh-120px)]'
              } overflow-auto`}>
                {/* Diagram Viewer */}
                <div className="relative h-full min-h-[70vh]">
                  <DiagramViewer
                    mermaidContent={selectedDiagram.mermaidContent}
                    diagramId={selectedDiagram.id}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                    diagramTitle={selectedDiagram.title}
                  />
                </div>

                {/* Metadata Sidebar */}
                {!sidebarCollapsed && !isFullscreen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* Sidebar Collapse Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSidebarCollapsed(true)}
                      className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl px-4 py-2 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm">Collapse sidebar</span>
                    </motion.button>

                    {/* Metadata cards... (continuing in next message due to length) */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <div className="text-xs text-slate-500 mb-2">Confidence Score</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedDiagram.confidence * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={`h-full ${
                              selectedDiagram.confidence >= 0.8 ? 'bg-emerald-500' :
                              selectedDiagram.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-white font-bold">{(selectedDiagram.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* More metadata sections */}
                    <div className="space-y-3">
                      {[
                        { label: 'Freshness', value: getStalenessInfo(selectedDiagram).label, icon: getStalenessInfo(selectedDiagram).icon },
                        { label: 'Method', value: selectedDiagram.generationMethod.toUpperCase() },
                        { label: 'Strategy', value: selectedDiagram.syncStrategy.charAt(0).toUpperCase() + selectedDiagram.syncStrategy.slice(1) }
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
                        >
                          <div className="text-xs text-slate-500 mb-2">{item.label}</div>
                          <div className="text-white font-medium flex items-center gap-2">
                            {item.icon && <span>{item.icon}</span>}
                            {item.value}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => copyToClipboard(selectedDiagram.mermaidContent, 'Code copied!')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Mermaid Code
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => regenerateDiagram(selectedDiagram.id)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const svg = document.querySelector('.diagram-content svg');
                          if (!svg) return;
                          const clone = svg.cloneNode(true) as SVGSVGElement;
                          const vb = clone.getAttribute('viewBox');
                          let w = 1920, h = 1080;
                          if (vb) { const p = vb.split(' ').map(Number); w = p[2] || 1920; h = p[3] || 1080; }
                          clone.setAttribute('width', String(w * 2));
                          clone.setAttribute('height', String(h * 2));
                          const style = document.createElement('style');
                          style.textContent = '* { font-family: sans-serif; } .node rect, .node circle, .node polygon { stroke: #60a5fa; fill: #1f2937; } .label, text { fill: #e5e7eb; } line { stroke: #374151; }';
                          clone.insertBefore(style, clone.firstChild);
                          const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                          bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#0f172a');
                          clone.insertBefore(bg, clone.firstChild);
                          const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const img = new Image();
                          img.onload = () => {
                            const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
                            const ctx = c.getContext('2d'); if (!ctx) return;
                            ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
                            URL.revokeObjectURL(url);
                            c.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${selectedDiagram.title || 'diagram'}.png`; a.click(); URL.revokeObjectURL(a.href); }, 'image/png');
                          };
                          img.src = url;
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download as PNG
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Collapsed sidebar button */}
                {sidebarCollapsed && !isFullscreen && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSidebarCollapsed(false)}
                    className="fixed right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-24 bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700 border border-slate-700/50 rounded-l-xl flex items-center justify-center text-white transition-all shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl shadow-emerald-500/50 flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS for grain texture */}
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
