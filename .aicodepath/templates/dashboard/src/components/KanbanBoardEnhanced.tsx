import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDatabase } from '../hooks/useDatabase';
import { AnimatedCounter } from './shared/AnimatedCounter';
import { Toast } from './shared/Toast';

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  priority: 'high' | 'medium' | 'low';
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMN_CONFIG = {
  pending: { title: 'Pending', color: 'slate', icon: '📋', gradient: 'from-slate-500/20' },
  in_progress: { title: 'In Progress', color: 'blue', icon: '⚡', gradient: 'from-blue-500/20' },
  completed: { title: 'Completed', color: 'green', icon: '✅', gradient: 'from-green-500/20' },
  blocked: { title: 'Blocked', color: 'red', icon: '🚫', gradient: 'from-red-500/20' },
  skipped: { title: 'Skipped', color: 'yellow', icon: '⏭️', gradient: 'from-yellow-500/20' },
} as const;

const PRIORITY_COLORS = {
  high: 'bg-red-500/20 text-red-400 border-red-500/40',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  low: 'bg-green-500/20 text-green-400 border-green-500/40',
};

export function KanbanBoard() {
  const { data: tasks } = useDatabase<Task[]>('/tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleColumn = (columnId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      blocked: [],
      skipped: [],
    };
    filteredTasks.forEach(task => {
      grouped[task.status]?.push(task);
    });
    return grouped;
  }, [filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    setActiveId(null);

    if (!over) return;

    const overColumnId = over.id;

    showToast(`Task moved to ${COLUMN_CONFIG[overColumnId as keyof typeof COLUMN_CONFIG]?.title}`);
  };

  const activeTask = activeId ? tasks?.find(t => t.id.toString() === activeId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated grain overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none bg-noise" />

      {/* Neural grid background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-2 tracking-tight">
            Task Command Center
          </h2>
          <p className="text-slate-400 font-light text-lg">Workflow orchestration and task management</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-6 py-3 pl-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </motion.div>

        {/* Kanban Columns */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(COLUMN_CONFIG).map(([status, config], i) => (
              <Column
                key={status}
                id={status}
                config={config}
                tasks={tasksByStatus[status] || []}
                collapsed={collapsedColumns.has(status)}
                onToggle={() => toggleColumn(status)}
                onTaskClick={setSelectedTask}
                index={i}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard task={activeTask} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
      </AnimatePresence>

      <Toast message={toast} />

      {/* CSS for grain */}
      <style>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0%); }
          70% { transform: translate(0%, 15%); }
          80% { transform: translate(3%, 35%); }
          90% { transform: translate(-10%, 10%); }
        }
        .bg-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          animation: grain 8s steps(10) infinite;
        }
      `}</style>
    </div>
  );
}

function Column({ id: _id, config, tasks, collapsed, onToggle, onTaskClick, index }: {
  id: string;
  config: typeof COLUMN_CONFIG[keyof typeof COLUMN_CONFIG];
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
  onTaskClick: (task: Task) => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-gradient-to-br ${config.gradient} to-transparent backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden ${collapsed ? 'col-span-1' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{config.title}</h3>
            <div className="text-xs text-slate-400">
              <AnimatedCounter value={tasks.length} /> tasks
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          <SortableContext items={tasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2 opacity-50">{config.icon}</div>
                <p className="text-slate-500 text-sm">No tasks</p>
              </div>
            ) : (
              tasks.map((task, i) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  index={i}
                />
              ))
            )}
          </SortableContext>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SortableTaskCard({ task, onClick, index }: { task: Task; onClick: () => void; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} index={index} />
    </div>
  );
}

function TaskCard({ task, onClick, isDragging, index = 0 }: { task: Task; onClick?: () => void; isDragging?: boolean; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: isDragging ? 1 : 1.02, y: isDragging ? 0 : -2 }}
      onClick={onClick}
      className={`bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-all ${isDragging ? 'shadow-2xl' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-medium flex-1 pr-2">{task.title}</h4>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-sm text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{task.assignee || 'Unassigned'}</span>
        <span>{new Date(task.created_at).toLocaleDateString()}</span>
      </div>
    </motion.div>
  );
}

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-2">{task.title}</h3>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority} priority
              </span>
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40">
                {task.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">Description</label>
            <p className="text-white text-lg">{task.description || 'No description provided'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Assignee</label>
              <p className="text-white">{task.assignee || 'Unassigned'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Created</label>
              <p className="text-white">{new Date(task.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">Last Updated</label>
            <p className="text-white">{new Date(task.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
