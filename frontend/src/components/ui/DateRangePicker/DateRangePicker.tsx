/**
 * MindFlow - Date Range Picker
 * Single trigger field that opens a calendar for picking a start and end
 * date together, replacing separate From/To date inputs.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DateRangePickerProps {
  /** yyyy-MM-dd, matching the existing dateFrom/dateTo query param format */
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  className?: string;
  /** Merged onto the trigger button itself (e.g. to shrink height/font size) */
  triggerClassName?: string;
  /** Applied to the trigger button so an external <label htmlFor> can target it */
  id?: string;
}

const ISO_FORMAT = 'yyyy-MM-dd';
const DISPLAY_FORMAT = 'dd/MM/yyyy';

function parseIso(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function buildMonthGrid(monthAnchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthAnchor));
  const end = startOfWeek(endOfMonth(monthAnchor));
  // 6 rows x 7 days always covers a month regardless of where it starts/ends.
  const gridEnd = new Date(end);
  gridEnd.setDate(gridEnd.getDate() + 6);
  return eachDayOfInterval({ start, end: gridEnd });
}

export function DateRangePicker({ from, to, onChange, placeholder = 'Select date range', className, triggerClassName, id }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseIso(from) ?? new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedFrom = useMemo(() => parseIso(from), [from]);
  const selectedTo = useMemo(() => parseIso(to), [to]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const label =
    selectedFrom && selectedTo
      ? `${format(selectedFrom, DISPLAY_FORMAT)} - ${format(selectedTo, DISPLAY_FORMAT)}`
      : selectedFrom
        ? `${format(selectedFrom, DISPLAY_FORMAT)} - ...`
        : '';

  const handleDayClick = (day: Date) => {
    // First click (or click after a complete range is already set) starts a
    // new range; the second click completes it, swapping if picked out of
    // order so from is always <= to.
    if (!selectedFrom || (selectedFrom && selectedTo)) {
      onChange(format(day, ISO_FORMAT), '');
      return;
    }
    if (isBefore(day, selectedFrom)) {
      onChange(format(day, ISO_FORMAT), format(selectedFrom, ISO_FORMAT));
    } else {
      onChange(format(selectedFrom, ISO_FORMAT), format(day, ISO_FORMAT));
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
  };

  const rangeEnd = selectedTo ?? hoverDate;
  const monthDays = buildMonthGrid(visibleMonth);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm',
          'border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'text-left',
          triggerClassName
        )}
      >
        <span className={label ? 'text-gray-900' : 'text-gray-400'}>{label || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0 pl-2">
          {label && (
            <X
              className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
              aria-label="Clear date range"
            />
          )}
          <Calendar className="h-4 w-4 text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-900">{format(visibleMonth, 'MMMM yyyy')}</span>
            <button
              type="button"
              onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-gray-400 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {monthDays.map((day) => {
              const inCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isStart = selectedFrom && isSameDay(day, selectedFrom);
              const isEnd = selectedTo && isSameDay(day, selectedTo);
              const isInRange =
                selectedFrom &&
                rangeEnd &&
                !isAfter(selectedFrom, rangeEnd) &&
                isWithinInterval(day, { start: selectedFrom, end: rangeEnd });

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={!inCurrentMonth}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => setHoverDate(day)}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-full text-sm transition',
                    !inCurrentMonth && 'invisible',
                    inCurrentMonth && !isStart && !isEnd && isInRange && 'bg-primary-100 text-primary-700 rounded-none',
                    inCurrentMonth && !isStart && !isEnd && !isInRange && 'text-gray-700 hover:bg-gray-100',
                    (isStart || isEnd) && 'bg-primary-600 text-white font-medium'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
