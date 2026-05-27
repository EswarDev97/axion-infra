import { Sparkles } from 'lucide-react';

interface Props {
  onSelect: (question: string) => void;
}

const questions = [
  'What is the current project status?',
  'What are the next steps?',
  'Help me with a feature',
  'Review my recent changes',
];

/**
 * QuickQuestions component for suggested conversation starters
 */
export function QuickQuestions({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        AI Assistant
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
        Ask about your project, get help with features, or review your progress
      </p>

      <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 text-left transition-colors"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
