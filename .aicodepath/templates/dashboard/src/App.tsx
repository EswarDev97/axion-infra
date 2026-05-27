import { useState, useEffect } from 'react';
// Import mission control styles for the dark theme aesthetic
import './components/AgentMissionControl/styles.css';
// Import new Agent Visibility components
import {
  AgentMissionControl,
  KanbanBoardAgentAware,
  TaskDependencyGraph,
  AssistantPanel,
  ExpandProjectModal,
  KeyboardShortcuts,
  CommandPalette,
  createCommandPaletteItems,
  DEFAULT_SHORTCUTS,
  type Feature,
  type Shortcut,
} from './components';
// Keep existing views for other tabs
import { MonitorView } from './components/MonitorViewEnhanced';
import { VisualMemoryView } from './components/VisualMemoryViewEnhanced';
import { ConversationSearchPage } from './components/ConversationSearch/ConversationSearchPage';
import { ConversationsPanel } from './components/ConversationsPanel/ConversationsPanel';
import { CostMetrics } from './components/CostMetrics';
import { ConnectionStatus } from './components/ConnectionStatus';
import { KeyboardHelp } from './components/KeyboardHelp';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDatabase } from './hooks/useDatabase';
// Import types from components
import type { Task } from './components';

type View = 'kanban' | 'monitor' | 'graph' | 'memory' | 'agents' | 'search' | 'conversations' | 'cost';

interface OverviewProgress {
  currentPhase: string | null;
  currentStage: string | null;
  progress: {
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    percentage: number;
  } | null;
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('agents');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Productivity feature states
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [expandModalOpen, setExpandModalOpen] = useState(false);
  // New: Command palette and keyboard shortcuts states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Fetch real workflow tasks from REST API
  const { data: workflowTasks, refetch: refetchWorkflow } = useDatabase<Task[]>('/workflow-state', 10000);
  const { data: overviewData } = useDatabase<OverviewProgress>('/overview/progress', 10000);

  // Populate tasks from REST API when available
  useEffect(() => {
    if (workflowTasks && workflowTasks.length > 0) {
      setTasks(prev => {
        // Keep any locally-added tasks (from Expand Project), merge with API data
        const localTasks = prev.filter(t => typeof t.id === 'number' && t.id > 1e12); // timestamp-based IDs
        return [...localTasks, ...workflowTasks];
      });
    }
  }, [workflowTasks]);

  // Keyboard shortcuts integration
  useKeyboardShortcuts({
    activeView,
    setActiveView,
    showKeyboardHelp,
    setShowKeyboardHelp,
    onToggleAssistant: () => setAssistantOpen(prev => !prev),
    onAddFeature: () => {
      setActiveView('kanban');
      // Trigger the add feature callback in KanbanBoard
    },
    onExpandProject: () => setExpandModalOpen(true),
    assistantOpen,
    onToggleCommandPalette: () => setCommandPaletteOpen(prev => !prev),
    commandPaletteOpen,
  });

  // WebSocket integration
  const {
    isConnected,
    reconnectAttempts,
    logs,
    activeAgents,
    progress,
    orchestratorStatus,
    celebrationQueue,
    currentPhase,
    lastFeatureUpdate,
    recentActivity,
    dismissCelebration,
  } = useWebSocket();

  // Refetch workflow data when WebSocket sends a feature_update event
  useEffect(() => {
    if (lastFeatureUpdate) {
      refetchWorkflow();
    }
  }, [lastFeatureUpdate, refetchWorkflow]);

  // Handlers for kanban actions
  const handleAddFeature = () => {
    // Open expand modal for adding features
    setExpandModalOpen(true);
  };

  const handleExpandProject = () => {
    console.log('Expand with AI clicked');
    setExpandModalOpen(true);
  };

