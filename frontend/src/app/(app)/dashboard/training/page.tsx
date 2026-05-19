'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { courseService, myTrainingService } from '@/services/training';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';
import type { CourseStatus, CourseDeliveryMode } from '@/services/training/types';

const statusColors: Record<CourseStatus, 'gray' | 'blue' | 'green' | 'yellow'> = {
  DRAFT: 'gray',
  PUBLISHED: 'green',
  ARCHIVED: 'yellow',
};

const deliveryModeLabels: Record<CourseDeliveryMode, string> = {
  ONLINE: 'Online',
  IN_PERSON: 'In-Person',
  HYBRID: 'Hybrid',
};

export default function TrainingPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Fetch my training summary
  const { data: summary } = useQuery({
    queryKey: ['myTrainingSummary'],
    queryFn: () => myTrainingService.getSummary(),
  });

  // Fetch courses
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['courses', { search, status, category, page, pageSize }],
    queryFn: () =>
      courseService.list({
        search: search || undefined,
        status: status as CourseStatus || undefined,
        category: category || undefined,
        page,
        pageSize,
      }),
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['courseCategories'],
    queryFn: () => courseService.getCategories(),
  });

  if (isLoading) return <LoadingState message="Loading courses..." />;
  if (error) return <ErrorState message="Failed to load courses" onRetry={refetch} />;

  const courses = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Training</h1>
          <p className="text-gray-600">Browse and enroll in courses</p>
        </div>
        <Link href="/dashboard/training/courses/new">
          <Button>Create Course</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SummaryCard label="Enrolled" value={summary.enrolledCourses} />
          <SummaryCard label="In Progress" value={summary.inProgressCourses} color="blue" />
          <SummaryCard label="Completed" value={summary.completedCourses} color="green" />
          <SummaryCard label="Upcoming Sessions" value={summary.upcomingSessions} color="yellow" />
          <SummaryCard label="Certificates" value={summary.totalCertificates} color="purple" />
          <SummaryCard label="Expiring Soon" value={summary.expiringCertificates} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search courses..."
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All Status</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-48"
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
      </div>

      {/* Course Grid */}
      {courses.length === 0 ? (
        <EmptyState
          title="No courses found"
          description="Create your first course to get started"
          action={
            <Link href="/dashboard/training/courses/new">
              <Button>Create Course</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
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

function SummaryCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: number;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function CourseCard({ course }: { course: { id: string; title: string; description?: string | null; status: CourseStatus; deliveryMode: CourseDeliveryMode; category?: string | null; duration?: number | null; enrollmentCount: number; thumbnailUrl?: string | null } }) {
  return (
    <Link href={`/dashboard/training/courses/${course.id}`}>
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
        {/* Thumbnail */}
        <div className="h-40 bg-gray-200 rounded-t-lg overflow-hidden">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2">{course.title}</h3>
            <Badge variant={statusColors[course.status]}>{course.status}</Badge>
          </div>

          {course.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {deliveryModeLabels[course.deliveryMode]}
            </span>
            {course.duration && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {course.duration} mins
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {course.enrollmentCount} enrolled
            </span>
          </div>

          {course.category && (
            <Badge variant="gray" className="text-xs">
              {course.category}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
