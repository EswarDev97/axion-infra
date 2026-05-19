'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService, enrollmentService } from '@/services/training';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/feedback/Modal';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import type { CourseStatus, TrainingContent } from '@/services/training/types';

const statusColors: Record<CourseStatus, 'gray' | 'blue' | 'green' | 'yellow'> = {
  DRAFT: 'gray',
  PUBLISHED: 'green',
  ARCHIVED: 'yellow',
};

const contentTypeIcons: Record<string, string> = {
  VIDEO: '🎥',
  DOCUMENT: '📄',
  QUIZ: '❓',
  INTERACTIVE: '🎮',
  EXTERNAL_LINK: '🔗',
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.id as string;

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch course details
  const { data: course, isLoading, error, refetch } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseService.getById(courseId),
  });

  // Fetch course content
  const { data: content } = useQuery({
    queryKey: ['courseContent', courseId],
    queryFn: () => courseService.getContent(courseId),
  });

  // Publish course mutation
  const publishMutation = useMutation({
    mutationFn: () => courseService.publish(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  // Archive course mutation
  const archiveMutation = useMutation({
    mutationFn: () => courseService.archive(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  // Delete course mutation
  const deleteMutation = useMutation({
    mutationFn: () => courseService.delete(courseId),
    onSuccess: () => {
      router.push('/dashboard/training');
    },
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: (employeeId: string) =>
      enrollmentService.enroll({ courseId, employeeId }),
    onSuccess: () => {
      setShowEnrollModal(false);
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  if (isLoading) return <LoadingState message="Loading course..." />;
  if (error || !course) return <ErrorState message="Failed to load course" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Course Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Thumbnail */}
          <div className="w-full md:w-64 h-40 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={statusColors[course.status]}>{course.status}</Badge>
                  {course.category && <Badge variant="gray">{course.category}</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEnrollModal(true)}>
                  Enroll Users
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/training/courses/${courseId}/edit`)}
                >
                  Edit
                </Button>
              </div>
            </div>

            {course.description && (
              <p className="text-gray-600">{course.description}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Delivery Mode</p>
                <p className="font-medium">{course.deliveryMode}</p>
              </div>
              {course.duration && (
                <div>
                  <p className="text-gray-500">Duration</p>
                  <p className="font-medium">{course.duration} minutes</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Content Items</p>
                <p className="font-medium">{course.contentCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Enrollments</p>
                <p className="font-medium">{course.enrollmentCount}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              {course.status === 'DRAFT' && (
                <Button
                  onClick={() => publishMutation.mutate()}
                  loading={publishMutation.isPending}
                >
                  Publish Course
                </Button>
              )}
              {course.status === 'PUBLISHED' && (
                <Button
                  variant="outline"
                  onClick={() => archiveMutation.mutate()}
                  loading={archiveMutation.isPending}
                >
                  Archive Course
                </Button>
              )}
              <Button
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {course.learningObjectives && course.learningObjectives.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Learning Objectives</h2>
          <ul className="space-y-2">
            {course.learningObjectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Course Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Course Content</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/training/courses/${courseId}/content`)}
          >
            Manage Content
          </Button>
        </div>

        {content && content.length > 0 ? (
          <div className="space-y-2">
            {content.map((item: TrainingContent, index: number) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-gray-400 font-medium w-6">{index + 1}</span>
                <span className="text-xl">{contentTypeIcons[item.contentType] || '📁'}</span>
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-500">
                    {item.contentType}
                    {item.duration && ` • ${item.duration} mins`}
                    {item.isRequired && ' • Required'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No content added yet</p>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Enroll Users"
      >
        <p className="text-gray-600 mb-4">
          Select users to enroll in this course. You can also use bulk enrollment from the course management page.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowEnrollModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => router.push(`/dashboard/training/courses/${courseId}/enrollments`)}>
            Manage Enrollments
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
