import { Check } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

interface Props {
  feature: Feature;
  isSelected: boolean;
  onToggle: () => void;
}

const priorityColors = {
  high: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  low: 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
};

/**
 * FeaturePreview component for displaying individual feature suggestions
 */
export function FeaturePreview({ feature, isSelected, onToggle }: Props) {
  return (
    <div
      onClick={onToggle}
      className={`
        flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Checkbox */}
      <div className={`
        flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
        ${isSelected
          ? 'border-purple-500 bg-purple-500'
          : 'border-gray-300 dark:border-gray-600'
        }
      `}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="font-medium text-gray-900 dark:text-white">
            {feature.title}
          </h4>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityColors[feature.priority]}`}>
            {feature.priority}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {feature.description}
        </p>
        {feature.dependencies && feature.dependencies.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Dependencies: {feature.dependencies.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
