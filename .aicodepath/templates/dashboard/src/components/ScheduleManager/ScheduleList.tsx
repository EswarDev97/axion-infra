import { Play, Pause, Trash2, Edit2, Calendar, Clock } from 'lucide-react';
import type { Schedule } from './index';

interface Props {
  schedules: Schedule[];
  isLoading: boolean;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onRunNow: (id: string) => void;
}

const ACTION_ICONS: Record<string, string> = {
  run_tests: '🧪',
  build: '🏗️',
  lint: '🔍',
  custom: '⚡',
};

const ACTION_COLORS: Record<string, string> = {
  run_tests: 'text-green-400 bg-green-500/20 border-green-500/30',
  build: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  lint: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  custom: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
};

export function ScheduleList({ schedules, isLoading, onEdit, onDelete, onToggle, onRunNow }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full" />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 mc-font-sans">No schedules yet</h3>
        <p className="text-gray-500 mc-font-mono text-sm">
          Create your first automated task to get started
        </p>
      </div>
    );
  }

  // Group schedules by enabled state
  const enabledSchedules = schedules.filter(s => s.enabled);
  const disabledSchedules = schedules.filter(s => !s.enabled);

  return (
    <div className="space-y-6">
      {/* Active schedules */}
      {enabledSchedules.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mc-font-sans">
              Active ({enabledSchedules.length})
            </h3>
          </div>
          <div className="space-y-3">
            {enabledSchedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                onRunNow={onRunNow}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive schedules */}
      {disabledSchedules.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-gray-600" />
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mc-font-sans">
              Inactive ({disabledSchedules.length})
            </h3>
          </div>
          <div className="space-y-3 opacity-60">
            {disabledSchedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                onRunNow={onRunNow}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onRunNow: (id: string) => void;
}

function ScheduleCard({ schedule, onEdit, onDelete, onToggle, onRunNow }: ScheduleCardProps) {
  const actionColor = ACTION_COLORS[schedule.action] || ACTION_COLORS.custom;
  const actionIcon = ACTION_ICONS[schedule.action] || '⚡';

  return (
    <div className={`
      mc-tech-border rounded-xl bg-gradient-to-r from-gray-800/40 to-gray-900/40
      hover:from-gray-800/60 hover:to-gray-900/60 transition-all duration-200
      ${schedule.enabled ? '' : 'opacity-60'}
    `}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          {/* Left side - icon and name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Action icon */}
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center text-2xl border flex-shrink-0
              ${actionColor}
            `}>
              {actionIcon}
            </div>

            {/* Name and description */}
            <div className="min-w-0 flex-1">
              <h4 className="text-white font-semibold mc-font-sans truncate">
                {schedule.name}
              </h4>
              <p className="text-sm text-gray-500 mc-font-mono truncate">
                {schedule.action === 'custom' ? schedule.customCommand : schedule.action.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium mc-font-mono border flex-shrink-0
            ${schedule.enabled
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-gray-700/50 text-gray-500 border-gray-600/50'
            }
          `}>
            {schedule.enabled ? 'ACTIVE' : 'PAUSED'}
          </div>
        </div>

        {/* Schedule info */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          {/* Cron schedule */}
          <div className="flex items-center gap-2 text-gray-400 mc-font-mono">
            <Clock className="w-4 h-4" />
            <span>{schedule.cronDescription || schedule.cron}</span>
          </div>

          {/* Next run (if available) */}
          {schedule.nextRun && schedule.enabled && (
            <div className="flex items-center gap-2 text-gray-500 mc-font-mono text-xs">
              <Calendar className="w-3 h-3" />
              <span>Next: {new Date(schedule.nextRun).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 pt-4 border-t border-gray-700/50">
          {/* Run now button */}
          <button
            onClick={() => onRunNow(schedule.id)}
            className="p-2 rounded-lg hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-all"
            title="Run now"
          >
            <Play className="w-4 h-4" />
          </button>

          {/* Edit button */}
          <button
            onClick={() => onEdit(schedule)}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all"
            title="Edit schedule"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Toggle button */}
          <button
            onClick={() => onToggle(schedule.id)}
            className={`
              p-2 rounded-lg transition-all flex items-center gap-2
              ${schedule.enabled
                ? 'hover:bg-amber-500/20 text-gray-400 hover:text-amber-400'
                : 'hover:bg-green-500/20 text-gray-400 hover:text-green-400'
              }
            `}
            title={schedule.enabled ? 'Pause schedule' : 'Enable schedule'}
          >
            {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-xs mc-font-mono hidden sm:inline">
              {schedule.enabled ? 'Pause' : 'Enable'}
            </span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Delete button */}
          <button
            onClick={() => {
              if (confirm(`Delete schedule "${schedule.name}"?`)) {
                onDelete(schedule.id);
              }
            }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
            title="Delete schedule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Last run status indicator */}
        {schedule.lastStatus && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`
              w-1.5 h-1.5 rounded-full
              ${schedule.lastStatus === 'success' ? 'bg-green-400' :
                schedule.lastStatus === 'failed' ? 'bg-red-400' :
                'bg-amber-400 animate-pulse'}
            `} />
            <span className="text-xs text-gray-500 mc-font-mono">
              Last run: {schedule.lastStatus}
            </span>
            {schedule.lastRun && (
              <span className="text-xs text-gray-600 mc-font-mono">
                ({new Date(schedule.lastRun).toLocaleString()})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
