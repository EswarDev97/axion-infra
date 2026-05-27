/**
 * Keyboard Shortcuts Type Definitions
 */

export type ShortcutCategory = 'navigation' | 'productivity' | 'action' | 'modal' | 'custom';

export interface Shortcut {
  id: string;
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  category: ShortcutCategory;
  action: ShortcutAction;
  editable?: boolean;
}

export type ShortcutAction =
  | 'view-monitor'
  | 'view-agents'
  | 'view-kanban'
  | 'view-graph'
  | 'view-memory'
  | 'toggle-assistant'
  | 'add-feature'
  | 'expand-project'
  | 'toggle-debug'
  | 'show-help'
  | 'close-modal'
  | 'custom';

export interface ShortcutConflict {
  shortcutId: string;
  conflictingIds: string[];
  keyCombo: string;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category?: 'navigation' | 'action' | 'productivity' | 'settings';
}
