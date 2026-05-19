'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { examService } from '@/services/training';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { Pagination } from '@/components/data/Pagination';

export default function ExamsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exams', { search, page, pageSize }],
    queryFn: () =>
      examService.list({
        page,
        pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading exams..." />;
  if (error) return <ErrorState message="Failed to load exams" onRetry={refetch} />;

  const exams = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const filteredExams = search
    ? exams.filter((exam) =>
        exam.title.toLowerCase().includes(search.toLowerCase()) ||
        exam.courseName?.toLowerCase().includes(search.toLowerCase())
      )
    : exams;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Exams</h1>
          <p className="text-gray-600">Manage course exams and assessments</p>
        </div>
        <Link href="/dashboard/training/exams/new">
          <Button>Create Exam</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search exams..."
          className="w-64"
        />
      </div>

      {/* Exams List */}
      {filteredExams.length === 0 ? (
        <EmptyState
          title="No exams found"
          description="Create your first exam to assess learners"
          action={
            <Link href="/dashboard/training/exams/new">
              <Button>Create Exam</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Exam</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Questions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Passing Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time Limit</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Max Attempts</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/training/exams/${exam.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {exam.title}
                    </Link>
                    {exam.description && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {exam.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <Link
                      href={`/dashboard/training/courses/${exam.courseId}`}
                      className="hover:text-blue-600"
                    >
                      {exam.courseName || '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {exam.questionCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {exam.passingScore}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {exam.timeLimit ? `${exam.timeLimit} mins` : 'Unlimited'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {exam.maxAttempts || 'Unlimited'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={exam.isActive ? 'green' : 'gray'}>
                      {exam.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/training/exams/${exam.id}/questions`}>
                        <Button variant="outline" size="sm">
                          Questions
                        </Button>
                      </Link>
                      <Link href={`/dashboard/training/exams/${exam.id}/attempts`}>
                        <Button variant="outline" size="sm">
                          Results
                        </Button>
                      </Link>
                    </div>
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
