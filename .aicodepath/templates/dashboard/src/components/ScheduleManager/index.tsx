import { useState, useEffect } from 'react';
import { Clock, Plus, History, X, Calendar as CalendarIcon } from 'lucide-react';
import { ScheduleForm } from './ScheduleForm';
import { ScheduleList } from './ScheduleList';

export interface Schedule {
  id: string;
  name: string;
  action: 'run_tests' | 'build' | 'lint' | 'custom';
  customCommand?: string;
  cron: string;
  cronDescription: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  lastStatus?: 'success' | 'failed' | 'running';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleManager({ isOpen, onClose }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load schedules from API
  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
    }
  }, [isOpen]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/schedules');
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      // Use mock data for demo
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (schedule: Partial<Schedule>) => {
    try {
      const method = editingSchedule ? 'PUT' : 'POST';
      const url = editingSchedule
        ? `/api/schedules/${editingSchedule.id}`
        : '/api/schedules';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });

      if (response.ok) {
        const saved = await response.json();

        setSchedules(prev => {
          if (editingSchedule) {
            return prev.map(s => s.id === saved.id ? saved : s);
          }
          return [...prev, saved];
        });

        setIsFormOpen(false);
        setEditingSchedule(null);
      }
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const handleToggle = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !schedule.enabled }),
      });

      if (response.ok) {
        setSchedules(prev =>
          prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
        );
      }
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}/run`, { method: 'POST' });
      // Update status to running
      setSchedules(prev =>
        prev.map(s => s.id === id ? { ...s, lastStatus: 'running' } : s)
      );
    } catch (error) {
      console.error('Failed to run schedule:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mc-modal-backdrop">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative mc-tech-border rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mc-header-gradient px-6 py-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <CalendarIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mc-font-sans">
                  Schedule Manager
                </h2>
                <p className="text-sm text-gray-400 mc-font-mono">
                  Automate your development tasks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* History button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`
                  p-2 rounded-lg transition-all flex items-center gap-2
                  ${showHistory
                    ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                    : 'hover:bg-gray-800/50 text-gray-400 hover:text-white'
                  }
                `}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline text-sm mc-font-mono">History</span>
              </button>

              {/* New schedule button */}
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:brightness-110 transition-all mc-font-sans font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Schedule</span>
              </button>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-6 mc-scroll">
            {isFormOpen ? (
              <ScheduleForm
                schedule={editingSchedule}
                onSave={handleSave}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingSchedule(null);
                }}
              />
            ) : showHistory ? (
              <ScheduleHistory schedules={schedules} onBack={() => setShowHistory(false)} />
            ) : (
              <ScheduleList
                schedules={schedules}
                isLoading={isLoading}
                onEdit={(schedule) => {
                  setEditingSchedule(schedule);
                  setIsFormOpen(true);
                }}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onRunNow={handleRunNow}
              />
            )}
          </div>
        </div>

        {/* Footer stats */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6 mc-font-mono">
              <span className="text-gray-400">
                <span className="text-cyan-400">{schedules.length}</span> total schedules
              </span>
              <span className="text-gray-400">
                <span className="text-green-400">{schedules.filter(s => s.enabled).length}</span> active
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4" />
              <span className="mc-font-mono text-xs">Powered by node-cron</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Schedule History component
interface ScheduleHistoryProps {
  schedules: Schedule[];
  onBack: () => void;
}

function ScheduleHistory({ schedules, onBack }: ScheduleHistoryProps) {
  const totalRuns = schedules.reduce((sum, s) => sum + s.runCount, 0);
  const successfulRuns = schedules.filter(s => s.lastStatus === 'success').length;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mc-font-mono text-sm"
      >
        <X className="w-4 h-4" />
        Back to schedules
      </button>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="mc-tech-border rounded-xl bg-gray-800/30 p-4">
          <div className="text-2xl font-bold text-cyan-400 mc-font-mono">{totalRuns}</div>
          <div className="text-sm text-gray-400 mc-font-sans">Total Runs</div>
        </div>
        <div className="mc-tech-border rounded-xl bg-gray-800/30 p-4">
          <div className="text-2xl font-bold text-green-400 mc-font-mono">{successfulRuns}</div>
          <div className="text-sm text-gray-400 mc-font-sans">Successful</div>
        </div>
        <div className="mc-tech-border rounded-xl bg-gray-800/30 p-4">
          <div className="text-2xl font-bold text-purple-400 mc-font-mono">
            {schedules.filter(s => s.enabled).length}
          </div>
          <div className="text-sm text-gray-400 mc-font-sans">Active Schedules</div>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="text-white font-semibold mb-4 mc-font-sans">Recent Activity</h3>
        <div className="space-y-2">
          {schedules.filter(s => s.lastRun).length === 0 ? (
            <div className="text-center py-8 text-gray-500 mc-font-mono">
              No recent activity
            </div>
          ) : (
            schedules
              .filter(s => s.lastRun)
              .sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime())
              .map(schedule => (
                <div
                  key={schedule.id}
                  className="mc-tech-border rounded-lg bg-gray-800/30 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-2 h-2 rounded-full
                      ${schedule.lastStatus === 'success' ? 'bg-green-400' :
                        schedule.lastStatus === 'failed' ? 'bg-red-400' :
                        schedule.lastStatus === 'running' ? 'bg-amber-400 animate-pulse' :
                        'bg-gray-500'}
                    `} />
                    <div>
                      <div className="text-white font-medium mc-font-sans">{schedule.name}</div>
                      <div className="text-xs text-gray-500 mc-font-mono">
                        {schedule.lastRun && new Date(schedule.lastRun).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className={`
                    px-2 py-1 rounded text-xs font-medium mc-font-mono
                    ${schedule.lastStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                      schedule.lastStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'}
                  `}>
                    {schedule.lastStatus?.toUpperCase() || 'PENDING'}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
