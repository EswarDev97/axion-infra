/**
 * MindFlow - Holiday Calendar Page Client
 * Shows holiday list + calendar view. Admin can add/edit/delete.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/feedback/Modal';
import { Alert } from '@/components/feedback/Alert';
import { useAuthStore } from '@/stores/authStore';
import {
  holidayService,
  type Holiday,
  type HolidayCreateRequest,
} from '@/services/hr';

const typeColors: Record<string, 'success' | 'info' | 'warning'> = {
  PUBLIC: 'success',
  COMPANY: 'info',
  OPTIONAL: 'warning',
};

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function HolidayPageClient() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(currentYear);
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  const { hasPermission } = useAuthStore();
  const canManage = hasPermission('hr:create:all');

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await holidayService.list({ year, pageSize: 100 });
      setHolidays(res.items);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await holidayService.delete(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError((err as Error).message || 'Failed to delete');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingHoliday(null);
  };

  const handleSaved = () => {
    handleFormClose();
    fetchHolidays();
  };

  // Build calendar data
  const holidayDates = new Map<string, Holiday>();
  holidays.forEach((h) => {
    holidayDates.set(h.holidayDate, h);
  });

  const daysInMonth = new Date(year, calendarMonth + 1, 0).getDate();
  const firstDay = new Date(year, calendarMonth, 1).getDay(); // 0=Sun
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Holiday Calendar</h1>
          <p className="text-gray-600">View and manage company holidays</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          {canManage && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Calendar View */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-gray-500 hover:text-gray-700 px-2 py-1"
            onClick={() => setCalendarMonth((p) => (p === 0 ? 11 : p - 1))}
          >
            &larr; Prev
          </button>
          <h2 className="text-lg font-semibold">
            <CalendarIcon className="h-5 w-5 inline mr-2" />
            {MONTHS[calendarMonth]} {year}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 px-2 py-1"
            onClick={() => setCalendarMonth((p) => (p === 11 ? 0 : p + 1))}
          >
            Next &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = `${year}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const holiday = holidayDates.get(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div
                key={dateStr}
                className={`min-h-[60px] p-1 rounded border text-sm ${
                  holiday
                    ? 'bg-blue-50 border-blue-200'
                    : isToday
                    ? 'bg-primary-50 border-primary-200'
                    : 'border-gray-100'
                }`}
                title={holiday ? `${holiday.holidayName} (${holiday.holidayType})` : ''}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                  {day}
                </span>
                {holiday && (
                  <p className="text-[10px] text-blue-700 leading-tight mt-0.5 truncate">
                    {holiday.holidayName}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Holiday List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">
            Holidays in {year} ({holidays.length})
          </h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : holidays.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No holidays found for {year}</div>
        ) : (
          <div className="divide-y">
            {holidays.map((h) => (
              <div key={h.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(h.holidayDate + 'T00:00:00').getDate()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {MONTHS[new Date(h.holidayDate + 'T00:00:00').getMonth()]?.slice(0, 3)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{h.holidayName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={typeColors[h.holidayType] || 'info'}>
                        {h.holidayType}
                      </Badge>
                      {h.isRecurring && (
                        <span className="text-xs text-gray-500">Recurring</span>
                      )}
                    </div>
                    {h.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{h.description}</p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingHoliday(h); setShowForm(true); }}
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <HolidayFormModal
          holiday={editingHoliday}
          onClose={handleFormClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}


// ============================================================================
// Holiday Form Modal
// ============================================================================

function HolidayFormModal({
  holiday,
  onClose,
  onSaved,
}: {
  holiday: Holiday | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!holiday;
  const [name, setName] = useState(holiday?.holidayName || '');
  const [date, setDate] = useState(holiday?.holidayDate || '');
  const [type, setType] = useState(holiday?.holidayType || 'PUBLIC');
  const [recurring, setRecurring] = useState(holiday?.isRecurring || false);
  const [description, setDescription] = useState(holiday?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name || !date) {
      setError('Name and date are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data: HolidayCreateRequest = {
        holidayName: name,
        holidayDate: date,
        holidayType: type as HolidayCreateRequest['holidayType'],
        isRecurring: recurring,
        description: description || undefined,
      };
      if (isEdit) {
        await holidayService.update(holiday!.id, data);
      } else {
        await holidayService.create(data);
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Holiday' : 'Add Holiday'}>
      <div className="space-y-4">
        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Republic Day" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value as "PUBLIC" | "COMPANY" | "OPTIONAL")}>
            <option value="PUBLIC">Public Holiday</option>
            <option value="COMPANY">Company Holiday</option>
            <option value="OPTIONAL">Optional Holiday</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="recurring"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="recurring" className="text-sm text-gray-700">Recurring every year</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
