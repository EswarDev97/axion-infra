'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/feedback/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import type { MindMapNodeSummary, MindMapNodeCreateRequest, NodeType } from '@/services/mindmap/types';
import { nodeService } from '@/services/mindmap';

const nodeTypes: { value: NodeType; label: string; icon: string; description: string }[] = [
  { value: 'IDEA', label: 'Idea', icon: '💡', description: 'Conceptual nodes for brainstorming' },
  { value: 'ACTIVITY', label: 'Activity', icon: '⚡', description: 'Actionable items and activities' },
  { value: 'REFERENCE', label: 'Reference', icon: '🔗', description: 'Supporting information and links' },
  { value: 'LINKED_TASK', label: 'Linked Task', icon: '✅', description: 'Link to a task in Task Management' },
];

const nodeColors = [
  { value: '#FEFCE8', label: 'Yellow' },
  { value: '#DBEAFE', label: 'Blue' },
  { value: '#F3E8FF', label: 'Purple' },
  { value: '#DCFCE7', label: 'Green' },
  { value: '#FEE2E2', label: 'Red' },
  { value: '#FEF3C7', label: 'Amber' },
  { value: '#F1F5F9', label: 'Gray' },
];

interface AddNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mindMapId: string;
  parentNode?: MindMapNodeSummary | null;
  existingNodes: MindMapNodeSummary[];
  onSuccess: () => void;
}

export function AddNodeModal({
  open,
  onOpenChange,
  mindMapId,
  parentNode,
  existingNodes,
  onSuccess,
}: AddNodeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('IDEA');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(parentNode?.id);
  const [selectedColor, setSelectedColor] = useState('#FEFCE8');

  // Create node mutation
  const createMutation = useMutation({
    mutationFn: (data: MindMapNodeCreateRequest) => nodeService.create(mindMapId, data),
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setNodeType('IDEA');
    setSelectedParentId(parentNode?.id);
    setSelectedColor('#FEFCE8');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    // Calculate position based on parent or random placement
    let xPosition = 100 + Math.random() * 200;
    let yPosition = 100 + Math.random() * 200;

    if (selectedParentId) {
      const parent = existingNodes.find((n) => n.id === selectedParentId);
      if (parent) {
        // Position child nodes below and slightly to the right of parent
        const childCount = existingNodes.filter((n) => n.parentNodeId === selectedParentId).length;
        xPosition = parent.xPosition + 50 + childCount * 30;
        yPosition = parent.yPosition + 120;
      }
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      nodeType,
      parentNodeId: selectedParentId,
      xPosition: Math.round(xPosition),
      yPosition: Math.round(yPosition),
      visualMetadata: {
        backgroundColor: selectedColor,
      },
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Add New Node">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter node title"
            autoFocus
          />
        </div>

        {/* Node Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Node Type</label>
          <div className="grid grid-cols-2 gap-2">
            {nodeTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setNodeType(type.value)}
                className={`p-3 text-left rounded-lg border-2 transition-all ${
                  nodeType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{type.icon}</span>
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about this node..."
            rows={3}
          />
        </div>

        {/* Parent Node */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Node</label>
          <Select
            value={selectedParentId || ''}
            onChange={(e) => setSelectedParentId(e.target.value || undefined)}
          >
            <option value="">No parent (root level)</option>
            {existingNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Select a parent to create a child node, or leave empty for a root node
          </p>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
          <div className="flex gap-2">
            {nodeColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  selectedColor === color.value
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending}
            disabled={!title.trim()}
          >
            Add Node
          </Button>
        </div>
      </form>
    </Modal>
  );
}
