'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instanceService } from '@/services/approval';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';
import type { ApprovalInstanceStatus } from '@/services/approval/types';

const statusColors: Record<ApprovalInstanceStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

const statusLabels: Record<ApprovalInstanceStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export default function MyRequestsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch my requests
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['myApprovalRequests', { status, page, pageSize }],
    queryFn: () =>
      instanceService.getMyRequests({
        status: status || undefined,
        page,
        pageSize,
      }),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      instanceService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myApprovalRequests'] });
    },
  });

  if (isLoading) return <LoadingState message="Loading requests..." />;
  if (error) return <ErrorState message="Failed to load requests" onRetry={refetch} />;

  const requests = data?.items || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const handleCancel = (id: string) => {
    const reason = prompt('Reason for cancellation (optional):');
    cancelMutation.mutate({ id, reason: reason || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/approvals"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Approvals
            </Link>
          </div>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-gray-600">Track your submitted approval requests</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-48"
          options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <EmptyState
          title="No requests found"
          description={status ? `No ${statusLabels[status as ApprovalInstanceStatus]} requests` : 'You have not submitted any requests'}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Current Step</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Submitted</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Badge variant="blue">{request.entityType}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {request.entityTitle || `Request #${request.entityId.slice(0, 8)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {request.status === 'PENDING' ? (
                      <>
                        Step {request.currentStepOrder}: {request.currentStepName}
                        {request.currentApproverName && (
                          <div className="text-gray-400">
                            Waiting on: {request.currentApproverName}
                          </div>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(request.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/approvals/${request.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      {request.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(request.id)}
                          isLoading={cancelMutation.isPending}
                          className="text-red-600"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && totalPages > 1 && (
        <Pagination
          meta={data.pagination}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
