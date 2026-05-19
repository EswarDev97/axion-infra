'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import type { MindMapNodeSummary } from '@/services/mindmap/types';
import { nodeService } from '@/services/mindmap';

const nodeTypeLabels: Record<string, string> = {
  IDEA: 'Idea',
  ACTIVITY: 'Activity',
  REFERENCE: 'Reference',
  LINKED_TASK: 'Linked Task',
};

const nodeTypeColors: Record<string, string> = {
  IDEA: 'bg-yellow-400',
  ACTIVITY: 'bg-blue-400',
  REFERENCE: 'bg-purple-400',
  LINKED_TASK: 'bg-green-400',
};

interface NodeEditPanelProps {
  node: MindMapNodeSummary;
  mindMapId: string;
  isEditable: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onAddChild: () => void;
}

export function NodeEditPanel({
  node,
  mindMapId,
  isEditable,
  onClose,
  onUpdate,
  onAddChild,
}: NodeEditPanelProps) {
  const [title, setTitle] = useState(node.title);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update node mutation
  const updateMutation = useMutation({
    mutationFn: (data: { title: string }) => nodeService.update(node.id, data),
    onSuccess: () => {
      setIsEditing(false);
      onUpdate();
    },
  });

  // Delete node mutation
  const deleteMutation = useMutation({
    mutationFn: () => nodeService.delete(node.id, undefined, true),
    onSuccess: () => {
      setShowDeleteConfirm(false);
      onClose();
      onUpdate();
    },
  });

  const handleSave = () => {
    if (title.trim() && title !== node.title) {
      updateMutation.mutate({ title: title.trim() });
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(node.title);
      setIsEditing(false);
    }
  };

  return (
    <>
      <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-20 overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Node Details</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} loading={updateMutation.isPending}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTitle(node.title);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{node.title}</p>
                {isEditable && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${nodeTypeColors[node.nodeType]}`} />
              <span className="text-gray-900">{nodeTypeLabels[node.nodeType]}</span>
            </div>
          </div>

          {/* Position */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-1">Position</label>
            <p className="text-sm text-gray-600">
              X: {Math.round(node.xPosition)}, Y: {Math.round(node.yPosition)}
            </p>
          </div>

          {/* Children count */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-500 mb-1">Children</label>
            <p className="text-gray-900">{node.childCount} node{node.childCount !== 1 ? 's' : ''}</p>
          </div>

          {/* Linked Task */}
          {node.linkedTaskId && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Linked to Task</span>
              </div>
              <a
                href={`/dashboard/tasks/${node.linkedTaskId}`}
                className="text-sm text-green-600 hover:underline mt-1 inline-block"
              >
                View Task →
              </a>
            </div>
          )}

          {/* Visual Metadata */}
          {node.visualMetadata && Object.keys(node.visualMetadata).length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-500 mb-1">Visual Settings</label>
              <div className="text-sm text-gray-600 space-y-1">
                {node.visualMetadata.icon && <p>Icon: {node.visualMetadata.icon}</p>}
                {node.visualMetadata.color && (
                  <div className="flex items-center gap-2">
                    <span>Color:</span>
                    <div
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: node.visualMetadata.color }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {isEditable && (
            <div className="pt-4 border-t border-gray-200 space-y-2">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Actions</h4>

              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={onAddChild}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Child Node
              </Button>

              {node.nodeType !== 'LINKED_TASK' && !node.linkedTaskId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                  title="Coming soon"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Convert to Task
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Node
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Node"
        message={
          node.childCount > 0
            ? `This will delete "${node.title}" and all ${node.childCount} child node${node.childCount !== 1 ? 's' : ''}. This action cannot be undone.`
            : `Are you sure you want to delete "${node.title}"? This action cannot be undone.`
        }
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </>
  );
}
