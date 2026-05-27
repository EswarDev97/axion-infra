import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDatabase } from '../hooks/useDatabase';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { Toast } from './shared/Toast';

interface CodeEntity {
  id: number;
  name: string;
  entity_type: 'class' | 'function' | 'method' | 'module' | 'component';
  file_path: string;
  complexity_score: number | null;
  criticality_level: string | null;
}

interface Dependency {
  source_id: number;
  target_id: number;
  dependency_type: string;
  strength: number;
}

const ENTITY_COLORS = {
  class: '#3b82f6',
  function: '#10b981',
  method: '#8b5cf6',
  module: '#f59e0b',
  component: '#ec4899',
} as const;

export function DependencyGraph() {
  const { data: entities } = useDatabase<CodeEntity[]>('/code-entities');
  const { data: dependencies } = useDatabase<Dependency[]>('/dependencies');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['class', 'function', 'method', 'module', 'component']));
  const [selectedEntity, setSelectedEntity] = useState<CodeEntity | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    return entities.filter(e =>
      selectedTypes.has(e.entity_type) &&
      (searchTerm === '' ||
       e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       e.file_path.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [entities, selectedTypes, searchTerm]);

  const entityTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entities?.forEach(e => {
      counts[e.entity_type] = (counts[e.entity_type] || 0) + 1;
    });
    return counts;
  }, [entities]);

  const getDependenciesFor = (entityId: number) => {
    if (!dependencies) return { incoming: 0, outgoing: 0 };
    return {
      incoming: dependencies.filter(d => d.target_id === entityId).length,
      outgoing: dependencies.filter(d => d.source_id === entityId).length,
    };
  };

  const handleEntityClick = (entity: CodeEntity) => {
    setSelectedEntity(entity);
    const deps = getDependenciesFor(entity.id);
    showToast(`${entity.name}: ${deps.incoming} in, ${deps.outgoing} out`);
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
            Dependency Observatory
          </h2>
          <p className="text-slate-400 font-light text-lg">Code entity relationships and dependencies</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {Object.entries(ENTITY_COLORS).map(([type, color], i) => (
            <motion.div
              key={type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => toggleType(type)}
              className={`bg-slate-800/30 backdrop-blur-xl border ${selectedTypes.has(type) ? 'border-blue-500' : 'border-slate-700/50'} rounded-2xl p-4 cursor-pointer transition-all`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-2xl font-bold text-white tabular-nums">
                  <AnimatedCounter value={entityTypeCounts[type] || 0} />
                </span>
              </div>
              <div className="text-sm text-slate-400 capitalize">{type}s</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-6 py-3 pl-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </motion.div>

        {/* Entity Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
        >
          <h3 className="text-2xl font-bold text-white mb-6">Code Entities</h3>
          {filteredEntities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔗</div>
              <p className="text-slate-400">No entities found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
              {filteredEntities.map((entity, i) => {
                const deps = getDependenciesFor(entity.id);
                return (
                  <motion.div
                    key={entity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => handleEntityClick(entity)}
                    onMouseEnter={() => setHoveredId(entity.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`bg-gradient-to-br from-slate-900/50 to-slate-800/30 border ${
                      selectedEntity?.id === entity.id ? 'border-blue-500' :
                      hoveredId === entity.id ? 'border-blue-500/50' :
                      'border-slate-700/50'
                    } rounded-xl p-4 cursor-pointer transition-all`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ENTITY_COLORS[entity.entity_type] }}
                        />
                        <span className="text-xs text-slate-400 capitalize">{entity.entity_type}</span>
                      </div>
                      {entity.complexity_score && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entity.complexity_score > 10 ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                          entity.complexity_score > 5 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                          'bg-green-500/20 text-green-400 border border-green-500/40'
                        }`}>
                          C: {entity.complexity_score.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <h4 className="text-white font-medium mb-2 truncate">{entity.name}</h4>
                    <p className="text-xs text-slate-500 mb-3 truncate">{entity.file_path}</p>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                        <span className="text-slate-400">{deps.incoming} in</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span className="text-slate-400">{deps.outgoing} out</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Entity Detail Modal */}
      <AnimatePresence>
        {selectedEntity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEntity(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 max-w-2xl w-full"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: ENTITY_COLORS[selectedEntity.entity_type] }}
                    />
                    <span className="text-sm text-slate-400 capitalize">{selectedEntity.entity_type}</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">{selectedEntity.name}</h3>
                  <p className="text-slate-400">{selectedEntity.file_path}</p>
                </div>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {selectedEntity.complexity_score !== null && (
                  <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">Complexity Score</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, selectedEntity.complexity_score * 5)}%` }}
                          className={`h-full ${
                            selectedEntity.complexity_score > 10 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            selectedEntity.complexity_score > 5 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-r from-green-500 to-green-600'
                          }`}
                        />
                      </div>
                      <span className="text-white font-bold">{selectedEntity.complexity_score.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {selectedEntity.criticality_level && (
                  <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">Criticality</label>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      selectedEntity.criticality_level === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                      selectedEntity.criticality_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                      'bg-green-500/20 text-green-400 border border-green-500/40'
                    }`}>
                      {selectedEntity.criticality_level}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const deps = getDependenciesFor(selectedEntity.id);
                    return (
                      <>
                        <div>
                          <label className="text-sm font-medium text-slate-400 mb-2 block">Incoming Dependencies</label>
                          <p className="text-3xl font-bold text-blue-400">{deps.incoming}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-400 mb-2 block">Outgoing Dependencies</label>
                          <p className="text-3xl font-bold text-green-400">{deps.outgoing}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
