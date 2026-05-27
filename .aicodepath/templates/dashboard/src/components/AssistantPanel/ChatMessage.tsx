import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Props {
  message: Message;
}

/**
 * ChatMessage component for displaying individual chat messages with markdown support
 */
export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`
        flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}
      `}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser
            ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white'
            : 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white'
          }
        `}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message bubble */}
      <div
        className={`
          max-w-[80%] px-4 py-2 rounded-2xl
          ${isUser
            ? 'bg-purple-100 dark:bg-purple-900/30 text-gray-900 dark:text-gray-100 rounded-tr-md'
            : 'bg-cyan-100 dark:bg-cyan-900/30 text-gray-900 dark:text-gray-100 rounded-tl-md'
          }
        `}
      >
        {/* User messages show plain text, assistant messages show markdown */}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom styling for markdown elements
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                li: ({ children }) => <li className="ml-2">{children}</li>,
                code: ({ children, ...props }: any) =>
                  props.inline ? (
                    <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono overflow-x-auto">
                      {children}
                    </code>
                  ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} className="text-purple-600 hover:text-purple-700 underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
