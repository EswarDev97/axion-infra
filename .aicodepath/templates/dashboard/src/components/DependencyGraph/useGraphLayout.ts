import { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const RANK_SEP = 60;
const NODE_SEP = 40;

export type LayoutDirection = 'LR' | 'TB';

interface GraphLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Compute a stable topology key from node IDs and edge connections.
 * Only recomputes layout when the graph structure or direction changes.
 */
function computeTopologyKey(nodes: Node[], edges: Edge[], direction: LayoutDirection): string {
  const nodeIds = nodes.map(n => n.id).sort().join(',');
  const edgeIds = edges.map(e => e.source + '->' + e.target).sort().join(',');
  return nodeIds + '|' + edgeIds + '|' + direction;
}

/**
 * Hook that applies Dagre auto-layout to React Flow nodes and edges.
 * Memoized on topology + direction so layout only recalculates when structure changes.
 */
export function useGraphLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'LR'
): GraphLayoutResult {
  const topologyKey = computeTopologyKey(nodes, edges, direction);

  return useMemo((): GraphLayoutResult => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: direction,
      ranksep: RANK_SEP,
      nodesep: NODE_SEP,
      marginx: 40,
      marginy: 40,
    });

    for (const node of nodes) {
      graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    for (const edge of edges) {
      graph.setEdge(edge.source, edge.target);
    }

    dagre.layout(graph);

    const layoutNodes = nodes.map(node => {
      const pos = graph.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        },
        data: { ...node.data, direction },
      };
    });

    const layoutEdges = edges.map(edge => ({
      ...edge,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#475569', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as const, color: '#475569' },
    }));

    return { nodes: layoutNodes, edges: layoutEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topologyKey]);
}
