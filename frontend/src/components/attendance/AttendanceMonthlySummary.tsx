/**
 * MindFlow - Monthly Attendance Summary Component
 * Shows summary cards for the current month: present, late, absent, half-day
 */

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { attendanceService, type AttendanceRecord } from '@/services/hr';

interface SummaryData {
  present: number;
  late: number;
  absent: number;
  halfDay: number;
  totalHours: number;
}

export function AttendanceMonthlySummary() {
  const [summary, setSummary] = useState<SummaryData>({
    present: 0, late: 0, absent: 0, halfDay: 0, totalHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlySummary = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const records = await attendanceService.getMyAttendance({ startDate, endDate });

        const data: SummaryData = {
          present: 0, late: 0, absent: 0, halfDay: 0, totalHours: 0,
        };

        records.forEach((r: AttendanceRecord) => {
          switch (r.status) {
            case 'PRESENT': data.present++; break;
            case 'LATE': data.late++; break;
            case 'ABSENT': data.absent++; break;
            case 'HALF_DAY': data.halfDay++; break;
          }
          if (r.workHours) data.totalHours += Number(r.workHours);
        });

        setSummary(data);
      } catch (err) {
        console.error('Failed to fetch monthly summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlySummary();
  }, []);

  const cards = [
    { label: 'Present', value: summary.present, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Late', value: summary.late, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Absent', value: summary.absent, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Half Day', value: summary.halfDay, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const monthName = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        Monthly Summary - {monthName}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <span className="text-sm text-gray-500">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded bg-purple-50">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Total Hours</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{Number(summary.totalHours).toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}
