'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { enrollmentService } from '@/services/training';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';
import type { EnrollmentStatus } from '@/services/training/types';

const statusColors: Record<EnrollmentStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  ENROLLED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  DROPPED: 'gray',
  FAILED: 'red',
};

export default function EnrollmentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['enrollments', { search, status, page, pageSize }],
    queryFn: () =>
      enrollmentService.list({
        search: search || undefined,
        status: status as EnrollmentStatus || undefined,
        page,
        pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading enrollments..." />;
  if (error) return <ErrorState message="Failed to load enrollments" onRetry={refetch} />;

  const enrollments = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Enrollments</h1>
          <p className="text-gray-600">Track course enrollments and progress</p>
        </div>
        <Link href="/dashboard/training/enrollments/bulk">
          <Button>Bulk Enroll</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or course..."
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All Status</option>
          <option value="ENROLLED">Enrolled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="DROPPED">Dropped</option>
          <option value="FAILED">Failed</option>
        </Select>
      </div>

      {/* Enrollments List */}
      {enrollments.length === 0 ? (
        <EmptyState
          title="No enrollments found"
          description="Enroll users in courses to track their progress"
          action={
            <Link href="/dashboard/training/enrollments/bulk">
              <Button>Bulk Enroll</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Progress</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Enrolled</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Accessed</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Expires</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium">{enrollment.employeeName || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <Link
                      href={`/dashboard/training/courses/${enrollment.courseId}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {enrollment.courseName || '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[enrollment.status]}>{enrollment.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${enrollment.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{enrollment.progressPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {enrollment.lastAccessedAt
                      ? new Date(enrollment.lastAccessedAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {enrollment.expiresAt
                      ? new Date(enrollment.expiresAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/training/enrollments/${enrollment.id}`}>
                      <Button variant="outline" size="sm">
                        View
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
