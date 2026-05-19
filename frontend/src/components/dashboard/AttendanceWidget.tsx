/**
 * MindFlow - Attendance Widget Component
 * Displays today's attendance summary and check-in/out functionality
 * Connected to real API via attendanceService
 */

'use client';

import { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { attendanceService, type AttendanceRecord } from '@/services/hr';

type WidgetStatus = 'not_started' | 'working' | 'completed';

export function AttendanceWidget() {
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const fetchTodayStatus = async () => {
    setLoading(true);
    try {
      const record = await attendanceService.getTodayStatus();
      setTodayRecord(record);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.checkIn();
      setTodayRecord(record);
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const record = await attendanceService.checkOut();
      setTodayRecord(record);
    } catch (error) {
      console.error('Check-out failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeShort = (dateString?: string | null): string => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatHours = (hours?: number | string | null): string => {
    if (hours === null || hours === undefined) return '--:--';
    const n = Number(hours);
    const h = Math.floor(n);
    const m = Math.round((n - h) * 60);
    return `${h}h ${m}m`;
  };

  // Determine status
  const getStatus = (): WidgetStatus => {
    if (!todayRecord || !todayRecord.checkIn) return 'not_started';
    if (todayRecord.checkIn && !todayRecord.checkOut) return 'working';
    return 'completed';
  };

  const status = getStatus();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Today&apos;s Attendance
        </h2>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Status Icon */}
        <div
          className={`p-4 rounded-full ${
            status === 'working'
              ? 'bg-green-100 text-green-600'
              : status === 'completed'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          <Clock className="h-8 w-8" />
        </div>

        {/* Time Info */}
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 uppercase">Check In</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTimeShort(todayRecord?.checkIn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Check Out</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTimeShort(todayRecord?.checkOut)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Hours</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatHours(todayRecord?.workHours)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {status === 'not_started' && (
            <Button
              onClick={handleCheckIn}
              loading={actionLoading}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Check In
            </Button>
          )}
          {status === 'working' && (
            <Button
              onClick={handleCheckOut}
              loading={actionLoading}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Check Out
            </Button>
          )}
          {status === 'completed' && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Day Complete
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
