import { useState, useEffect } from 'react';
import { X, MessageSquare, History } from 'lucide-react';
import { AssistantChat } from './AssistantChat';
import { ConversationHistory } from './ConversationHistory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const STORAGE_KEY_PREFIX = 'assistant-conversations-';

/**
 * AssistantPanel - AI Assistant slide-in panel with chat interface
 */
export function AssistantPanel({ isOpen, onClose, projectName }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${projectName}`;

  // Load conversations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
        if (parsed.length > 0 && !activeConversationId) {
          setActiveConversationId(parsed[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [storageKey, activeConversationId]);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(conversations));
    }
  }, [conversations, storageKey]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const startNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setShowHistory(false);
  };

  const addMessage = (message: ChatMessage) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== activeConversationId) return conv;

        const updatedMessages = [...conv.messages, message];

        // Update title from first user message
        let title = conv.title;
        if (conv.messages.length === 0 && message.role === 'user') {
          title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        }

        return { ...conv, messages: updatedMessages, title };
      })
    );
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] bg-white dark:bg-gray-800
          shadow-2xl transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Conversation History"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100%-56px)]">
          {/* History Sidebar */}
          {showHistory && (
            <ConversationHistory
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={(id) => {
                setActiveConversationId(id);
                setShowHistory(false);
              }}
              onDelete={deleteConversation}
              onNewConversation={startNewConversation}
            />
          )}

          {/* Chat Area */}
          <div className="flex-1">
            {activeConversation ? (
              <AssistantChat
                messages={activeConversation.messages}
                onSendMessage={addMessage}
                projectName={projectName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p className="mb-4">No conversation yet</p>
                <button
                  onClick={startNewConversation}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
                >
                  Start Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
