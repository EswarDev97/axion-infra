import React, { useState, useCallback, useEffect, useRef } from 'react';

interface SearchOptions {
  useRegex: boolean;
  caseSensitive: boolean;
  adapterFilter?: string;
  roleFilter?: string;
  modelFilter?: string;
}

interface SearchBarProps {
  onSearch: (query: string, options: SearchOptions) => void;
  isLoading: boolean;
  initialQuery?: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  inputWrapper: {
    position: 'relative',
    flex: 1,
  },
  input: {
    width: '100%',
    padding: '8px 36px 8px 12px',
    background: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0',
    lineHeight: 1,
  },
  toggleBtn: {
    padding: '7px 12px',
    background: 'transparent',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  toggleBtnActive: {
    background: '#a78bfa22',
    borderColor: '#a78bfa',
    color: '#a78bfa',
  },
  filtersRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  select: {
    padding: '5px 8px',
    background: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#aaa',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none',
  },
  suggestions: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: '#16213e',
    border: '1px solid #333',
    borderRadius: '6px',
    marginTop: '4px',
    zIndex: 100,
    maxHeight: '160px',
    overflowY: 'auto' as const,
  },
  suggestionItem: {
    padding: '7px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#ccc',
    fontFamily: 'monospace',
  },
};

export function SearchBar({ onSearch, isLoading, initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [options, setOptions] = useState<SearchOptions>({ useRegex: false, caseSensitive: false });
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/conversations/search/suggestions?limit=10')
      .then(r => r.json())
      .then(data => setSuggestions(data.suggestions || []))
      .catch(() => {});
  }, []);

  const triggerSearch = useCallback((q: string, opts: SearchOptions) => {
    if (q.trim().length >= 2) onSearch(q.trim(), opts);
  }, [onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setShowSuggestions(q.length > 0 && suggestions.length > 0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => triggerSearch(q, options), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setShowSuggestions(false);
      triggerSearch(query, options);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'ArrowDown') {
      setHoveredSuggestion(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      setHoveredSuggestion(h => Math.max(h - 1, -1));
    }
  };

  const applySuggestion = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
    triggerSearch(s, options);
  };

  const toggleOption = (key: keyof SearchOptions) => {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    triggerSearch(query, next);
  };

  const handleFilterChange = (key: keyof SearchOptions, value: string) => {
    const next = { ...options, [key]: value || undefined };
    setOptions(next);
    triggerSearch(query, next);
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={{ ...styles.inputWrapper, position: 'relative' }}>
          <input
            style={styles.input}
            type="text"
            placeholder="Search conversations… (min 2 chars)"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(query.length > 0 && suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            disabled={isLoading}
            autoFocus
          />
          {query && (
            <button style={styles.clearBtn} onClick={() => { setQuery(''); setShowSuggestions(false); }}>×</button>
          )}
          {showSuggestions && (
            <div style={styles.suggestions}>
              {suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 8).map((s, i) => (
                <div
                  key={s}
                  style={{
                    ...styles.suggestionItem,
                    background: i === hoveredSuggestion ? '#1a2a4a' : 'transparent',
                  }}
                  onMouseDown={() => applySuggestion(s)}
                  onMouseEnter={() => setHoveredSuggestion(i)}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          style={{ ...styles.toggleBtn, ...(options.useRegex ? styles.toggleBtnActive : {}) }}
          onClick={() => toggleOption('useRegex')}
          title="Toggle regex search"
        >
          .*
        </button>
        <button
          style={{ ...styles.toggleBtn, ...(options.caseSensitive ? styles.toggleBtnActive : {}) }}
          onClick={() => toggleOption('caseSensitive')}
          title="Toggle case-sensitive"
        >
          Aa
        </button>
        <button
          style={{ ...styles.toggleBtn, ...(showFilters ? styles.toggleBtnActive : {}) }}
          onClick={() => setShowFilters(f => !f)}
          title="Toggle filters"
        >
          ⚙ Filters
        </button>
        {isLoading && <span style={{ color: '#a78bfa', fontSize: '12px' }}>Searching…</span>}
      </div>

      {showFilters && (
        <div style={styles.filtersRow}>
          <select
            style={styles.select}
            onChange={e => handleFilterChange('adapterFilter', e.target.value)}
            defaultValue=""
          >
            <option value="">All adapters</option>
            <option value="claude-code">Claude Code</option>
            <option value="cursor">Cursor</option>
            <option value="windsurf">Windsurf</option>
          </select>

          <select
            style={styles.select}
            onChange={e => handleFilterChange('roleFilter', e.target.value)}
            defaultValue=""
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="assistant">Assistant</option>
          </select>
        </div>
      )}
    </div>
  );
}
