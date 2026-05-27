import React, { useState } from 'react';
import { X, Sparkles, Plus, Loader2 } from 'lucide-react';
import { FeaturePreview } from './FeaturePreview';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddFeatures: (features: Feature[]) => void;
  projectName: string;
}

interface Feature {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

/**
 * ExpandProjectModal - Modal for AI-powered feature expansion
 */
export function ExpandProjectModal({ isOpen, onClose, onAddFeatures, projectName }: Props) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedFeatures, setSuggestedFeatures] = useState<Feature[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setInput('');
      setSuggestedFeatures([]);
      setSelectedFeatures(new Set());
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generateFeatures = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assistant/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: input.trim(),
          projectName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate features');
      }

      const data = await response.json();
      setSuggestedFeatures(data.features);
      setSelectedFeatures(new Set(data.features.map((_: unknown, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (index: number) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addSelectedFeatures = () => {
    const features = suggestedFeatures.filter((_, i) => selectedFeatures.has(i));
    onAddFeatures(features);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateFeatures();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Expand Project
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Describe what you want to add
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Describe the features you want to add
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Add user authentication with OAuth, implement a dashboard with charts, create an API for managing products..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              rows={4}
              disabled={isLoading}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={generateFeatures}
                disabled={!input.trim() || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Features
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Suggested Features */}
          {suggestedFeatures.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Suggested Features ({selectedFeatures.size} selected)
                </h3>
                <button
                  onClick={() => {
                    if (selectedFeatures.size === suggestedFeatures.length) {
                      setSelectedFeatures(new Set());
                    } else {
                      setSelectedFeatures(new Set(suggestedFeatures.map((_, i) => i)));
                    }
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  {selectedFeatures.size === suggestedFeatures.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {suggestedFeatures.map((feature, index) => (
                  <FeaturePreview
                    key={index}
                    feature={feature}
                    isSelected={selectedFeatures.has(index)}
                    onToggle={() => toggleFeature(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestedFeatures.length > 0 && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addSelectedFeatures}
              disabled={selectedFeatures.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add {selectedFeatures.size} Feature{selectedFeatures.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
