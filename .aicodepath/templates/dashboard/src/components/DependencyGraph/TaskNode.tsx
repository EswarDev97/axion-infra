import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AgentAvatar } from '../AgentMissionControl/AgentAvatar';

export interface TaskNodeData {
  label: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  rawStatus: string;
  phase: string;
  stage: string;
  assignedAgent: string | null;
  agentState?: 'thinking' | 'working' | 'testing' | 'success' | 'error';
  stepsTotal: number;
  stepsCompleted: number;
  priority: string;
  blockedBy: string[];
  direction?: 'LR' | 'TB';
  onClick?: () => void;
}

const STATUS_STYLES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  pending: { border: '#6b7280', bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', glow: 'none' },
  in_progress: { border: '#06b6d4', bg: 'rgba(6,182,212,0.15)', text: '#22d3ee', glow: '0 0 12px rgba(6,182,212,0.4)' },
  done: { border: '#22c55e', bg: 'rgba(34,197,94,0.15)', text: '#4ade80', glow: 'none' },
  blocked: { border: '#ef4444', bg: 'rgba(239,68,68,0.15)', text: '#f87171', glow: 'none' },
};

const HANDLE_SIZE = { width: 8, height: 8 };

function TaskNode({ data }: NodeProps) {
  const nodeData = data as unknown as TaskNodeData;
  const style = STATUS_STYLES[nodeData.status] || STATUS_STYLES.pending;
  const progress = nodeData.stepsTotal > 0 ? (nodeData.stepsCompleted / nodeData.stepsTotal) * 100 : 0;
  const isLR = nodeData.direction !== 'TB';
  const borderStyle = '2px solid ' + style.border;
  const handleStyle = { background: style.border, ...HANDLE_SIZE, border: 'none' };

  return (
    <div
      onClick={nodeData.onClick}
      className="cursor-pointer transition-all hover:brightness-125"
      style={{
        background: style.bg,
        border: borderStyle,
        borderRadius: 10,
        padding: '10px 14px',
        width: 170,
        boxShadow: style.glow,
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        style={handleStyle}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {nodeData.assignedAgent && (
          <AgentAvatar
            name={nodeData.assignedAgent}
            state={nodeData.agentState || 'working'}
            size="sm"
          />
        )}
        <span
          style={{ color: '#f3f4f6', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
          title={nodeData.label}
        >
          {nodeData.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
          {nodeData.phase}
        </span>
        {nodeData.stage && nodeData.stage !== nodeData.phase && (
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>
            {nodeData.stage}
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: style.text, marginBottom: progress > 0 ? 6 : 0 }}>
        {nodeData.rawStatus ? nodeData.rawStatus.replace('_', ' ') : nodeData.status}
        {nodeData.priority === 'high' && (
          <span style={{ marginLeft: 6, color: '#f59e0b' }} title="High priority">!</span>
        )}
      </div>

      {nodeData.stepsTotal > 0 && (
        <div style={{ height: 4, borderRadius: 2, background: '#1f2937', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: progress + '%', background: '#06b6d4', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      )}

      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        style={handleStyle}
      />
    </div>
  );
}

export default memo(TaskNode);
