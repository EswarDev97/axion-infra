'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { expenseRequestService } from '@/services/expense';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/data/Pagination';

type ApprovalType = 'manager' | 'finance';

export default function ExpenseApprovalsPage() {
  const [approvalType, setApprovalType] = useState<ApprovalType>('manager');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch pending approvals
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pendingExpenseApprovals', approvalType, page, pageSize],
    queryFn: () =>
      approvalType === 'manager'
        ? expenseRequestService.getPendingManagerApprovals({ page, pageSize })
        : expenseRequestService.getPendingFinanceApprovals({ page, pageSize }),
  });

  if (isLoading) return <LoadingState message="Loading pending approvals..." />;
  if (error) return <ErrorState message="Failed to load pending approvals" onRetry={refetch} />;

  const requests = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <p className="text-gray-600">Review and approve expense requests</p>
        </div>
      </div>

      {/* Approval Type Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            approvalType === 'manager'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => {
            setApprovalType('manager');
            setPage(1);
          }}
        >
          Manager Approvals
        </button>
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            approvalType === 'finance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => {
            setApprovalType('finance');
            setPage(1);
          }}
        >
          Finance Approvals
        </button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description={`There are no expense requests pending ${approvalType} approval`}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Request #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Items</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Submitted</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">{request.requestNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{request.title}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{request.employee?.fullName || 'N/A'}</div>
                    {request.employee?.department && (
                      <div className="text-gray-400 text-xs">{request.employee.department}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{request.itemCount}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatCurrency(request.totalAmount, request.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {request.submittedAt
                      ? new Date(request.submittedAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/expenses/${request.id}`}>
                      <Button size="sm">Review</Button>
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
