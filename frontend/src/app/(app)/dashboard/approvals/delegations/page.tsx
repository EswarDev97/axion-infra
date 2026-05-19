'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { delegationService } from '@/services/approval';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/form/Input';
import { Textarea } from '@/components/form/Textarea';

export default function DelegationsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDelegation, setNewDelegation] = useState({
    delegateeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    entityType: '',
  });

  // Fetch my delegations
  const { data: myDelegations, isLoading: loadingMine, error: errorMine, refetch: refetchMine } = useQuery({
    queryKey: ['myDelegations'],
    queryFn: () => delegationService.getMyDelegations(),
  });

  // Fetch delegated to me
  const { data: delegatedToMe, isLoading: loadingToMe, error: errorToMe, refetch: refetchToMe } = useQuery({
    queryKey: ['delegatedToMe'],
    queryFn: () => delegationService.getDelegatedToMe(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () => delegationService.create({
      delegateeId: newDelegation.delegateeId,
      startDate: newDelegation.startDate,
      endDate: newDelegation.endDate,
      reason: newDelegation.reason || undefined,
      entityType: newDelegation.entityType || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDelegations'] });
      setShowCreateModal(false);
      setNewDelegation({ delegateeId: '', startDate: '', endDate: '', reason: '', entityType: '' });
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => delegationService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDelegations'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => delegationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDelegations'] });
    },
  });

  const isLoading = loadingMine || loadingToMe;
  const error = errorMine || errorToMe;

  if (isLoading) return <LoadingState message="Loading delegations..." />;
  if (error) return <ErrorState message="Failed to load delegations" onRetry={() => { refetchMine(); refetchToMe(); }} />;

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

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
          <h1 className="text-2xl font-bold">Approval Delegations</h1>
          <p className="text-gray-600">Manage approval authority delegations</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          New Delegation
        </Button>
      </div>

      {/* Delegated to Me */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b bg-blue-50">
          <h2 className="text-lg font-semibold text-blue-800">Delegated to Me</h2>
          <p className="text-sm text-blue-600">Approvals delegated to you by others</p>
        </div>
        {delegatedToMe && delegatedToMe.length > 0 ? (
          <div className="divide-y">
            {delegatedToMe.map((delegation) => (
              <div key={delegation.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{delegation.delegatorName}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                  </p>
                  {delegation.entityType && (
                    <Badge variant="blue" size="sm" className="mt-1">
                      {delegation.entityType}
                    </Badge>
                  )}
                  {delegation.reason && (
                    <p className="text-sm text-gray-500 mt-1">{delegation.reason}</p>
                  )}
                </div>
                <Badge variant={delegation.isActive ? 'green' : 'gray'}>
                  {delegation.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No delegations to you
          </div>
        )}
      </div>

      {/* My Delegations */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">My Delegations</h2>
          <p className="text-sm text-gray-600">Approvals you have delegated to others</p>
        </div>
        {myDelegations && myDelegations.length > 0 ? (
          <div className="divide-y">
            {myDelegations.map((delegation) => (
              <div key={delegation.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">To: {delegation.delegateeName}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                  </p>
                  {delegation.entityType && (
                    <Badge variant="blue" size="sm" className="mt-1">
                      {delegation.entityType}
                    </Badge>
                  )}
                  {delegation.reason && (
                    <p className="text-sm text-gray-500 mt-1">{delegation.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={delegation.isActive ? 'green' : 'gray'}>
                    {delegation.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {delegation.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deactivateMutation.mutate(delegation.id)}
                      isLoading={deactivateMutation.isPending}
                    >
                      Deactivate
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this delegation?')) {
                        deleteMutation.mutate(delegation.id);
                      }
                    }}
                    isLoading={deleteMutation.isPending}
                    className="text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No delegations"
              description="You have not delegated any approvals"
              action={
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Delegation
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Delegation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delegate To (User ID) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={newDelegation.delegateeId}
                  onChange={(e) => setNewDelegation({ ...newDelegation, delegateeId: e.target.value })}
                  placeholder="Enter user ID"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={newDelegation.startDate}
                    onChange={(e) => setNewDelegation({ ...newDelegation, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={newDelegation.endDate}
                    onChange={(e) => setNewDelegation({ ...newDelegation, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type (optional)
                </label>
                <Input
                  type="text"
                  value={newDelegation.entityType}
                  onChange={(e) => setNewDelegation({ ...newDelegation, entityType: e.target.value })}
                  placeholder="e.g., leave_request, expense_report"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to delegate all approval types
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <Textarea
                  value={newDelegation.reason}
                  onChange={(e) => setNewDelegation({ ...newDelegation, reason: e.target.value })}
                  placeholder="e.g., On vacation"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                isLoading={createMutation.isPending}
                disabled={!newDelegation.delegateeId || !newDelegation.startDate || !newDelegation.endDate}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