  const handleAddFeatures = async (features: Feature[]) => {
    // Persist features to backend DB (closes the UI → Backend contract gap)
    try {
      await fetch('/api/workflow-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: features.map(f => ({
            title: f.title,
            description: f.description,
            priority: f.priority,
            dependencies: f.dependencies || [],
          })),
          projectName: 'AICodePath',
        }),
      });
    } catch (err) {
      console.warn('Failed to persist features to backend:', err);
      // Non-fatal: still update local state so UI is responsive
    }

    // Convert features to tasks and add to the task list
    // Build a map of feature titles to their indices for blockedBy references
    const featureTitleToIndex = new Map<string, number>();
    features.forEach((f, i) => featureTitleToIndex.set(f.title, i));

    const now = Date.now();

    const newTasks: Task[] = features.map((feature, index) => {
      // Find indices of tasks this feature depends on
      const blockedBy: number[] = [];
      if (feature.dependencies) {
        for (const dep of feature.dependencies) {
          const depIndex = featureTitleToIndex.get(dep);
          if (depIndex !== undefined && depIndex < index) {
            blockedBy.push(now + depIndex);
          }
        }
      }

      return {
        id: now + index,
        crNumber: `EXP${String(index + 1).padStart(3, '0')}`,
        phase: 'INCEPTION',
        stage: 'Planning',
        unit: feature.title,
        status: blockedBy.length > 0 ? ('blocked' as const) : ('pending' as const),
        startedAt: null,
        completedAt: null,
        stepsTotal: feature.priority === 'high' ? 10 : feature.priority === 'medium' ? 7 : 5,
        stepsCompleted: 0,
        artifactsCreated: null,
        notes: feature.description,
        blockers: feature.dependencies && feature.dependencies.length > 0
          ? feature.dependencies.join(', ')
          : null,
        blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
        priority: feature.priority,
        estimatedEffort: feature.priority === 'high' ? 8 : feature.priority === 'medium' ? 5 : 3,
      };
    });

    setTasks(prev => [...newTasks, ...prev]);
    setActiveView('kanban');
  };

  const handleTaskClick = (taskId: number) => {
    console.log('Task clicked:', taskId);
    // TODO: Implement task detail modal
  };

  // Command palette items
  const commandPaletteItems = createCommandPaletteItems({
    onViewChange: (view) => setActiveView(view as View),
    onToggleAssistant: () => setAssistantOpen(prev => !prev),
    onAddFeature: handleAddFeature,
    onExpandProject: handleExpandProject,
    onToggleDebug: () => {/* TODO: Implement debug toggle */ },
    onShowShortcuts: () => setShowKeyboardShortcuts(true),
  });

  const handleSelectCommand = (commandId: string) => {
    setRecentCommands(prev => {
      const filtered = prev.filter(id => id !== commandId);
      return [commandId, ...filtered].slice(0, 5);
    });
  };

  const handleUpdateShortcut = (
    id: string,
    newKeys: Partial<Shortcut>
  ) => {
    setShortcuts(prev => prev.map(s =>
      s.id === id ? { ...s, ...newKeys } : s
    ));
  };

  const handleResetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 mc-grid-bg">

      {/* Header */}
      <header className="mc-header-gradient border-b border-gray-800 sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                AICodePath Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1 mc-font-mono">
                Real-time monitoring and workflow management
                {(currentPhase || overviewData?.currentPhase) && ` // PHASE: ${currentPhase || overviewData?.currentPhase}`}
                {(!currentPhase && overviewData?.currentStage) && ` / ${overviewData.currentStage}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Progress bar - uses WebSocket data with REST API fallback */}
              {(progress || overviewData?.progress) && (() => {
                const p = progress || (overviewData?.progress ? {
                  passing: overviewData.progress.completed,
                  inProgress: overviewData.progress.inProgress,
                  total: overviewData.progress.total,
                  percentage: overviewData.progress.percentage,
                } : null);
                if (!p) return null;
                return (
                  <div className="hidden md:block w-48">
                    <div className="flex justify-between text-xs mb-1 mc-font-mono">
                      <span className="text-gray-500">{p.passing}/{p.total} COMPLETE</span>
                      <span className="font-medium text-cyan-400">{p.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-green-500 mc-progress-fill transition-all duration-500 ease-out"
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Connection Status */}
              <ConnectionStatus
                isConnected={isConnected}
                reconnectAttempts={reconnectAttempts}
              />

              {/* Keyboard Shortcuts Button */}
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-purple-400 transition-colors"
                title="Keyboard Shortcuts (Cmd/Ctrl + K)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-[73px] z-10">
        <div className="px-6 py-3">
          <div className="flex gap-2">
            {[
              { id: 'agents' as View, label: 'Mission Control', icon: '🛰️', count: activeAgents.length },
              { id: 'monitor' as View, label: 'Monitor', icon: '📊' },
              { id: 'kanban' as View, label: 'Kanban Board', icon: '📋' },
              { id: 'graph' as View, label: 'Dependencies', icon: '🔗' },
              { id: 'memory' as View, label: 'Visual Memory', icon: '🧠' },
              { id: 'conversations' as View, label: 'Conversations', icon: '💬' },
              { id: 'cost' as View, label: 'Cost', icon: '💰' },
              { id: 'search' as View, label: 'Search', icon: '🔍' },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all mc-font-sans
                  ${activeView === view.id
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-gray-700'
                  }
                `}
              >
                <span>{view.icon}</span>
                <span>{view.label}</span>
                {view.count !== undefined && view.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                    {view.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-8 px-6 py-6">
        {/* Mission Control View - NEW */}
        {activeView === 'agents' && (
          <AgentMissionControl
            agents={activeAgents}
            orchestratorStatus={orchestratorStatus}
            recentActivity={recentActivity}
            agentLogs={logs}
            workflowSummary={overviewData ? {
              currentPhase: overviewData.currentPhase,
              currentStage: overviewData.currentStage,
              progress: overviewData.progress,
            } : undefined}
            onNavigateToMonitor={() => setActiveView('monitor')}
          />
        )}

        {/* Kanban Board View - NEW */}
        {activeView === 'kanban' && (
          <KanbanBoardAgentAware
            tasks={tasks}
            activeAgents={activeAgents}
            onAddFeature={handleAddFeature}
            onExpandProject={handleExpandProject}
            onTaskClick={handleTaskClick}
          />
        )}

        {/* Dependency Graph View - React Flow + Dagre */}
        {activeView === 'graph' && (
          <TaskDependencyGraph
            activeAgents={activeAgents}
            onTaskClick={handleTaskClick}
          />
        )}

        {/* Monitor View - Existing */}
        {activeView === 'monitor' && (
          <MonitorView />
        )}

        {/* Visual Memory View - Existing */}
        {activeView === 'memory' && (
          <VisualMemoryView />
        )}

        {/* Conversations View */}
        {activeView === 'conversations' && (
          <ConversationsPanel />
        )}

        {/* Cost Metrics View */}
        {activeView === 'cost' && (
          <CostMetrics />
        )}

        {/* Conversation Search View */}
        {activeView === 'search' && (
          <ConversationSearchPage />
        )}
      </main>

      {/* Celebration Overlay */}
      {celebrationQueue.length > 0 && (
        <CelebrationOverlay
          celebration={celebrationQueue[0]}
          onDismiss={dismissCelebration}
        />
      )}

      {/* Keyboard Help Modal */}
      <KeyboardHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        shortcuts={shortcuts}
        onUpdateShortcut={handleUpdateShortcut}
        onResetShortcuts={handleResetShortcuts}
      />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commandPaletteItems}
        recentCommands={recentCommands}
        onSelectCommand={handleSelectCommand}
      />

      {/* AI Assistant Panel */}
      <AssistantPanel
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        projectName="AICodePath"
      />

      {/* Expand Project Modal */}
      <ExpandProjectModal
        isOpen={expandModalOpen}
        onClose={() => setExpandModalOpen(false)}
        onAddFeatures={handleAddFeatures}
        projectName="AICodePath"
      />

      {/* Footer */}
      <footer className="mc-tech-border bg-gray-900/50 border-t border-gray-800 py-4 px-6">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mc-font-mono">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400 animate-pulse' : 'bg-red-400'}`} />
            AICodePath Dashboard // WebSocket {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <span className="text-gray-700">|</span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs border border-gray-700">Cmd/Ctrl + K</kbd> for commands</span>
        </div>
      </footer>
    </div>
  );
}

