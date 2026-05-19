/**
 * MindFlow - Team Today Status Component
 * Shows real-time attendance status for all team members (Manager view)
 */

'use client';

import { useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { attendanceService, type TeamTodayStatus } from '@/services/hr';

const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  HALF_DAY: 'info',
  ON_LEAVE: 'neutral',
  WORK_FROM_HOME: 'info',
};

export function TeamTodayStatusPanel() {
  const [statuses, setStatuses] = useState<TeamTodayStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getTeamTodayStatus();
      setStatuses(data);
    } catch (err) {
      console.error('Failed to fetch team status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const formatTime = (dateString?: string | null): string => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const checkedInCount = statuses.filter((s) => s.checkIn).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Team Status Today</h3>
          <span className="text-sm text-gray-500">
            ({checkedInCount}/{statuses.length} checked in)
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchStatuses}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {statuses.length === 0 ? (
        <div className="p-6 text-center text-gray-500">No team members found</div>
      ) : (
        <div className="divide-y">
          {statuses.map((member) => (
            <div key={member.employeeId} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{member.employeeName}</p>
                <p className="text-xs text-gray-500">
                  {member.employeeCode}
                  {member.departmentName && ` - ${member.departmentName}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <span className="text-gray-500">In: </span>
                  <span className="font-medium">{formatTime(member.checkIn)}</span>
                  {member.checkOut && (
                    <>
                      <span className="text-gray-500 ml-2">Out: </span>
                      <span className="font-medium">{formatTime(member.checkOut)}</span>
                    </>
                  )}
                </div>
                {member.status ? (
                  <Badge variant={statusColors[member.status] || 'neutral'}>
                    {member.status.replace(/_/g, ' ')}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Not Checked In</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
