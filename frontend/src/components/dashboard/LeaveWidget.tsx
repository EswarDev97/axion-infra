/**
 * MindFlow - Leave Widget Component
 * Displays leave balance summary and recent requests
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface LeaveBalance {
  type: string;
  available: number;
  total: number;
  color: string;
}

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  days: number;
}

export function LeaveWidget() {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    const fetchLeaveData = async () => {
      setLoading(true);
      try {
        // TODO: Fetch actual leave data from API
        await new Promise((resolve) => setTimeout(resolve, 500));
        setBalances([
          { type: 'Annual', available: 12, total: 20, color: 'bg-blue-500' },
          { type: 'Sick', available: 8, total: 10, color: 'bg-red-500' },
          { type: 'Personal', available: 3, total: 5, color: 'bg-purple-500' },
        ]);
        setRecentRequests([
          {
            id: '1',
            type: 'Annual Leave',
            startDate: '2026-01-20',
            endDate: '2026-01-22',
            status: 'pending',
            days: 3,
          },
          {
            id: '2',
            type: 'Sick Leave',
            startDate: '2026-01-10',
            endDate: '2026-01-10',
            status: 'approved',
            days: 1,
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch leave data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, []);

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded" />
          <div className="h-16 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Leave Balance</h2>
        <Link
          href="/dashboard/leave"
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Leave Balance Bars */}
      <div className="space-y-3 mb-6">
        {balances.map((balance) => (
          <div key={balance.type}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">{balance.type}</span>
              <span className="font-medium text-gray-900">
                {balance.available} / {balance.total} days
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${balance.color} transition-all duration-300`}
                style={{
                  width: `${(balance.available / balance.total) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requests */}
      {recentRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Recent Requests
          </h3>
          <div className="space-y-2">
            {recentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {request.startDate === request.endDate
                        ? request.startDate
                        : `${request.startDate} - ${request.endDate}`}{' '}
                      ({request.days} day{request.days > 1 ? 's' : ''})
                    </p>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