// Celebration Overlay Component
interface CelebrationOverlayProps {
  celebration: {
    featureId: number;
    featureName: string;
    agentName: string;
    timestamp: string;
  };
  onDismiss: () => void;
}

function CelebrationOverlay({ celebration, onDismiss }: CelebrationOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`
        fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div
        className={`
          mc-tech-border
          bg-gradient-to-br
          from-gray-900
          to-gray-950
          rounded-2xl
          p-8
          max-w-md
          mx-4
          text-center
          transform
          transition-all
          duration-300
          ${isVisible ? 'scale-100' : 'scale-90'}
        `}
      >
        {/* Animated celebration icon */}
        <div className="text-6xl mb-4 mc-animate-celebrate">🎉</div>

        <h2 className="text-2xl font-bold text-white mb-2 mc-font-sans">
          Feature Complete!
        </h2>

        <p className="text-gray-400 mb-6">
          <span className="font-semibold text-cyan-400">{celebration.agentName}</span> has completed
          <span className="font-semibold text-cyan-400"> {celebration.featureName}</span>
        </p>

        <div className="flex items-center justify-center gap-3 text-xs text-gray-600 mb-6 mc-font-mono">
          <span>FEATURE ID: {celebration.featureId}</span>
          <span>|</span>
          <span>{new Date(celebration.timestamp).toLocaleTimeString()}</span>
        </div>

        <button
          onClick={handleDismiss}
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all font-medium mc-font-sans"
        >
          Continue
        </button>
      </div>

      {/* Confetti effect */}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          background: linear-gradient(45deg, #06b6d4, #a855f7, #22c55e);
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}
