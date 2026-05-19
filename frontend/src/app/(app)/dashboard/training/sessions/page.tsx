'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { sessionService } from '@/services/training';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';
import type { SessionStatus } from '@/services/training/types';

const statusColors: Record<SessionStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function TrainingSessionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trainingSessions', { search, status, page, pageSize }],
    queryFn: () =>
      sessionService.list({
        search: search || undefined,
        status: status as SessionStatus || undefined,
        page,
        pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading sessions..." />;
  if (error) return <ErrorState message="Failed to load sessions" onRetry={refetch} />;

  const sessions = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Training Sessions</h1>
          <p className="text-gray-600">Manage in-person and virtual training sessions</p>
        </div>
        <Link href="/dashboard/training/sessions/new">
          <Button>Schedule Session</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search sessions..."
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All Status</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions found"
          description="Schedule your first training session"
          action={
            <Link href="/dashboard/training/sessions/new">
              <Button>Schedule Session</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Session</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Instructor</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Location</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Attendees</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/training/sessions/${session.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {session.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {session.courseName || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {session.instructorName || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>
                      {new Date(session.sessionDate).toLocaleDateString()}
                    </div>
                    <div className="text-gray-400">
                      {session.startTime} - {session.endTime}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {session.location || session.meetingUrl ? (
                      <span>
                        {session.location || 'Virtual'}
                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-700"
                          >
                            Join
                          </a>
                        )}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {session.attendeeCount}
                    {session.maxAttendees && ` / ${session.maxAttendees}`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[session.status]}>{session.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/training/sessions/${session.id}/attendance`}>
                      <Button variant="outline" size="sm">
                        Attendance
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
