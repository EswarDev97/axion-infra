import { useState, useEffect, useRef } from 'react';
import { useDatabase } from '../hooks/useDatabase';
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

export function VisualMemoryView() {
  const { data: diagrams, loading } = useDatabase<VisualDiagram[]>('/visual-memory');
  const { data: stats } = useDatabase<Stats>('/visual-memory/stats');

  const [selectedDiagram, setSelectedDiagram] = useState<VisualDiagram | null>(null);
  const [filter, setFilter] = useState({
    type: 'all',
    scope: 'all',
    staleness: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'name' | 'staleness'>('date');

  // Filtered and sorted diagrams
  const filteredDiagrams = diagrams?.filter(d => {
    if (filter.type !== 'all' && d.diagramType !== filter.type) return false;
    if (filter.scope !== 'all' && d.scope !== filter.scope) return false;
    if (filter.staleness !== 'all') {
      const daysSinceUpdate = (Date.now() - new Date(d.lastValidated).getTime()) / (1000 * 60 * 60 * 24);
      if (filter.staleness === 'fresh' && daysSinceUpdate > 7) return false;
      if (filter.staleness === 'stale' && daysSinceUpdate <= 7) return false;
    }
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

  if (loading && !diagrams) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-light tracking-wider">Loading Visual Memory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
        {/* Header Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Visual Memory
              </h2>
              <p className="text-slate-400 font-light">Neural architecture visualization system</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
              <span>Last sync: {stats?.lastSync || 'Never'}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-3xl font-bold text-white mb-1">{stats?.total || 0}</div>
                <div className="text-sm text-slate-400">Total Diagrams</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{stats?.staleness.fresh || 0}</div>
                <div className="text-sm text-slate-400">Fresh</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-yellow-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{stats?.staleness.stale || 0}</div>
                <div className="text-sm text-slate-400">Stale</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-3xl font-bold text-purple-400 mb-1">
                  {stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(0)}%` : '—'}
                </div>
                <div className="text-sm text-slate-400">Avg Confidence</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="🔍 Search diagrams..."
                  value={filter.search}
                  onChange={e => setFilter({ ...filter, search: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filter.type}
                  onChange={e => setFilter({ ...filter, type: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="date">Latest First</option>
                  <option value="confidence">Highest Confidence</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="staleness">Most Stale</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Diagram Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDiagrams.map((diagram) => {
            const typeInfo = DIAGRAM_TYPES[diagram.diagramType as keyof typeof DIAGRAM_TYPES] || DIAGRAM_TYPES.flowchart;
            const staleness = getStalenessInfo(diagram);

            return (
              <div
                key={diagram.id}
                onClick={() => setSelectedDiagram(diagram)}
                className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 cursor-pointer hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden"
              >
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${typeInfo.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeInfo.color} flex items-center justify-center text-2xl shadow-lg`}>
                        {typeInfo.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg leading-tight">{diagram.title}</h3>
                        <p className="text-slate-500 text-xs mt-0.5">{typeInfo.label} • {diagram.scope}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {diagram.description && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{diagram.description}</p>
                  )}

                  {/* Metadata Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Confidence */}
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getConfidenceColor(diagram.confidence)}`}>
                      {(diagram.confidence * 100).toFixed(0)}% confident
                    </span>

                    {/* Staleness */}
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${staleness.color} bg-slate-900/50 border border-slate-700/50`}>
                      {staleness.icon} {staleness.label}
                    </span>

                    {/* Generation Method */}
                    <span className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                      {diagram.generationMethod.toUpperCase()}
                    </span>

                    {/* Sync Strategy */}
                    {diagram.syncStrategy === 'eager' && (
                      <span className="px-3 py-1 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/40">
                        ⚡ Eager
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {diagram.relevanceTags && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {JSON.parse(diagram.relevanceTags || '[]').slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-700/50">
                    <span>Updated {new Date(diagram.lastValidated).toLocaleDateString()}</span>
                    <span className="text-blue-400 group-hover:text-blue-300 transition-colors">View →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDiagrams.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🧠</div>
            <h3 className="text-2xl font-bold text-white mb-2">No diagrams found</h3>
            <p className="text-slate-400">Try adjusting your filters or generate new diagrams</p>
          </div>
        )}
      </div>

      {/* Modal for diagram detail */}
      {selectedDiagram && (
        <DiagramModal
          diagram={selectedDiagram}
          onClose={() => setSelectedDiagram(null)}
        />
      )}
    </div>
  );
}

// Diagram Detail Modal Component
function DiagramModal({ diagram, onClose }: { diagram: VisualDiagram; onClose: () => void }) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!mermaidRef.current) return;

      try {
        setRendering(true);
        setRenderError(null);

        // Generate unique ID
        const id = `mermaid-${diagram.id}-${Date.now()}`;

        // Render mermaid
        const { svg } = await mermaid.render(id, diagram.mermaidContent);

        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setRenderError(error instanceof Error ? error.message : 'Failed to render diagram');
      } finally {
        setRendering(false);
      }
    };

    renderDiagram();
  }, [diagram]);

  const typeInfo = DIAGRAM_TYPES[diagram.diagramType as keyof typeof DIAGRAM_TYPES] || DIAGRAM_TYPES.flowchart;
  const staleness = (Date.now() - new Date(diagram.lastValidated).getTime()) / (1000 * 60 * 60 * 24);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(diagram.mermaidContent);
    alert('Mermaid code copied to clipboard!');
  };

  const regenerateDiagram = async () => {
    try {
      await fetch(`/api/visual-memory/regenerate/${diagram.id}`, { method: 'POST' });
      alert('Diagram regeneration queued!');
      onClose();
    } catch (error) {
      alert('Failed to regenerate diagram');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-blue-500/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${typeInfo.color} flex items-center justify-center text-3xl shadow-lg`}>
              {typeInfo.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{diagram.title}</h2>
              <p className="text-slate-400 text-sm">{typeInfo.label} Diagram • {diagram.scope}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-h-[calc(90vh-120px)] overflow-auto">
          {/* Diagram Rendering */}
          <div className="lg:col-span-2">
            <div className="bg-slate-950/50 border border-slate-700/50 rounded-2xl p-6 min-h-[400px] flex items-center justify-center">
              {rendering && (
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-400 text-sm">Rendering diagram...</p>
                </div>
              )}
              {renderError && (
                <div className="text-center">
                  <div className="text-4xl mb-3">⚠️</div>
                  <p className="text-red-400 font-medium mb-2">Rendering Error</p>
                  <p className="text-slate-500 text-sm">{renderError}</p>
                </div>
              )}
              <div ref={mermaidRef} className="w-full" style={{ display: rendering || renderError ? 'none' : 'block' }} />
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="space-y-4">
            {/* Confidence */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Confidence Score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${diagram.confidence >= 0.8 ? 'bg-emerald-500' : diagram.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${diagram.confidence * 100}%` }}
                  />
                </div>
                <span className="text-white font-bold">{(diagram.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Staleness */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Freshness</div>
              <div className="flex items-center gap-2">
                <span className={staleness < 7 ? 'text-emerald-400' : staleness < 30 ? 'text-yellow-400' : 'text-red-400'}>
                  {staleness < 7 ? '🟢' : staleness < 30 ? '🟡' : '🔴'}
                </span>
                <span className="text-white font-medium">
                  {staleness < 1 ? 'Today' : `${Math.floor(staleness)} days ago`}
                </span>
              </div>
            </div>

            {/* Generation Method */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Generation Method</div>
              <div className="text-white font-medium">{diagram.generationMethod.toUpperCase()}</div>
            </div>

            {/* Sync Strategy */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Sync Strategy</div>
              <div className="text-white font-medium capitalize">{diagram.syncStrategy}</div>
            </div>

            {/* Tags */}
            {diagram.relevanceTags && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {JSON.parse(diagram.relevanceTags || '[]').map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Files */}
            {diagram.sourceFiles && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">Source Files</div>
                <div className="text-xs text-slate-300 space-y-1 max-h-32 overflow-auto">
                  {JSON.parse(diagram.sourceFiles || '[]').map((file: string, i: number) => (
                    <div key={i} className="truncate">{file}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={copyToClipboard}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
              >
                📋 Copy Mermaid Code
              </button>
              <button
                onClick={regenerateDiagram}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
              >
                🔄 Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
