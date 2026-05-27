import React, { useState } from 'react';
import { Clock, Calendar, TestTube, Wrench, Code, Terminal, Info, ChevronDown } from 'lucide-react';
import type { Schedule } from './index';

interface Props {
  schedule: Schedule | null;
  onSave: (schedule: Partial<Schedule>) => void;
  onCancel: () => void;
}

const ACTION_CONFIG = [
  { value: 'run_tests', label: 'Run Tests', icon: TestTube, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  { value: 'build', label: 'Build Project', icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  { value: 'lint', label: 'Run Linter', icon: Code, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  { value: 'custom', label: 'Custom Command', icon: Terminal, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
] as const;

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the top of every hour' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs at 00:00, 06:00, 12:00, 18:00' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs daily at 12:00 AM' },
  { label: 'Every day at 9 AM', value: '0 9 * * *', description: 'Runs daily at 9:00 AM' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Runs weekly on Monday at 9:00 AM' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs 4 times per hour' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5', description: 'Runs Mon-Fri at 9:00 AM' },
];

export function ScheduleForm({ schedule, onSave, onCancel }: Props) {
  const [name, setName] = useState(schedule?.name || '');
  const [action, setAction] = useState<'run_tests' | 'build' | 'lint' | 'custom'>(
    schedule?.action || 'run_tests'
  );
  const [customCommand, setCustomCommand] = useState(schedule?.customCommand || '');
  const [cron, setCron] = useState(schedule?.cron || '0 9 * * *');
  const [showCustomCron, setShowCustomCron] = useState(
    !CRON_PRESETS.some(p => p.value === schedule?.cron)
  );
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Partial<Schedule> = {
      name: name.trim(),
      action,
      cron,
      cronDescription: showCustomCron ? 'Custom schedule' : CRON_PRESETS.find(p => p.value === cron)?.description || '',
      enabled: schedule?.enabled ?? true,
      runCount: schedule?.runCount || 0,
    };

    if (action === 'custom') {
      data.customCommand = customCommand.trim();
    }

    onSave(data);
  };

  const selectedActionConfig = ACTION_CONFIG.find(a => a.value === action);
  const ActionIcon = selectedActionConfig?.icon || Terminal;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-white mb-1 mc-font-sans">
          {schedule ? 'Edit Schedule' : 'Create New Schedule'}
        </h3>
        <p className="text-sm text-gray-400 mc-font-mono">
          {schedule ? 'Modify the schedule settings below' : 'Configure an automated task to run on a schedule'}
        </p>
      </div>

      {/* Schedule Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2 mc-font-sans">
          Schedule Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Nightly Tests, Daily Build"
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 mc-font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          required
          autoFocus
        />
      </div>

      {/* Action Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3 mc-font-sans">
          Action to Execute
        </label>
        <div className="grid grid-cols-2 gap-3">
          {ACTION_CONFIG.map((config) => {
            const Icon = config.icon;
            const isSelected = action === config.value;

            return (
              <button
                key={config.value}
                type="button"
                onClick={() => setAction(config.value as typeof action)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${isSelected
                    ? `${config.bg} ${config.border} ${config.color}`
                    : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? config.bg : 'bg-gray-700/50'}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? config.color : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className={`font-medium mc-font-sans ${isSelected ? 'text-white' : ''}`}>
                      {config.label}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-current opacity-20" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Command Input */}
      {action === 'custom' && (
        <div className="mc-thought-bubble rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2 mc-font-sans flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            Custom Command
          </label>
          <input
            type="text"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            placeholder="e.g., npm run my-script"
            className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 mc-font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-all"
            required
          />
          <p className="mt-2 text-xs text-gray-500 mc-font-mono flex items-center gap-1">
            <Info className="w-3 h-3" />
            Enter the exact command to run in the terminal
          </p>
        </div>
      )}

      {/* Schedule (Cron) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3 mc-font-sans flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Schedule
        </label>

        {!showCustomCron ? (
          <div className="space-y-3">
            {/* Preset dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white mc-font-mono text-left flex items-center justify-between hover:border-gray-600 transition-all"
              >
                <span>
                  {CRON_PRESETS.find(p => p.value === cron)?.label || 'Custom'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showPresetDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {showPresetDropdown && (
                <div className="absolute z-10 w-full mt-2 mc-tech-border rounded-xl bg-gray-900/95 backdrop-blur-xl shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto mc-scroll">
                    {CRON_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setCron(preset.value);
                          setShowPresetDropdown(false);
                        }}
                        className={`
                          w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-all
                          ${cron === preset.value ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : ''}
                        `}
                      >
                        <div className="text-white font-medium mc-font-sans">{preset.label}</div>
                        <div className="text-xs text-gray-500 mc-font-mono mt-0.5">{preset.description}</div>
                        <div className="text-xs text-cyan-400 mc-font-mono mt-1 opacity-70">{preset.value}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Current selection display */}
            <div className="mc-thought-bubble rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-400 mc-font-mono">
                  {CRON_PRESETS.find(p => p.value === cron)?.description || cron}
                </span>
              </div>
            </div>

            {/* Custom cron link */}
            <button
              type="button"
              onClick={() => {
                setShowCustomCron(true);
                setShowPresetDropdown(false);
              }}
              className="text-sm text-purple-400 hover:text-purple-300 mc-font-mono flex items-center gap-1"
            >
              <Terminal className="w-3 h-3" />
              Use custom cron expression
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mc-thought-bubble rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2 mc-font-sans">
                Cron Expression
              </label>
              <input
                type="text"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="* * * * *"
                className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white mc-font-mono focus:outline-none focus:border-purple-500/50 transition-all"
                pattern="^\S+\s+\S+\s+\S+\s+\S+\s+\S+$"
                required
              />
              <p className="mt-2 text-xs text-gray-500 mc-font-mono">
                Format: minute hour day month weekday
              </p>
              <p className="mt-1 text-xs text-gray-600 mc-font-mono">
                Example: <code className="text-cyan-400">0 9 * * 1</code> = Every Monday at 9 AM
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCustomCron(false);
                setCron('0 9 * * *');
              }}
              className="text-sm text-purple-400 hover:text-purple-300 mc-font-mono flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              Use preset schedule
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all mc-font-sans font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:brightness-110 transition-all mc-font-sans font-semibold flex items-center gap-2"
        >
          <ActionIcon className="w-4 h-4" />
          {schedule ? 'Update Schedule' : 'Create Schedule'}
        </button>
      </div>
    </form>
  );
}
