import { useEffect, useCallback } from 'react';

type View = 'kanban' | 'monitor' | 'graph' | 'memory' | 'agents' | 'search' | 'conversations' | 'cost';

interface UseKeyboardShortcutsOptions {
    activeView: View;
    setActiveView: (view: View) => void;
    showKeyboardHelp: boolean;
    setShowKeyboardHelp: (show: boolean) => void;
    debugOpen?: boolean;
    setDebugOpen?: (open: boolean) => void;
    // New optional callbacks for productivity features
    onToggleAssistant?: () => void;
    onAddFeature?: () => void;
    onExpandProject?: () => void;
    assistantOpen?: boolean;
    // Command palette support
    onToggleCommandPalette?: () => void;
    commandPaletteOpen?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts in the dashboard
 *
 * Shortcuts:
 * - M: Monitor view
 * - A: Agents view
 * - K: Kanban board
 * - G: Dependency graph
 * - V: Visual memory
 * - D: Toggle debug panel
 * - Shift+A: Toggle AI Assistant panel
 * - Shift+N: Add new feature
 * - E: Expand project modal
 * - Cmd/Ctrl+K: Open command palette
 * - ?: Show keyboard help
 * - Escape: Close modals
 */
export function useKeyboardShortcuts({
    activeView,
    setActiveView,
    showKeyboardHelp,
    setShowKeyboardHelp,
    debugOpen = false,
    setDebugOpen,
    onToggleAssistant,
    onAddFeature,
    onExpandProject,
    assistantOpen = false,
    onToggleCommandPalette,
    commandPaletteOpen = false,
}: UseKeyboardShortcutsOptions) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Check for Cmd/Ctrl + K for command palette (highest priority)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                if (onToggleCommandPalette) {
                    e.preventDefault();
                    onToggleCommandPalette();
                }
                return;
            }

            // Don't handle if modifier keys are pressed (except shift for specific shortcuts)
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }

            // Handle Shift+key combinations first
            if (e.shiftKey) {
                switch (e.key.toLowerCase()) {
                    case 'a':
                        if (onToggleAssistant) {
                            e.preventDefault();
                            onToggleAssistant();
                        }
                        break;
                    case 'n':
                        if (onAddFeature) {
                            e.preventDefault();
                            onAddFeature();
                        }
                        break;
                }
                return;
            }

            // Regular shortcuts
            switch (e.key.toLowerCase()) {
                case 'm':
                    e.preventDefault();
                    setActiveView('monitor');
                    break;
                case 'a':
                    e.preventDefault();
                    setActiveView('agents');
                    break;
                case 'k':
                    e.preventDefault();
                    setActiveView('kanban');
                    break;
                case 'g':
                    e.preventDefault();
                    setActiveView('graph');
                    break;
                case 'v':
                    e.preventDefault();
                    setActiveView('memory');
                    break;
                case 'd':
                    e.preventDefault();
                    if (setDebugOpen) {
                        setDebugOpen(!debugOpen);
                    }
                    break;
                case 'e':
                    if (onExpandProject) {
                        e.preventDefault();
                        onExpandProject();
                    }
                    break;
                case '?':
                    e.preventDefault();
                    setShowKeyboardHelp(true);
                    break;
                case 'escape':
                    // Cascade close: command palette -> assistant -> help -> debug
                    if (commandPaletteOpen && onToggleCommandPalette) {
                        onToggleCommandPalette();
                    } else if (assistantOpen && onToggleAssistant) {
                        onToggleAssistant();
                    } else if (showKeyboardHelp) {
                        setShowKeyboardHelp(false);
                    } else if (debugOpen && setDebugOpen) {
                        setDebugOpen(false);
                    }
                    break;
            }
        },
        [activeView, setActiveView, showKeyboardHelp, setShowKeyboardHelp, debugOpen, setDebugOpen,
         onToggleAssistant, onAddFeature, onExpandProject, assistantOpen, onToggleCommandPalette, commandPaletteOpen]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
