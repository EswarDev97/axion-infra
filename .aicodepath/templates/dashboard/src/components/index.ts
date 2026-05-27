// Agent Mission Control Components
export {
  AgentMissionControl,
  AgentCard,
  AgentAvatar,
  ActivityFeed,
  OrchestratorStatus,
  AgentLogModal,
} from './AgentMissionControl';

export type { ActivityItem } from './AgentMissionControl/ActivityFeed';

// Keyboard Shortcuts Components
export {
  KeyboardShortcuts,
  CommandPalette,
  createCommandPaletteItems,
  DEFAULT_SHORTCUTS,
} from './KeyboardShortcuts';

export type { Shortcut, ShortcutCategory, ShortcutAction, CommandPaletteItem } from './KeyboardShortcuts';

// Enhanced Kanban Board
export {
  KanbanBoardAgentAware,
  type Task as KanbanTask,
} from './KanbanAgentAware';

// Task type re-exported for convenience
export type { Task } from './KanbanAgentAware';

// Enhanced Dependency Graph (React Flow + Dagre)
export { default as TaskDependencyGraph } from './DependencyGraph/index';

// Legacy graph (still available but not imported by App)
export {
  DependencyGraphAgentAware,
  type Task as GraphTask,
} from './DependencyGraphAgentAware';

// Productivity Features
export { AssistantPanel } from './AssistantPanel';
export { ExpandProjectModal } from './ExpandProjectModal';

// Terminal Components
export { Terminal, TerminalTabs, useTerminalShortcuts } from './Terminal';
export type { TerminalTab } from './Terminal';

// Re-export Feature type for use in parent components
export type Feature = {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
};
