'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeType, NodeVisualMetadata } from '@/services/mindmap/types';

const nodeTypeIcons: Record<NodeType, string> = {
  IDEA: '💡',
  ACTIVITY: '⚡',
  REFERENCE: '🔗',
  LINKED_TASK: '✅',
};

const nodeTypeColors: Record<NodeType, { bg: string; border: string }> = {
  IDEA: { bg: 'bg-yellow-50', border: 'border-yellow-400' },
  ACTIVITY: { bg: 'bg-blue-50', border: 'border-blue-400' },
  REFERENCE: { bg: 'bg-purple-50', border: 'border-purple-400' },
  LINKED_TASK: { bg: 'bg-green-50', border: 'border-green-400' },
};

// Internal type with known properties for type-safe access
interface NodeDataInternal {
  label: string;
  nodeType: NodeType;
  description?: string | null;
  visualMetadata?: NodeVisualMetadata;
  linkedTaskId?: string | null;
  childCount: number;
}

// Exported type that satisfies React Flow's Record<string, unknown> requirement
export type CustomNodeData = NodeDataInternal & Record<string, unknown>;

interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
}

function CustomNodeComponent({ data, selected }: CustomNodeProps) {
  // Cast to internal type for type-safe property access
  const { label, nodeType, visualMetadata, linkedTaskId, childCount } = data as NodeDataInternal;
  const colors = nodeTypeColors[nodeType] || nodeTypeColors.IDEA;
  const defaultIcon = nodeTypeIcons[nodeType] || '💡';

  // Extract icon with proper typing
  const displayIcon: string = typeof visualMetadata?.icon === 'string' ? visualMetadata.icon : defaultIcon;

  // Use custom color if provided in visualMetadata
  const customBgColor = visualMetadata?.backgroundColor;
  const customBorderColor = visualMetadata?.color;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-sm min-w-[160px] max-w-[280px] transition-all ${
        !customBgColor ? colors.bg : ''
      } ${!customBorderColor ? colors.border : ''} ${
        selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: customBgColor || undefined,
        borderColor: customBorderColor || undefined,
      }}
    >
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* Node content */}
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{displayIcon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-900 truncate">{label}</h3>
          <p className="text-xs text-gray-500 capitalize">{nodeType.toLowerCase().replace('_', ' ')}</p>
        </div>
        {childCount > 0 && (
          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {childCount}
          </span>
        )}
      </div>

      {/* Linked task indicator */}
      {linkedTaskId && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Linked to task
          </span>
        </div>
      )}

      {/* Tags if present */}
      {(() => {
        const tags = visualMetadata?.tags;
        if (!tags || !Array.isArray(tags) || tags.length === 0) return null;
        const stringTags = tags.filter((t): t is string => typeof t === 'string');
        if (stringTags.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1 mt-2">
            {stringTags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-xs px-1.5 py-0.5 bg-white/60 rounded text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
CustomNode.displayName = 'CustomNode';
