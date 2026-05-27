/**
 * Command Palette Component
 *
 * A searchable command palette (Cmd/Ctrl + K) for quick actions.
 * Features:
 * - Keyboard navigation (arrow keys, Enter, Esc)
 * - Fuzzy search
 * - Command categories
 * - Recent commands
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Clock, TrendingUp, Zap, Settings, Navigation } from 'lucide-react';
import type { CommandPaletteItem } from './types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandPaletteItem[];
  recentCommands?: string[];
  onSelectCommand?: (commandId: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  navigation: <Navigation className="w-4 h-4 text-cyan-400" />,
  action: <Zap className="w-4 h-4 text-amber-400" />,
  productivity: <TrendingUp className="w-4 h-4 text-purple-400" />,
  settings: <Settings className="w-4 h-4 text-gray-400" />,
};

export function CommandPalette({
  isOpen,
  onClose,
  commands,
  recentCommands = [],
  onSelectCommand,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show recent commands first, then others
      const recent = commands.filter(c => recentCommands.includes(c.id));
      const others = commands.filter(c => !recentCommands.includes(c.id));
      return [...recent, ...others];
    }

    const query = searchQuery.toLowerCase();
    return commands
      .filter(cmd => {
        const labelMatch = cmd.label.toLowerCase().includes(query);
        const descMatch = cmd.description?.toLowerCase().includes(query);
        return labelMatch || descMatch;
      })
      .sort((a, b) => {
        // Prioritize recent commands
        const aRecent = recentCommands.includes(a.id);
        const bRecent = recentCommands.includes(b.id);
        if (aRecent && !bRecent) return -1;
        if (!aRecent && bRecent) return 1;
        return 0;
      });
  }, [searchQuery, commands, recentCommands]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelectCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  const handleSelectCommand = useCallback((command: CommandPaletteItem) => {
    command.action();
    onSelectCommand?.(command.id);
    onClose();
  }, [onClose, onSelectCommand]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[data-command-item]');
      const selected = items[selectedIndex] as HTMLElement;
      selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl mc-tech-border rounded-2xl bg-gradient-to-br from-gray-900/98 to-gray-950/98 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 mc-font-sans text-base"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mc-font-mono">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↑↓</kbd>
            <span>to navigate</span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 ml-2">Enter</kbd>
            <span>to select</span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 ml-2">Esc</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Commands list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 mc-scroll"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 mc-font-sans">No commands found</p>
              <p className="text-sm text-gray-600 mc-font-mono mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            <>
              {/* Recent commands section */}
              {!searchQuery && recentCommands.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2 flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mc-font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    Recent
                  </div>
                </div>
              )}

              {/* Commands */}
              {filteredCommands.map((command, index) => {
                const isSelected = index === selectedIndex;
                const isRecent = recentCommands.includes(command.id);
                const icon = CATEGORY_ICONS[command.category || 'action'];

                return (
                  <button
                    key={command.id}
                    data-command-item
                    onClick={() => handleSelectCommand(command)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                      ${isSelected
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                        : 'hover:bg-gray-800/50 border border-transparent'
                      }
                    `}
                  >
                    {/* Icon */}
                    <div className={`
                      p-2 rounded-lg flex-shrink-0
                      ${isSelected
                        ? 'bg-gray-700/50'
                        : 'bg-gray-800/50'
                      }
                    `}>
                      {command.icon || icon || <Zap className="w-4 h-4 text-gray-400" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium mc-font-sans ${
                          isSelected ? 'text-white' : 'text-gray-200'
                        }`}>
                          {command.label}
                        </span>
                        {isRecent && !searchQuery && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-400 mc-font-mono">
                            Recent
                          </span>
                        )}
                      </div>
                      {command.description && (
                        <p className={`text-sm mt-0.5 truncate mc-font-mono ${
                          isSelected ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {command.description}
                        </p>
                      )}
                    </div>

                    {/* Shortcut */}
                    {command.shortcut && (
                      <kbd className={`
                        px-2 py-1 rounded text-xs font-mono border flex-shrink-0
                        ${isSelected
                          ? 'bg-gray-700/50 border-gray-600 text-gray-300'
                          : 'bg-gray-800/50 border-gray-700 text-gray-500'
                        }
                      `}>
                        {command.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between text-xs text-gray-500 mc-font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">Cmd/Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">K</kbd>
                <span className="ml-1">to open</span>
              </span>
            </div>
            <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function createCommandPaletteItems(
  handlers: {
    onViewChange?: (view: string) => void;
    onToggleAssistant?: () => void;
    onAddFeature?: () => void;
    onExpandProject?: () => void;
    onToggleDebug?: () => void;
    onShowShortcuts?: () => void;
  }
): CommandPaletteItem[] {
  const items: CommandPaletteItem[] = [
    {
      id: 'view-monitor',
      label: 'Go to Monitor View',
      description: 'View system monitoring and metrics',
      category: 'navigation',
      shortcut: 'M',
      action: () => handlers.onViewChange?.('monitor'),
    },
    {
      id: 'view-agents',
      label: 'Go to Mission Control',
      description: 'View agent activity and orchestration',
      category: 'navigation',
      shortcut: 'A',
      action: () => handlers.onViewChange?.('agents'),
    },
    {
      id: 'view-kanban',
      label: 'Go to Kanban Board',
      description: 'Manage features and tasks',
      category: 'navigation',
      shortcut: 'K',
      action: () => handlers.onViewChange?.('kanban'),
    },
    {
      id: 'view-graph',
      label: 'Go to Dependency Graph',
      description: 'Visualize feature dependencies',
      category: 'navigation',
      shortcut: 'G',
      action: () => handlers.onViewChange?.('graph'),
    },
    {
      id: 'view-memory',
      label: 'Go to Visual Memory',
      description: 'View AI memory and learning',
      category: 'navigation',
      shortcut: 'V',
      action: () => handlers.onViewChange?.('memory'),
    },
    {
      id: 'toggle-assistant',
      label: 'Toggle AI Assistant',
      description: 'Open or close the AI assistant panel',
      category: 'productivity',
      shortcut: '⇧ A',
      action: () => handlers.onToggleAssistant?.(),
    },
    {
      id: 'add-feature',
      label: 'Add New Feature',
      description: 'Create a new feature or task',
      category: 'productivity',
      shortcut: '⇧ N',
      action: () => handlers.onAddFeature?.(),
    },
    {
      id: 'expand-project',
      label: 'Expand with AI',
      description: 'Generate features from project description',
      category: 'productivity',
      shortcut: 'E',
      action: () => handlers.onExpandProject?.(),
    },
    {
      id: 'toggle-debug',
      label: 'Toggle Debug Panel',
      description: 'Show or hide debug information',
      category: 'action',
      shortcut: 'D',
      action: () => handlers.onToggleDebug?.(),
    },
    {
      id: 'show-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View and customize keyboard shortcuts',
      category: 'settings',
      shortcut: '?',
      action: () => handlers.onShowShortcuts?.(),
    },
  ];

  return items;
}
