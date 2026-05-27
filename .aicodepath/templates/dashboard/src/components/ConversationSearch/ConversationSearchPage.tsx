import React, { useState, useCallback, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { SearchResults, MessageMatch } from './SearchResults';

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0f0f23',
    borderRadius: '8px',
    padding: '20px',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    color: '#a78bfa',
    fontWeight: 600,
  },
  shortcutHint: {
    fontSize: '11px',
    color: '#555',
    padding: '2px 6px',
    border: '1px solid #333',
    borderRadius: '4px',
  },
  statsBar: {
    display: 'flex',
    gap: '16px',
    padding: '8px 0',
    borderBottom: '1px solid #1a1a3a',
    marginBottom: '12px',
    fontSize: '11px',
    color: '#666',
  },
  statItem: {
    display: 'flex',
    gap: '4px',
  },
  statLabel: {
    color: '#555',
  },
  statValue: {
    color: '#a78bfa',
    fontWeight: 600,
  },
};

interface SearchStats {
  total_searches?: number;
  unique_queries?: number;
  avg_results?: number;
  avg_execution_time_ms?: number;
}

export function ConversationSearchPage() {
  const [results, setResults] = useState<MessageMatch[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentQuery, setCurrentQuery] = useState('');
  const [stats, setStats] = useState<SearchStats>({});

  // Load search stats on mount
  useEffect(() => {
    fetch('/api/conversations/search/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[type="text"]');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = useCallback(async (query: string, options: {
    useRegex: boolean;
    caseSensitive: boolean;
    adapterFilter?: string;
    roleFilter?: string;
    modelFilter?: string;
  }) => {
    setCurrentQuery(query);
    setIsLoading(true);
    setError(undefined);

    try {
      const params = new URLSearchParams({ q: query });
      if (options.useRegex) params.set('regex', '1');
      if (options.caseSensitive) params.set('case', '1');
      if (options.adapterFilter) params.set('adapter', options.adapterFilter);
      if (options.roleFilter) params.set('role', options.roleFilter);
      if (options.modelFilter) params.set('model', options.modelFilter);

      const res = await fetch(`/api/conversations/search?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results || []);
      setResultCount(data.resultCount || 0);

      // Refresh stats after search
      fetch('/api/conversations/search/stats')
        .then(r => r.json())
        .then(d => setStats(d))
        .catch(() => {});

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setResults([]);
      setResultCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Conversation Search</h2>
        <span style={styles.shortcutHint}>⌘K to focus</span>
      </div>

      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      {(stats.total_searches ?? 0) > 0 && (
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total searches:</span>
            <span style={styles.statValue}>{stats.total_searches}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Unique queries:</span>
            <span style={styles.statValue}>{stats.unique_queries}</span>
          </div>
          {stats.avg_execution_time_ms != null && (
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Avg time:</span>
              <span style={styles.statValue}>{Math.round(stats.avg_execution_time_ms)}ms</span>
            </div>
          )}
        </div>
      )}

      <SearchResults
        query={currentQuery}
        results={results}
        resultCount={resultCount}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

export default ConversationSearchPage;
