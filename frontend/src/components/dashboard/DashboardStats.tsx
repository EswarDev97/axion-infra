/**
 * MindFlow - Dashboard Stats Component
 * Displays key metrics cards on the dashboard
 * Connected to real attendance API for Present Today stat
 */

'use client';

import { useEffect, useState } from 'react';
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import { attendanceService, type DashboardAttendanceStats } from '@/services/hr';
import { useAuthStore } from '@/stores/authStore';

interface StatCard {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

export function DashboardStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        let attendanceStats: DashboardAttendanceStats | null = null;

        // Only fetch real attendance stats if user has permission
        if (hasPermission('hr:read:all')) {
          try {
            attendanceStats = await attendanceService.getDashboardStats();
          } catch {
            // Fall back to defaults if API fails
          }
        }

        setStats([
          {
            label: 'Total Employees',
            value: attendanceStats?.totalEmployees ?? '-',
            change: attendanceStats ? `${attendanceStats.totalEmployees} active` : '',
            changeType: 'neutral',
            icon: <Users className="h-6 w-6" />,
            color: 'bg-blue-500',
          },
          {
            label: 'Present Today',
            value: attendanceStats?.presentToday ?? '-',
            change: attendanceStats
              ? `${attendanceStats.attendancePercentage}% attendance`
              : '',
            changeType: 'positive',
            icon: <CheckCircle className="h-6 w-6" />,
            color: 'bg-green-500',
          },
          {
            label: 'On Leave',
            value: attendanceStats?.onLeaveToday ?? '-',
            change: attendanceStats?.lateToday
              ? `${attendanceStats.lateToday} late today`
              : '',
            changeType: 'neutral',
            icon: <Calendar className="h-6 w-6" />,
            color: 'bg-amber-500',
          },
          {
            label: 'Absent Today',
            value: attendanceStats?.absentToday ?? '-',
            change: '',
            changeType: 'negative',
            icon: <Clock className="h-6 w-6" />,
            color: 'bg-red-500',
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [hasPermission]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-7 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className={`${stat.color} text-white p-3 rounded-lg`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
          {stat.change && (
            <p
              className={`mt-3 text-xs ${
                stat.changeType === 'positive'
                  ? 'text-green-600'
                  : stat.changeType === 'negative'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
