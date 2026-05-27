import { MessageSquare, Trash2, Plus } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  createdAt: string;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
}

/**
 * ConversationHistory component for managing chat conversations
 */
export function ConversationHistory({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNewConversation,
}: Props) {
  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p>No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`
                group relative p-3 rounded-lg cursor-pointer transition-colors
                ${activeId === conv.id
                  ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 border border-transparent'
                }
              `}
              onClick={() => onSelect(conv.id)}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {conv.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) {
                    onDelete(conv.id);
                  }
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete conversation"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
