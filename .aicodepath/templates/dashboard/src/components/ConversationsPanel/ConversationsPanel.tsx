import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface AISession {
  id: string;
  adapter_id: string;
  adapter_name: string;
  adapter_icon: string;
  name: string;
  created_at: string;
  updated_at: string;
  duration_seconds: number;
  is_active: number; // SQLite boolean: 0 or 1
  message_count: number;
  estimated_cost_usd: number;
  total_tokens: number;
}

interface AIMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1a2e',
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
  refreshBtn: {
    background: '#312e81',
    color: '#a78bfa',
    border: '1px solid #4c1d95',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  statusText: {
    color: '#9ca3af',
    fontSize: '14px',
    padding: '16px 0',
    textAlign: 'center' as const,
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  sessionCard: {
    background: '#16213e',
    border: '1px solid #312e81',
    borderRadius: '6px',
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  sessionCardSelected: {
    borderColor: '#7c3aed',
  },
  sessionCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  adapterIcon: {
    fontSize: '18px',
  },
  adapterName: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  activeBadge: {
    background: '#065f46',
    color: '#34d399',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: 'auto',
  },
  sessionName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '6px',
  },
  sessionMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#9ca3af',
    flexWrap: 'wrap' as const,
  },
  costHighlight: {
    color: '#34d399',
  },
  updatedAt: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#6b7280',
  },
  messagesPanel: {
    marginTop: '16px',
    background: '#16213e',
    border: '1px solid #312e81',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  messagesPanelHeader: {
    padding: '10px 16px',
    background: '#1e1b4b',
    borderBottom: '1px solid #312e81',
    fontSize: '13px',
    color: '#a78bfa',
    fontWeight: 600,
  },
  messagesList: {
    maxHeight: '360px',
    overflowY: 'auto' as const,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  messageItem: {
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  messageItemUser: {
    background: '#1e3a5f',
    borderLeft: '3px solid #3b82f6',
  },
  messageItemAssistant: {
    background: '#1a2e1a',
    borderLeft: '3px solid #34d399',
  },
  messageItemOther: {
    background: '#2a1f1f',
    borderLeft: '3px solid #f59e0b',
  },
  messageRole: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
    opacity: 0.7,
  },
  messageContent: {
    color: '#d1d5db',
    wordBreak: 'break-word' as const,
  },
  errorText: {
    color: '#f87171',
    fontSize: '13px',
    padding: '8px 0',
    textAlign: 'center' as const,
  },
};

function getMessageStyle(role: string): React.CSSProperties {
  if (role === 'user') {
    return { ...styles.messageItem, ...styles.messageItemUser };
  }
  if (role === 'assistant') {
    return { ...styles.messageItem, ...styles.messageItemAssistant };
  }
  return { ...styles.messageItem, ...styles.messageItemOther };
}

export const ConversationsPanel: React.FC = () => {
  const { lastSessionUpdate } = useWebSocket();

  const [sessions, setSessions] = useState<AISession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const fetchSessions = useCallback(() => {
    setSessionsLoading(true);
    setSessionsError(null);
    fetch('/api/conversations/sessions')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { sessions: AISession[]; count: number } | AISession[]) => {
        // API returns { sessions: [...], count } but handle array fallback
        const list = Array.isArray(data) ? data : (data.sessions || []);
        setSessions(list);
        setSessionsLoading(false);
      })
      .catch(err => {
        console.error('[ConversationsPanel] Failed to fetch sessions:', err);
        setSessionsError('Failed to load sessions');
        setSessionsLoading(false);
      });
  }, []);

  const fetchMessages = useCallback((sessionId: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    fetch(`/api/conversations/${sessionId}/messages?limit=50`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { messages: AIMessage[]; count: number } | AIMessage[]) => {
        // API returns { messages: [...], count, total, ... } but handle array fallback
        const list = Array.isArray(data) ? data : (data.messages || []);
        setMessages(list);
        setMessagesLoading(false);
      })
      .catch(err => {
        console.error('[ConversationsPanel] Failed to fetch messages:', err);
        setMessagesError('Failed to load messages');
        setMessagesLoading(false);
      });
  }, []);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Re-fetch when a WebSocket session update arrives
  useEffect(() => {
    if (lastSessionUpdate !== null) {
      fetchSessions();
    }
  }, [lastSessionUpdate, fetchSessions]);

  const handleSessionClick = useCallback(
    (sessionId: string) => {
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setMessages([]);
      } else {
        setSelectedSessionId(sessionId);
        fetchMessages(sessionId);
      }
    },
    [selectedSessionId, fetchMessages]
  );

  const selectedSession = sessions.find(s => s.id === selectedSessionId) ?? null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>AI Conversations</h2>
        <button style={styles.refreshBtn} onClick={fetchSessions}>
          Refresh
        </button>
      </div>

      {sessionsLoading && (
        <div style={styles.statusText}>Loading sessions...</div>
      )}

      {!sessionsLoading && sessionsError && (
        <div style={styles.errorText}>{sessionsError}</div>
      )}

      {!sessionsLoading && !sessionsError && sessions.length === 0 && (
        <div style={styles.statusText}>No AI conversations found</div>
      )}

      {!sessionsLoading && !sessionsError && sessions.length > 0 && (
        <div style={styles.sessionList}>
          {sessions.map(session => {
            const isSelected = session.id === selectedSessionId;
            const displayName = session.name || `Session ${session.id.slice(0, 8)}`;
            const cardStyle: React.CSSProperties = isSelected
              ? { ...styles.sessionCard, ...styles.sessionCardSelected }
              : styles.sessionCard;

            return (
              <div
                key={session.id}
                style={cardStyle}
                onClick={() => handleSessionClick(session.id)}
              >
                <div style={styles.sessionCardHeader}>
                  <span style={styles.adapterIcon}>
                    {session.adapter_icon || '\u{1F916}'}
                  </span>
                  <span style={styles.adapterName}>
                    {session.adapter_name || session.adapter_id}
                  </span>
                  {session.is_active === 1 && (
                    <span style={styles.activeBadge}>Active</span>
                  )}
                </div>

                <div style={styles.sessionName}>{displayName}</div>

                <div style={styles.sessionMeta}>
                  <span>{session.message_count} messages</span>
                  <span>{session.total_tokens.toLocaleString()} tokens</span>
                  <span style={styles.costHighlight}>
                    ${session.estimated_cost_usd.toFixed(4)}
                  </span>
                  <span style={styles.updatedAt}>
                    {new Date(session.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <div style={styles.messagesPanel}>
          <div style={styles.messagesPanelHeader}>
            Messages &mdash;{' '}
            {selectedSession.name || `Session ${selectedSession.id.slice(0, 8)}`}
          </div>

          {messagesLoading && (
            <div style={{ ...styles.statusText, padding: '16px' }}>
              Loading messages...
            </div>
          )}

          {!messagesLoading && messagesError && (
            <div style={{ ...styles.errorText, padding: '16px' }}>{messagesError}</div>
          )}

          {!messagesLoading && !messagesError && messages.length === 0 && (
            <div style={{ ...styles.statusText, padding: '16px' }}>No messages found</div>
          )}

          {!messagesLoading && !messagesError && messages.length > 0 && (
            <div style={styles.messagesList}>
              {messages.map(msg => {
                const truncated =
                  msg.content.length > 200
                    ? `${msg.content.slice(0, 200)}...`
                    : msg.content;

                return (
                  <div key={msg.id} style={getMessageStyle(msg.role)}>
                    <div style={styles.messageRole}>{msg.role}</div>
                    <div style={styles.messageContent}>{truncated}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationsPanel;
