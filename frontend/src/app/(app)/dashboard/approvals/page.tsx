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

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['myApprovalsSummary'],
    queryFn: () => instanceService.getMySummary(),
  });

  // Fetch pending approvals for me
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pendingApprovals', { page, pageSize }],
    queryFn: () =>
      instanceService.getPendingForMe({
        page,
        pageSize,
      }),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => instanceService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['myApprovalsSummary'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      instanceService.reject(id, { decision: 'REJECTED', comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['myApprovalsSummary'] });
    },
  });

  if (isLoading) return <LoadingState message="Loading approvals..." />;
  if (error) return <ErrorState message="Failed to load approvals" onRetry={refetch} />;

  const pendingItems = data?.items || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const handleReject = (id: string) => {
    const comments = prompt('Reason for rejection:');
    if (comments) {
      rejectMutation.mutate({ id, comments });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-gray-600">Review and approve pending requests</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/approvals/my-requests">
            <Button variant="outline">My Requests</Button>
          </Link>
          <Link href="/dashboard/approvals/delegations">
            <Button variant="outline">Delegations</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Pending My Action" value={summary.pendingMyAction} color="yellow" />
          <SummaryCard label="Pending from Others" value={summary.pendingFromOthers} color="blue" />
          <SummaryCard label="Approved This Month" value={summary.approvedThisMonth} color="green" />
          <SummaryCard label="Rejected This Month" value={summary.rejectedThisMonth} color="red" />
        </div>
      )}

      {/* Pending Approvals List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Pending Your Approval</h2>
        </div>

        {pendingItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No pending approvals"
              description="You have no requests waiting for your approval"
            />
          </div>
        ) : (
          <div className="divide-y">
            {pendingItems.map((item) => (
              <div key={item.instance.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="blue">{item.instance.entityType}</Badge>
                      <span className="text-sm text-gray-500">
                        Step {item.step.stepOrder}: {item.step.name}
                      </span>
                    </div>
                    <h3 className="font-medium">
                      {item.instance.entityTitle || `Request #${item.instance.entityId.slice(0, 8)}`}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Requested by: {item.instance.requesterName} ({item.instance.requesterEmail})
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted: {new Date(item.instance.submittedAt).toLocaleString()}
                      {item.waitingDays > 0 && (
                        <span className={item.waitingDays > 3 ? 'text-red-600 ml-2' : 'ml-2'}>
                          (waiting {item.waitingDays} days)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(item.instance.id)}
                      isLoading={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(item.instance.id)}
                      isLoading={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Link href={`/dashboard/approvals/${item.instance.id}`}>
                      <Button variant="ghost" size="sm">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

function SummaryCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: number;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
