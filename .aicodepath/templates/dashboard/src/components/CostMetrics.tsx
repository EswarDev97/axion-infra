import React, { useState, useEffect, useCallback } from 'react';

interface CostSummary {
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  session_count: number;
  iteration_count: number;
}

type Period = 'daily' | 'weekly' | 'monthly';

export const CostMetrics: React.FC = () => {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback((p: Period) => {
    setLoading(true);
    fetch(`/api/cost/summary?period=${p}`)
      .then(res => res.json())
      .then(data => { setSummary(data); setLoading(false); })
      .catch(err => {
        console.error('[CostMetrics] Failed to fetch cost summary:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSummary(period);
  }, [period, fetchSummary]);

  // Listen for real-time cost updates:
  // - CustomEvent for same-tab (dispatched by useWebSocket)
  // - StorageEvent for cross-tab
  useEffect(() => {
    const handleCostUpdate = () => fetchSummary(period);
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'aicodepath_cost_update') handleCostUpdate();
    };
    window.addEventListener('aicodepath_cost_update', handleCostUpdate);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('aicodepath_cost_update', handleCostUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [period, fetchSummary]);

  const avgCostPerIteration =
    summary && summary.iteration_count > 0
      ? summary.total_cost_usd / summary.iteration_count
      : 0;

  const totalTokens =
    summary
      ? summary.total_input_tokens + summary.total_output_tokens
      : 0;

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-6xl mb-4 opacity-30">💰</div>
        <p>Loading cost data...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-red-400">
        <div className="text-6xl mb-4 opacity-30">💰</div>
        <p>Failed to load cost data</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Spend',
      value: `$${summary.total_cost_usd.toFixed(4)}`,
      subtitle: `${summary.session_count} sessions`,
      color: 'from-green-500/10 to-green-600/5',
      accent: 'text-green-400',
    },
    {
      title: 'Avg per Iteration',
      value: `$${avgCostPerIteration.toFixed(4)}`,
      subtitle: `${summary.iteration_count} iterations`,
      color: 'from-cyan-500/10 to-cyan-600/5',
      accent: 'text-cyan-400',
    },
    {
      title: 'Total Tokens',
      value: totalTokens.toLocaleString(),
      subtitle: `In: ${summary.total_input_tokens.toLocaleString()} | Out: ${summary.total_output_tokens.toLocaleString()}`,
      color: 'from-blue-500/10 to-blue-600/5',
      accent: 'text-blue-400',
    },
    {
      title: 'Cache Tokens',
      value: (summary.cache_read_tokens + summary.cache_write_tokens).toLocaleString(),
      subtitle: `Read: ${summary.cache_read_tokens.toLocaleString()} | Write: ${summary.cache_write_tokens.toLocaleString()}`,
      color: 'from-purple-500/10 to-purple-600/5',
      accent: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Cost & Token Usage</h2>
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button
              key={p}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`bg-gradient-to-br ${card.color} backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6`}
          >
            <h3 className="text-sm text-slate-400 mb-2">{card.title}</h3>
            <div className={`text-3xl font-bold tabular-nums mb-1 ${card.accent}`}>
              {card.value}
            </div>
            <div className="text-xs text-slate-500">{card.subtitle}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CostMetrics;
