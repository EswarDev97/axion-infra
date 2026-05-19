'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  BackgroundVariant,
  Panel,
  type NodeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomNode, type CustomNodeData } from './CustomNode';
import { MindMapToolbar } from './MindMapToolbar';
import { NodeEditPanel } from './NodeEditPanel';
import { AddNodeModal } from './AddNodeModal';
import type { MindMapNodeSummary, MindMapDetail } from '@/services/mindmap/types';
import { nodeService } from '@/services/mindmap';

// Register custom node types
const nodeTypes = {
  mindmapNode: CustomNode,
};

// Edge styles
const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  animated: false,
};

interface MindMapCanvasProps {
  mindMap: MindMapDetail;
  isEditable: boolean;
  onRefresh: () => void;
}

export function MindMapCanvas({ mindMap, isEditable, onRefresh }: MindMapCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<MindMapNodeSummary | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [parentNodeForAdd, setParentNodeForAdd] = useState<MindMapNodeSummary | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);

  // Convert API nodes to React Flow format
  const initialNodes = useMemo(() => {
    return mindMap.nodes.map((node) => ({
      id: node.id,
      type: 'mindmapNode',
      position: { x: node.xPosition, y: node.yPosition },
      data: {
        label: node.title,
        nodeType: node.nodeType,
        visualMetadata: node.visualMetadata,
        linkedTaskId: node.linkedTaskId,
        childCount: node.childCount,
      } as CustomNodeData,
    }));
  }, [mindMap.nodes]);

  // Build edges from parent-child relationships
  const initialEdges: Edge[] = useMemo(() => {
    return mindMap.nodes
      .filter((node) => node.parentNodeId)
      .map((node) => ({
        id: `e-${node.parentNodeId}-${node.id}`,
        source: node.parentNodeId!,
        target: node.id,
        ...defaultEdgeOptions,
      }));
  }, [mindMap.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
    },
    [setEdges]
  );

  // Save node positions on drag end
  const onNodeDragStop: NodeMouseHandler = useCallback(
    async (_event, node) => {
      if (!isEditable) return;

      try {
        // Update single node position
        await nodeService.update(node.id, {
          xPosition: Math.round(node.position.x),
          yPosition: Math.round(node.position.y),
        });
      } catch (error) {
        console.error('Failed to save node position:', error);
      }
    },
    [isEditable]
  );

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const originalNode = mindMap.nodes.find((n) => n.id === node.id);
      if (originalNode) {
        setSelectedNode(originalNode);
        setShowEditPanel(true);
      }
    },
    [mindMap.nodes]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowEditPanel(false);
  }, []);

  // Handle add node
  const handleAddNode = useCallback((parentNode?: MindMapNodeSummary) => {
    setParentNodeForAdd(parentNode || null);
    setShowAddModal(true);
  }, []);

  // Handle add node success
  const handleAddNodeSuccess = useCallback(() => {
    setShowAddModal(false);
    setParentNodeForAdd(null);
    onRefresh();
  }, [onRefresh]);

  // Handle edit panel close
  const handleEditPanelClose = useCallback(() => {
    setShowEditPanel(false);
    setSelectedNode(null);
  }, []);

  // Handle node update
  const handleNodeUpdate = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Toggle zen mode
  const toggleZenMode = useCallback(() => {
    setIsZenMode((prev) => !prev);
  }, []);

  return (
    <div className={`h-[calc(100vh-120px)] w-full relative ${isZenMode ? 'fixed inset-0 z-50 h-screen' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        nodesDraggable={isEditable}
        nodesConnectable={isEditable}
        elementsSelectable={true}
        className="bg-gray-50"
      >
        {/* Toolbar */}
        <Panel position="top-left">
          <MindMapToolbar
            isEditable={isEditable}
            isZenMode={isZenMode}
            onAddNode={() => handleAddNode()}
            onZenMode={toggleZenMode}
          />
        </Panel>

        {/* Controls */}
        {!isZenMode && (
          <>
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              className="!bg-white !border !border-gray-200 !rounded-lg"
            />
          </>
        )}

        {/* Background */}
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
      </ReactFlow>

      {/* Empty state */}
      {mindMap.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center pointer-events-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start your mind map</h3>
            <p className="text-sm text-gray-500 mb-4">Add your first node to begin brainstorming</p>
            {isEditable && (
              <button
                onClick={() => handleAddNode()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add First Node
              </button>
            )}
          </div>
        </div>
      )}

      {/* Node Edit Panel */}
      {showEditPanel && selectedNode && (
        <NodeEditPanel
          node={selectedNode}
          mindMapId={mindMap.id}
          isEditable={isEditable}
          onClose={handleEditPanelClose}
          onUpdate={handleNodeUpdate}
          onAddChild={() => handleAddNode(selectedNode)}
        />
      )}

      {/* Add Node Modal */}
      <AddNodeModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        mindMapId={mindMap.id}
        parentNode={parentNodeForAdd}
        existingNodes={mindMap.nodes}
        onSuccess={handleAddNodeSuccess}
      />
    </div>
  );
}
