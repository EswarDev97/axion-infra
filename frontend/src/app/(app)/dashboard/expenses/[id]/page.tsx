'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseRequestService, expenseItemService, paymentService } from '@/services/expense';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/feedback/Modal';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useAuthStore } from '@/stores/authStore';
import type { ExpenseRequestStatus, ExpenseItem } from '@/services/expense/types';

const statusColors: Record<ExpenseRequestStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  MANAGER_APPROVED: 'purple',
  MANAGER_REJECTED: 'red',
  FINANCE_APPROVED: 'green',
  FINANCE_REJECTED: 'red',
  PAID: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

const statusLabels: Record<ExpenseRequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  MANAGER_APPROVED: 'Manager Approved',
  MANAGER_REJECTED: 'Manager Rejected',
  FINANCE_APPROVED: 'Finance Approved',
  FINANCE_REJECTED: 'Finance Rejected',
  PAID: 'Paid',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestId = params.id as string;

  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);
  const canRecordPayment = hasAnyRole(['SUPER_ADMIN', 'FINANCE']);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [rejectType, setRejectType] = useState<'manager' | 'finance'>('manager');

  // Fetch expense request
  const { data: request, isLoading, error, refetch } = useQuery({
    queryKey: ['expenseRequest', requestId],
    queryFn: () => expenseRequestService.getById(requestId),
  });

  // Fetch expense items
  const { data: items } = useQuery({
    queryKey: ['expenseItems', requestId],
    queryFn: () => expenseItemService.getByRequest(requestId),
  });

  // Fetch payments for this expense request
  const { data: paymentsData } = useQuery({
    queryKey: ['expensePayments', requestId],
    queryFn: () => paymentService.list({ expenseRequestId: requestId }),
  });
  const payments = paymentsData?.items || [];

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: () => expenseRequestService.submit(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
    },
  });

  // Manager approve mutation
  const managerApproveMutation = useMutation({
    mutationFn: () => expenseRequestService.managerApprove(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
    },
  });

  // Manager reject mutation
  const managerRejectMutation = useMutation({
    mutationFn: (reason: string) => expenseRequestService.managerReject(requestId, { reason }),
    onSuccess: () => {
      setShowRejectModal(false);
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
    },
  });

  // Finance approve mutation
  const financeApproveMutation = useMutation({
    mutationFn: () => expenseRequestService.financeApprove(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
    },
  });

  // Finance reject mutation
  const financeRejectMutation = useMutation({
    mutationFn: (reason: string) => expenseRequestService.financeReject(requestId, { reason }),
    onSuccess: () => {
      setShowRejectModal(false);
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => expenseRequestService.cancel(requestId),
    onSuccess: () => {
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
    },
  });

  const handleReject = () => {
    if (rejectType === 'manager') {
      managerRejectMutation.mutate(rejectReason);
    } else {
      financeRejectMutation.mutate(rejectReason);
    }
  };

  if (isLoading) return <LoadingState message="Loading expense request..." />;
  if (error || !request) return <ErrorState message="Failed to load expense request" onRetry={refetch} />;

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

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

      {/* Request Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{request.title}</h1>
              <Badge variant={statusColors[request.status]}>
                {statusLabels[request.status]}
              </Badge>
            </div>
            <p className="text-gray-500 font-mono mt-1">{request.requestNumber}</p>
            {request.description && (
              <p className="text-gray-600 mt-2">{request.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-3xl font-bold">{formatCurrency(request.totalAmount, request.currency)}</p>
          </div>
        </div>

        {/* Request Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-500">Employee</p>
            <p className="font-medium">{request.employee?.fullName || 'N/A'}</p>
            {request.employee?.department && (
              <p className="text-sm text-gray-400">{request.employee.department}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Expense Date</p>
            <p className="font-medium">
              {new Date(request.expenseDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Due Date</p>
            <p className="font-medium">
              {request.dueDate
                ? new Date(request.dueDate).toLocaleDateString()
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Collected By</p>
            <p className="font-medium">{request.collectedBy || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Submitted</p>
            <p className="font-medium">
              {request.submittedAt
                ? new Date(request.submittedAt).toLocaleDateString()
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Items</p>
            <p className="font-medium">{request.itemCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Currency</p>
            <p className="font-medium">{request.currency}</p>
          </div>
        </div>

        {/* Rejection Reason */}
        {request.rejectionReason && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-800">Rejection Reason</p>
            <p className="text-red-700">{request.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
          {request.status === 'DRAFT' && (
            <>
              <Button
                onClick={() => submitMutation.mutate()}
                loading={submitMutation.isPending}
              >
                Submit for Approval
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/expenses/${requestId}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel
              </Button>
            </>
          )}
          {request.status === 'SUBMITTED' && (
            <>
              <Button
                onClick={() => managerApproveMutation.mutate()}
                loading={managerApproveMutation.isPending}
              >
                Approve (Manager)
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => {
                  setRejectType('manager');
                  setShowRejectModal(true);
                }}
              >
                Reject (Manager)
              </Button>
            </>
          )}
          {request.status === 'MANAGER_APPROVED' && (
            <>
              <Button
                onClick={() => financeApproveMutation.mutate()}
                loading={financeApproveMutation.isPending}
              >
                Approve (Finance)
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => {
                  setRejectType('finance');
                  setShowRejectModal(true);
                }}
              >
                Reject (Finance)
              </Button>
            </>
          )}
          {request.status === 'FINANCE_APPROVED' && canRecordPayment && (
            <Button
              onClick={() => router.push(`/dashboard/expenses/${requestId}/payment`)}
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Expense Items */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Expense Items</h2>
          {request.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/expenses/${requestId}/items/new`)}
            >
              Add Item
            </Button>
          )}
        </div>

        {items && items.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Category</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Description</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Merchant</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Receipts</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item: ExpenseItem) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium">{item.category?.name || 'N/A'}</span>
                    {item.category?.code && (
                      <span className="text-gray-400 ml-2">({item.category.code})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">-</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(item.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">-</td>
                  <td className="px-4 py-3 text-sm font-medium text-right">
                    {formatCurrency(item.amount, request.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-4 py-3 text-sm font-medium text-right">Total</td>
                <td className="px-4 py-3 text-sm font-bold text-right">
                  {formatCurrency(request.totalAmount, request.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-gray-500 text-center py-8">No items added yet</p>
        )}
      </div>

      {/* Approval History */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Approval History</h2>
        <div className="space-y-4">
          {request.submittedAt && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Submitted</p>
                <p className="text-sm text-gray-500">{new Date(request.submittedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          {request.approvedAt && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Approved</p>
                <p className="text-sm text-gray-500">{new Date(request.approvedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          {request.rejectedAt && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Rejected</p>
                <p className="text-sm text-gray-500">
                  {new Date(request.rejectedAt).toLocaleString()}
                  {request.rejectionReason && ` - ${request.rejectionReason}`}
                </p>
              </div>
            </div>
          )}
          {request.paidAt && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Payment Processed</p>
                <p className="text-sm text-gray-500">{new Date(request.paidAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={`Reject Request (${rejectType === 'manager' ? 'Manager' : 'Finance'})`}
      >
        <div className="space-y-4">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleReject}
              loading={managerRejectMutation.isPending || financeRejectMutation.isPending}
              disabled={!rejectReason.trim()}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Request"
        message="Are you sure you want to cancel this expense request?"
        confirmText="Cancel Request"
        variant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
