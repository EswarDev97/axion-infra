/**
 * Keyboard Shortcuts Modal Component
 *
 * A comprehensive keyboard shortcut manager with:
 * - View all shortcuts organized by category
 * - Edit/customize key bindings
 * - Conflict detection
 * - Mission Control styled UI
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  X,
  Keyboard,
  Navigation,
  Zap,
  Settings,
  HelpCircle,
  Edit2,
  Check,
  AlertTriangle,
  Save,
  RotateCcw,
} from 'lucide-react';
import type { Shortcut, ShortcutCategory, ShortcutConflict } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
  onUpdateShortcut?: (id: string, newKeyCombo: Partial<Pick<Shortcut, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>>) => void;
  onResetShortcuts?: () => void;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Navigation
  { id: 'view-monitor', key: 'm', description: 'Monitor View', category: 'navigation', action: 'view-monitor', editable: true },
  { id: 'view-agents', key: 'a', description: 'Agents View', category: 'navigation', action: 'view-agents', editable: true },
  { id: 'view-kanban', key: 'k', description: 'Kanban Board', category: 'navigation', action: 'view-kanban', editable: true },
  { id: 'view-graph', key: 'g', description: 'Dependency Graph', category: 'navigation', action: 'view-graph', editable: true },
  { id: 'view-memory', key: 'v', description: 'Visual Memory', category: 'navigation', action: 'view-memory', editable: true },
  // Productivity
  { id: 'toggle-assistant', key: 'a', shiftKey: true, description: 'Toggle AI Assistant', category: 'productivity', action: 'toggle-assistant', editable: true },
  { id: 'add-feature', key: 'n', shiftKey: true, description: 'Add New Feature', category: 'productivity', action: 'add-feature', editable: true },
  { id: 'expand-project', key: 'e', description: 'Expand Project (AI)', category: 'productivity', action: 'expand-project', editable: true },
  // Actions
  { id: 'toggle-debug', key: 'd', description: 'Toggle Debug Panel', category: 'action', action: 'toggle-debug', editable: true },
  // Modal
  { id: 'show-help', key: '?', description: 'Show Keyboard Help', category: 'modal', action: 'show-help', editable: false },
  { id: 'close-modal', key: 'Escape', description: 'Close Modal', category: 'modal', action: 'close-modal', editable: false },
];

const CATEGORY_ICONS: Record<ShortcutCategory, React.ReactNode> = {
  navigation: <Navigation className="w-4 h-4" />,
  productivity: <Zap className="w-4 h-4" />,
  action: <Settings className="w-4 h-4" />,
  modal: <HelpCircle className="w-4 h-4" />,
  custom: <Keyboard className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<ShortcutCategory, { bg: string; border: string; text: string; icon: string }> = {
  navigation: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    icon: 'text-cyan-400',
  },
  productivity: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    icon: 'text-purple-400',
  },
  action: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  modal: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
    icon: 'text-green-400',
  },
  custom: {
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    icon: 'text-pink-400',
  },
};

function formatKeyCombo(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey) parts.push('Cmd');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
}

function keyComboToDisplay(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrlKey) parts.push('⌃');
  if (shortcut.altKey) parts.push('⌥');
  if (shortcut.shiftKey) parts.push('⇧');
  if (shortcut.metaKey) parts.push('⌘');
  parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase());
  return parts.join(' ');
}

export function KeyboardShortcuts({
  isOpen,
  onClose,
  shortcuts = DEFAULT_SHORTCUTS,
  onUpdateShortcut,
  onResetShortcuts,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [capturedKeys, setCapturedKeys] = useState<Partial<Shortcut>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);

  // Group shortcuts by category
  const shortcutsByCategory = useMemo(() => {
    const grouped: Record<ShortcutCategory, Shortcut[]> = {
      navigation: [],
      productivity: [],
      action: [],
      modal: [],
      custom: [],
    };
    shortcuts.forEach(s => grouped[s.category].push(s));
    return grouped;
  }, [shortcuts]);

  // Check for conflicts
  const checkConflicts = useCallback(() => {
    const keyMap = new Map<string, string[]>();
    const newConflicts: ShortcutConflict[] = [];

    shortcuts.forEach(s => {
      const combo = formatKeyCombo(s);
      if (!keyMap.has(combo)) {
        keyMap.set(combo, []);
      }
      keyMap.get(combo)!.push(s.id);
    });

    keyMap.forEach((ids, combo) => {
      if (ids.length > 1) {
        ids.forEach(id => {
          const conflicting = ids.filter(other => other !== id);
          if (conflicting.length > 0) {
            newConflicts.push({
              shortcutId: id,
              conflictingIds: conflicting,
              keyCombo: combo,
            });
          }
        });
      }
    });

    setConflicts(newConflicts);
  }, [shortcuts]);

  useEffect(() => {
    checkConflicts();
  }, [checkConflicts]);

  // Handle key capture
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isCapturing) return;

    e.preventDefault();
    e.stopPropagation();

    // Don't capture Escape (used to cancel)
    if (e.key === 'Escape') {
      setIsCapturing(false);
      setCapturedKeys({});
      setEditingId(null);
      return;
    }

    // Capture the key combo
    const newKeys: Partial<Shortcut> = {
      key: e.key,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
    };

    setCapturedKeys(newKeys);
    setIsCapturing(false);

    if (onUpdateShortcut && editingId) {
      onUpdateShortcut(editingId, newKeys);
      setHasChanges(true);
    }

    setEditingId(null);
  }, [isCapturing, editingId, onUpdateShortcut]);

  useEffect(() => {
    if (isCapturing) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isCapturing, handleKeyDown]);

  const startEditing = (shortcutId: string) => {
    setEditingId(shortcutId);
    setIsCapturing(true);
    setCapturedKeys({});
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCapturing(false);
    setCapturedKeys({});
  };

  const handleSave = () => {
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    if (onResetShortcuts) {
      onResetShortcuts();
      setHasChanges(false);
      setConflicts([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mc-modal-backdrop">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={hasChanges ? undefined : onClose} />

      {/* Modal */}
      <div
        className="relative mc-tech-border rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mc-header-gradient px-6 py-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <Keyboard className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mc-font-sans">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-400 mc-font-mono">
                  Customize your dashboard experience
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {hasChanges && (
                <>
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-amber-400 transition-colors"
                    title="Reset to defaults"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium mc-font-sans hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </>
              )}
              <button
                onClick={hasChanges ? undefined : onClose}
                className={`p-2 rounded-lg transition-colors ${hasChanges ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-800/50 text-gray-400 hover:text-white'}`}
                disabled={hasChanges}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 mc-scroll">
          {/* Conflicts warning */}
          {conflicts.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-amber-400 font-semibold mc-font-sans mb-1">
                  Shortcut Conflicts Detected
                </h3>
                <p className="text-sm text-gray-400 mc-font-mono">
                  {conflicts.length} shortcut{conflicts.length > 1 ? 's have' : ' has a'} conflicting key binding. Please resolve conflicts before saving.
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-6 p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
            <p className="text-sm text-gray-400 mc-font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Click on any shortcut to rebind it. Press the desired key combination to save.
            </p>
          </div>

          {/* Shortcuts by category */}
          {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => {
            if (categoryShortcuts.length === 0) return null;
            const colors = CATEGORY_COLORS[category as ShortcutCategory];
            const icon = CATEGORY_ICONS[category as ShortcutCategory];

            return (
              <div key={category} className="mb-6 last:mb-0">
                {/* Category header */}
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-gray-800`}>
                  <div className={`p-1.5 rounded ${colors.bg} ${colors.border}`}>
                    {icon}
                  </div>
                  <h3 className={`text-sm font-semibold uppercase tracking-wider ${colors.text} mc-font-sans`}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h3>
                  <span className="text-xs text-gray-600 mc-font-mono">
                    {categoryShortcuts.length}
                  </span>
                </div>

                {/* Shortcuts list */}
                <div className="space-y-2">
                  {categoryShortcuts.map(shortcut => {
                    const isEditing = editingId === shortcut.id;
                    const hasConflict = conflicts.some(c => c.shortcutId === shortcut.id);
                    const isNonEditable = !shortcut.editable;

                    return (
                      <div
                        key={shortcut.id}
                        className={`
                          flex items-center justify-between p-3 rounded-lg border transition-all
                          ${isEditing
                            ? 'bg-purple-500/10 border-purple-500/30 ring-2 ring-purple-500/20'
                            : hasConflict
                              ? 'bg-amber-500/5 border-amber-500/20'
                              : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50 hover:border-gray-600'
                          }
                          ${isNonEditable ? 'opacity-60' : ''}
                        `}
                      >
                        {/* Description */}
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${colors.bg} ${colors.border}`}>
                            {React.cloneElement(icon as React.ReactElement, {
                              className: `w-4 h-4 ${colors.icon}`,
                            })}
                          </div>
                          <div>
                            <p className="text-white font-medium mc-font-sans">
                              {shortcut.description}
                            </p>
                            {hasConflict && (
                              <p className="text-xs text-amber-400 mc-font-mono mt-0.5">
                                Conflicts with: {conflicts.find(c => c.shortcutId === shortcut.id)?.keyCombo}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Key combo */}
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              {isCapturing ? (
                                <div className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm text-purple-400 mc-font-mono animate-pulse">
                                  Press key combination...
                                </div>
                              ) : (
                                <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-sm text-green-400 mc-font-mono flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5" />
                                  {capturedKeys.key ? keyComboToDisplay(capturedKeys as Shortcut) : formatKeyCombo(shortcut)}
                                </div>
                              )}
                              <button
                                onClick={cancelEditing}
                                className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <kbd className={`
                                px-3 py-1.5 rounded-lg text-sm font-mono border transition-all
                                ${hasConflict
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : 'bg-gray-700/50 border-gray-600 text-gray-300'
                                }
                              `}>
                                {keyComboToDisplay(shortcut)}
                              </kbd>
                              {isNonEditable ? (
                                <span className="text-xs text-gray-600 mc-font-mono px-1">Locked</span>
                              ) : (
                                <button
                                  onClick={() => startEditing(shortcut.id)}
                                  className="p-1.5 rounded hover:bg-gray-700/50 text-gray-500 hover:text-purple-400 transition-colors"
                                  title="Edit shortcut"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500 mc-font-mono">
              <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/50 text-xs">
                Cmd/Ctrl + K
              </span>
              <span>for command palette</span>
            </div>
            {!hasChanges ? (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg font-semibold mc-font-sans hover:brightness-110 transition-all"
              >
                Done
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-400 mc-font-mono">
                <AlertTriangle className="w-4 h-4" />
                Unsaved changes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_SHORTCUTS };
