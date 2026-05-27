/**
 * Terminal Tabs Component
 *
 * Multi-tab terminal interface with tab management,
 * add/remove functionality, and active tab switching.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Plus, X, Terminal as TerminalIcon, Maximize2, Minimize2 } from 'lucide-react';
import Terminal from './Terminal';

export interface TerminalTab {
  id: string;
  title: string;
  isDirty?: boolean;
}

interface TerminalTabsProps {
  isVisible: boolean;
  onClose: () => void;
  projectPath?: string;
  maxTabs?: number;
  defaultHeight?: string;
  className?: string;
}

export function TerminalTabs({
  isVisible,
  onClose,
  projectPath = '',
  maxTabs = 5,
  defaultHeight = '400px',
  className = ''
}: TerminalTabsProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'default', title: 'Terminal 1', isDirty: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('default');
  const [isMaximized, setIsMaximized] = useState(false);
  const tabCounterRef = useRef(1);

  // Close all terminals when panel is closed
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Add a new terminal tab
  const addTab = useCallback(() => {
    if (tabs.length >= maxTabs) return;

    tabCounterRef.current += 1;
    const newTab: TerminalTab = {
      id: `terminal-${Date.now()}`,
      title: `Terminal ${tabCounterRef.current}`,
      isDirty: false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length, maxTabs]);

  // Close a specific tab
  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // If it's the last tab, close the entire panel
    if (tabs.length === 1) {
      handleClose();
      return;
    }

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);

      // Set new active tab if we closed the active one
      if (activeTabId === tabId) {
        const currentIndex = prev.findIndex(t => t.id === tabId);
        const newIndex = Math.max(0, currentIndex - 1);
        setActiveTabId(newTabs[newIndex]?.id || newTabs[0]?.id);
      }

      return newTabs;
    });
  }, [tabs.length, activeTabId, handleClose]);

  // Update tab title
  const handleTitleChange = useCallback((tabId: string, newTitle: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, title: newTitle } : t
    ));
  }, []);

  // Handle terminal exit
  const handleExit = useCallback((tabId: string, exitCode: number) => {
    if (exitCode !== 0) {
      setTabs(prev => prev.map(t =>
        t.id === tabId ? { ...t, isDirty: true } : t
      ));
    }
  }, []);

  if (!isVisible) return null;

  const containerHeight = isMaximized ? 'calc(100vh - 120px)' : defaultHeight;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-gray-900 shadow-2xl border-t border-gray-700 transition-all duration-200 ${className}`}
      style={{ height: containerHeight }}
    >
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700">
        {/* Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 border-r border-gray-700
                transition-colors duration-150 min-w-max
                ${activeTabId === tab.id
                  ? 'bg-gray-900 text-white border-t-2 border-t-blue-500'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                }
              `}
            >
              <TerminalIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate max-w-[150px]">{tab.title}</span>
              {tab.isDirty && (
                <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
              )}
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className="ml-1 p-0.5 hover:bg-gray-700 rounded transition-colors"
                aria-label={`Close ${tab.title}`}
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center border-l border-gray-700">
          {/* Add new terminal */}
          <button
            onClick={addTab}
            disabled={tabs.length >= maxTabs}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={`New Terminal (${tabs.length}/${maxTabs})`}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={() => setIsMaximized(prev => !prev)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Close all */}
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
            title="Close All Terminals"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={activeTabId === tab.id ? 'h-full' : 'hidden'}
          >
            <Terminal
              sessionId={tab.id}
              cwd={projectPath}
              onTitleChange={(title) => handleTitleChange(tab.id, title)}
              onExit={(exitCode) => handleExit(tab.id, exitCode)}
              className="h-full"
            />
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{tabs.length} terminal{tabs.length !== 1 ? 's' : ''}</span>
          <span>Max: {maxTabs}</span>
        </div>
        <div className="flex items-center gap-2">
          {isMaximized && <span>Press ESC or click restore to exit fullscreen</span>}
        </div>
      </div>
    </div>
  );
}

export default TerminalTabs;

/**
 * Keyboard shortcut handler for terminal panel
 *
 * Usage:
 * ```tsx
 * import { useTerminalShortcuts } from './TerminalTabs';
 *
 * function MyComponent() {
 *   const { toggleTerminal, isVisible } = useTerminalShortcuts();
 *   return <TerminalTabs isVisible={isVisible} onClose={toggleTerminal} />;
 * }
 * ```
 */
export function useTerminalShortcuts() {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` or Cmd+` to toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }

      // Escape to close or restore from maximized
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isVisible,
    toggleTerminal: () => setIsVisible(prev => !prev),
    openTerminal: () => setIsVisible(true),
    closeTerminal: () => setIsVisible(false),
  };
}
