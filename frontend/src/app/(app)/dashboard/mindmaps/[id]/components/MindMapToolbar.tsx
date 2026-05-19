'use client';

import { Button } from '@/components/ui/Button';

interface MindMapToolbarProps {
  isEditable: boolean;
  isZenMode: boolean;
  onAddNode: () => void;
  onZenMode: () => void;
}

export function MindMapToolbar({
  isEditable,
  isZenMode,
  onAddNode,
  onZenMode,
}: MindMapToolbarProps) {
  return (
    <div className="flex gap-2 bg-white rounded-lg shadow-md p-2 border border-gray-200">
      {isEditable && (
        <Button size="sm" onClick={onAddNode}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Node
        </Button>
      )}

      <Button size="sm" variant="outline" onClick={onZenMode} title={isZenMode ? 'Exit Focus Mode' : 'Focus Mode'}>
        {isZenMode ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        )}
      </Button>

      {isZenMode && (
        <div className="flex items-center text-sm text-gray-600 ml-2">
          <span>Focus Mode</span>
          <span className="ml-2 text-xs text-gray-400">(Press Esc to exit)</span>
        </div>
      )}
    </div>
  );
}
