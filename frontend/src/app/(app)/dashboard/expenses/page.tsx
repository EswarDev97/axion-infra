'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { expenseRequestService, expenseCategoryService, myExpensesService } from '@/services/expense';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';
import type { ExpenseRequestStatus } from '@/services/expense/types';

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

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [collectedBy, setCollectedBy] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dueStartDate, setDueStartDate] = useState<string>('');
  const [dueEndDate, setDueEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch expense categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => expenseCategoryService.list(),
  });

  // Fetch my expense summary
  const { data: summary } = useQuery({
    queryKey: ['myExpensesSummary'],
    queryFn: () => myExpensesService.getSummary(),
  });

  // Fetch expense requests
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['expenseRequests', { search, status, categoryId, collectedBy, startDate, endDate, dueStartDate, dueEndDate, page, pageSize }],
    queryFn: () =>
      expenseRequestService.list({
        search: search || undefined,
        status: status as ExpenseRequestStatus || undefined,
        categoryId: categoryId || undefined,
        collectedBy: collectedBy || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        dueStartDate: dueStartDate || undefined,
        dueEndDate: dueEndDate || undefined,
        page,
        pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading expense requests..." />;
  if (error) return <ErrorState message="Failed to load expense requests" onRetry={refetch} />;

  const requests = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-600">Submit and track expense reimbursements</p>
        </div>
        <Link href="/dashboard/expenses/new">
          <Button>New Expense Request</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SummaryCard label="Total Requests" value={summary.totalRequests} />
          <SummaryCard label="Drafts" value={summary.draftRequests} color="gray" />
          <SummaryCard label="Pending" value={summary.pendingApproval} color="yellow" />
          <SummaryCard label="Approved" value={summary.approved} color="green" />
          <SummaryCard
            label="Total Amount"
            value={formatCurrency(summary.totalSubmittedAmount)}
            color="blue"
            isAmount
          />
          <SummaryCard
            label="Pending Reimbursement"
            value={formatCurrency(summary.pendingReimbursement)}
            color="purple"
            isAmount
          />
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search expenses..."
            className="w-64"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-48"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="MANAGER_APPROVED">Manager Approved</option>
            <option value="FINANCE_APPROVED">Finance Approved</option>
            <option value="PAID">Paid</option>
            <option value="MANAGER_REJECTED">Manager Rejected</option>
            <option value="FINANCE_REJECTED">Finance Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-48"
          >
            <option value="">All Expense Types</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'More Filters'}
          </Button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expense Date From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expense Date To</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date From</label>
              <Input
                type="date"
                value={dueStartDate}
                onChange={(e) => setDueStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date To</label>
              <Input
                type="date"
                value={dueEndDate}
                onChange={(e) => setDueEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Collected By</label>
              <Input
                type="text"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
                placeholder="Filter by collector..."
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setDueStartDate('');
                  setDueEndDate('');
                  setCollectedBy('');
                  setCategoryId('');
                  setStatus('');
                  setSearch('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Expense Requests List */}
      {requests.length === 0 ? (
        <EmptyState
          title="No expense requests found"
          description="Create your first expense request"
          action={
            <Link href="/dashboard/expenses/new">
              <Button>New Expense Request</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Expense Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Expense Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Collected By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/expenses/${request.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {request.title}
                    </Link>
                    <div className="text-xs text-gray-400 font-mono">{request.requestNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {request.items && request.items.length > 0
                      ? request.items[0].categoryName
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatCurrency(request.totalAmount, request.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(request.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {request.dueDate
                      ? new Date(request.dueDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {request.collectedBy || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/expenses/${request.id}`}>
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

function SummaryCard({
  label,
  value,
  color = 'gray',
  isAmount = false,
}: {
  label: string;
  value: number | string;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  isAmount?: boolean;
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
      <p className={isAmount ? 'text-lg font-bold' : 'text-2xl font-bold'}>{value}</p>
    </div>
  );
}
