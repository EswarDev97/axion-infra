/**
 * MindFlow - Attendance Check In/Out Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { attendanceService, type AttendanceRecord } from '@/services/hr';

export function AttendanceCheckInOut() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    fetchTodayStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    setLoading(true);
    try {
      const record = await attendanceService.getTodayStatus();
      setTodayRecord(record);
    } catch (err) {
      console.error('Failed to fetch today status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const record = await attendanceService.checkIn();
      setTodayRecord(record);
    } catch (err) {
      setError((err as Error).message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const record = await attendanceService.checkOut();
      setTodayRecord(record);
    } catch (err) {
      setError((err as Error).message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTimeShort = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canCheckIn = !todayRecord || !todayRecord.checkIn;
  const canCheckOut = todayRecord?.checkIn && !todayRecord?.checkOut;
  const isComplete = todayRecord?.checkIn && todayRecord?.checkOut;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-12 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      {error && (
        <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-600" />
            Time Tracking
          </h2>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {currentTime ? formatTime(currentTime) : '--:--:--'}
          </p>
          <p className="text-sm text-gray-500">
            {currentTime ? currentTime.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : '\u00A0'}
          </p>
        </div>

        <div className="text-right">
          {todayRecord?.checkIn && (
            <div className="mb-2">
              <span className="text-sm text-gray-500">Checked in at</span>
              <p className="font-semibold text-green-600">{formatTimeShort(todayRecord.checkIn)}</p>
            </div>
          )}
          {todayRecord?.checkOut && (
            <div className="mb-2">
              <span className="text-sm text-gray-500">Checked out at</span>
              <p className="font-semibold text-blue-600">{formatTimeShort(todayRecord.checkOut)}</p>
            </div>
          )}
          {todayRecord?.workHours && (
            <div>
              <span className="text-sm text-gray-500">Total hours</span>
              <p className="font-semibold text-gray-900">{Number(todayRecord.workHours).toFixed(1)} hrs</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {canCheckIn && (
          <Button onClick={handleCheckIn} loading={actionLoading} className="flex-1">
            <LogIn className="h-4 w-4 mr-2" />
            Check In
          </Button>
        )}
        {canCheckOut && (
          <Button onClick={handleCheckOut} loading={actionLoading} variant="outline" className="flex-1">
            <LogOut className="h-4 w-4 mr-2" />
            Check Out
          </Button>
        )}
        {isComplete && (
          <div className="flex-1 text-center py-2 bg-green-50 rounded-lg border border-green-200">
            <span className="text-green-700 font-medium">Day Complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
