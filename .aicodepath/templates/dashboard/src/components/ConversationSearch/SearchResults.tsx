import React from 'react';

export interface ContentMatch {
  blockType: string;
  lineNo: number;
  lineText: string;
  colStart: number;
  colEnd: number;
  highlightedLine: string;
}

export interface MessageMatch {
  messageID: string;
  messageIdx: number;
  sessionID: string;
  sessionName: string;
  adapterID: string;
  role: string;
  timestamp: string;
  model: string;
  matches: ContentMatch[];
  relevanceScore: number;
}

interface SearchResultsProps {
  query: string;
  results: MessageMatch[];
  resultCount: number;
  isLoading: boolean;
  error?: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowY: 'auto',
    marginTop: '12px',
  },
  meta: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    fontFamily: 'monospace',
  },
  card: {
    background: '#16213e',
    border: '1px solid #2a2a4a',
    borderRadius: '6px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#1a1a2e',
    borderBottom: '1px solid #2a2a4a',
  },
  sessionName: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#a78bfa',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    padding: '2px 7px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  userBadge: {
    background: '#1e3a5f',
    color: '#60a5fa',
  },
  assistantBadge: {
    background: '#1e3a2a',
    color: '#34d399',
  },
  adapterBadge: {
    background: '#2a1a3e',
    color: '#a78bfa',
  },
  timestamp: {
    fontSize: '11px',
    color: '#555',
    fontFamily: 'monospace',
  },
  matchesContainer: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  matchLine: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#ccc',
    background: '#1a1a2e',
    borderRadius: '3px',
    padding: '3px 8px',
    borderLeft: '3px solid #a78bfa44',
    lineHeight: 1.5,
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
  lineNo: {
    color: '#555',
    userSelect: 'none',
    marginRight: '8px',
    minWidth: '30px',
    display: 'inline-block',
    textAlign: 'right',
  },
  moreMatches: {
    fontSize: '11px',
    color: '#666',
    padding: '2px 8px',
    fontFamily: 'monospace',
  },
  emptyState: {
    textAlign: 'center',
    color: '#555',
    fontFamily: 'monospace',
    fontSize: '13px',
    padding: '40px 0',
  },
  loadingState: {
    textAlign: 'center',
    color: '#a78bfa',
    fontFamily: 'monospace',
    fontSize: '13px',
    padding: '40px 0',
  },
};

function renderHighlightedLine(line: string): React.ReactNode {
  // Convert **match** markdown bold to highlighted spans
  const parts = line.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <mark key={i} style={{ background: '#a78bfa44', color: '#e0d0ff', borderRadius: '2px', padding: '0 1px' }}>
          {part.slice(2, -2)}
        </mark>
      );
    }
    return part;
  });
}

function formatTimestamp(ts: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

export function SearchResults({ query, results, resultCount, isLoading, error }: SearchResultsProps) {
  if (isLoading) {
    return <div style={styles.loadingState}>Searching "{query}"…</div>;
  }

  if (error) {
    return <div style={{ ...styles.emptyState, color: '#f87171' }}>Error: {error}</div>;
  }

  if (!query || query.trim().length < 2) {
    return <div style={styles.emptyState}>Type at least 2 characters to search</div>;
  }

  if (results.length === 0) {
    return <div style={styles.emptyState}>No results for "{query}"</div>;
  }

  const MAX_MATCHES_PER_MESSAGE = 3;

  return (
    <div style={styles.container}>
      <div style={styles.meta}>{resultCount} message{resultCount !== 1 ? 's' : ''} matched</div>
      {results.map(result => {
        const displayedMatches = result.matches.slice(0, MAX_MATCHES_PER_MESSAGE);
        const extraCount = result.matches.length - displayedMatches.length;

        return (
          <div key={result.messageID} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.sessionName} title={result.sessionID}>
                {result.sessionName || result.sessionID}
              </span>
              <span style={{ ...styles.badge, ...(result.role === 'user' ? styles.userBadge : styles.assistantBadge) }}>
                {result.role}
              </span>
              <span style={{ ...styles.badge, ...styles.adapterBadge }}>
                {result.adapterID}
              </span>
              <span style={styles.timestamp}>{formatTimestamp(result.timestamp)}</span>
            </div>

            <div style={styles.matchesContainer}>
              {displayedMatches.map((match, i) => (
                <div key={i} style={styles.matchLine}>
                  <span style={styles.lineNo}>{match.lineNo}</span>
                  {renderHighlightedLine(match.highlightedLine)}
                </div>
              ))}
              {extraCount > 0 && (
                <div style={styles.moreMatches}>+{extraCount} more match{extraCount !== 1 ? 'es' : ''}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
