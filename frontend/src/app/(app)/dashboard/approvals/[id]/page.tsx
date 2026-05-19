'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instanceService } from '@/services/approval';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ApprovalInstanceStatus, DecisionType } from '@/services/approval/types';

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

const decisionColors: Record<DecisionType, 'gray' | 'green' | 'red' | 'blue' | 'yellow'> = {
  APPROVED: 'green',
  REJECTED: 'red',
  DELEGATED: 'blue',
  INFO_REQUESTED: 'yellow',
};

const decisionLabels: Record<DecisionType, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DELEGATED: 'Delegated',
  INFO_REQUESTED: 'Info Requested',
};

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const instanceId = params.id as string;

  // Fetch instance
  const { data: instance, isLoading, error, refetch } = useQuery({
    queryKey: ['approvalInstance', instanceId],
    queryFn: () => instanceService.getById(instanceId),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => instanceService.approve(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalInstance', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (comments: string) => instanceService.reject(instanceId, { decision: 'REJECTED', comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalInstance', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
    },
  });

  // Delegate mutation
  const delegateMutation = useMutation({
    mutationFn: ({ delegateTo, comments }: { delegateTo: string; comments?: string }) =>
      instanceService.delegate(instanceId, { delegateTo, comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalInstance', instanceId] });
    },
  });

  // Request info mutation
  const requestInfoMutation = useMutation({
    mutationFn: (message: string) => instanceService.requestInfo(instanceId, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalInstance', instanceId] });
    },
  });

  if (isLoading) return <LoadingState message="Loading approval details..." />;
  if (error) return <ErrorState message="Failed to load approval" onRetry={refetch} />;
  if (!instance) return <ErrorState message="Approval not found" />;

  const handleReject = () => {
    const comments = prompt('Reason for rejection:');
    if (comments) {
      rejectMutation.mutate(comments);
    }
  };

  const handleDelegate = () => {
    const delegateTo = prompt('Enter User ID to delegate to:');
    if (delegateTo) {
      const comments = prompt('Comments (optional):');
      delegateMutation.mutate({ delegateTo, comments: comments || undefined });
    }
  };

  const handleRequestInfo = () => {
    const message = prompt('What information do you need?');
    if (message) {
      requestInfoMutation.mutate(message);
    }
  };

  const isPending = instance.status === 'PENDING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/approvals"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Approvals
            </Link>
          </div>
          <h1 className="text-2xl font-bold">
            {instance.entityTitle || `Request #${instance.entityId.slice(0, 8)}`}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="blue">{instance.entityType}</Badge>
            <Badge variant={statusColors[instance.status]}>
              {statusLabels[instance.status]}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2">
            <Button
              onClick={() => approveMutation.mutate()}
              isLoading={approveMutation.isPending}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              isLoading={rejectMutation.isPending}
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelegate}
              isLoading={delegateMutation.isPending}
            >
              Delegate
            </Button>
            <Button
              variant="ghost"
              onClick={handleRequestInfo}
              isLoading={requestInfoMutation.isPending}
            >
              Request Info
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Request Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Entity Type</p>
                <p className="font-medium">{instance.entityType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Entity ID</p>
                <p className="font-mono text-sm">{instance.entityId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted At</p>
                <p>{new Date(instance.submittedAt).toLocaleString()}</p>
              </div>
              {instance.completedAt && (
                <div>
                  <p className="text-sm text-gray-500">Completed At</p>
                  <p>{new Date(instance.completedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Decision History */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Decision History</h2>
            {instance.decisions && instance.decisions.length > 0 ? (
              <div className="space-y-4">
                {instance.decisions.map((decision) => (
                  <div key={decision.id} className="border-l-4 border-gray-200 pl-4 py-2">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">{decision.approverName}</span>
                      <Badge variant={decisionColors[decision.decision]} size="sm">
                        {decisionLabels[decision.decision]}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Step {decision.stepOrder}: {decision.stepName}
                      </span>
                    </div>
                    {decision.comments && (
                      <p className="text-gray-600 mt-1">{decision.comments}</p>
                    )}
                    {decision.delegatedToName && (
                      <p className="text-sm text-blue-600 mt-1">
                        Delegated to: {decision.delegatedToName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(decision.decidedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No decisions yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Requester</h3>
            <p className="font-medium">{instance.requesterName}</p>
            <p className="text-sm text-gray-500">{instance.requesterEmail}</p>
          </div>

          {/* Current Step */}
          {instance.status === 'PENDING' && (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
              <h3 className="text-sm font-medium text-yellow-800 mb-3">Current Step</h3>
              <p className="font-medium text-yellow-900">
                Step {instance.currentStepOrder}: {instance.currentStepName}
              </p>
              {instance.currentApproverName && (
                <p className="text-sm text-yellow-700 mt-1">
                  Waiting on: {instance.currentApproverName}
                </p>
              )}
            </div>
          )}

          {/* Workflow Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Workflow</h3>
            <p className="font-medium">{instance.workflowName}</p>
            <p className="text-sm text-gray-500 mt-1">ID: {instance.workflowId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
