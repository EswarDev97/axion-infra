'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseReportService } from '@/services/expense';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function ExpenseReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch summary report
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['expenseSummary', dateRange],
    queryFn: () => expenseReportService.getSummary(dateRange),
  });

  // Fetch by category report
  const { data: byCategory } = useQuery({
    queryKey: ['expenseByCategory', dateRange],
    queryFn: () => expenseReportService.getByCategory(dateRange),
  });

  // Fetch by employee report
  const { data: byEmployee } = useQuery({
    queryKey: ['expenseByEmployee', dateRange],
    queryFn: () => expenseReportService.getByEmployee(dateRange),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (summaryLoading) return <LoadingState message="Loading reports..." />;
  if (summaryError) return <ErrorState message="Failed to load reports" onRetry={refetchSummary} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Expense Reports</h1>
          <p className="text-gray-600">Analytics and insights on expense spending</p>
        </div>
        <Button variant="outline">Export to Excel</Button>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-3xl font-bold">{summary.totalRequests}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-3xl font-bold">{formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.approvedAmount)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.paidAmount)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
          {byCategory?.categories && byCategory.categories.length > 0 ? (
            <div className="space-y-4">
              {byCategory.categories.map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{cat.categoryName}</span>
                      <span className="text-sm text-gray-500">{cat.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>{cat.itemCount} items</span>
                      <span>{formatCurrency(cat.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* By Employee */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Top Spenders</h2>
          {byEmployee?.employees && byEmployee.employees.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2 text-right">Requests</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byEmployee.employees.slice(0, 10).map((emp) => (
                  <tr key={emp.employeeId}>
                    <td className="py-2">
                      <div className="font-medium">{emp.employeeName}</div>
                      {emp.department && (
                        <div className="text-xs text-gray-400">{emp.department}</div>
                      )}
                    </td>
                    <td className="py-2 text-right text-sm">{emp.requestCount}</td>
                    <td className="py-2 text-right text-sm font-medium">
                      {formatCurrency(emp.totalAmount)}
                    </td>
                    <td className="py-2 text-right text-sm text-gray-500">
                      {formatCurrency(emp.requestCount > 0 ? emp.totalAmount / emp.requestCount : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">Pending Amount</p>
            <p className="text-2xl font-bold text-yellow-800">{formatCurrency(summary.pendingAmount)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">Rejected Amount</p>
            <p className="text-2xl font-bold text-red-800">{formatCurrency(summary.rejectedAmount)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Total Requests</p>
            <p className="text-2xl font-bold text-gray-800">{summary.totalRequests}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">Period</p>
            <p className="text-lg font-bold text-blue-800">
              {new Date(summary.startDate).toLocaleDateString()} - {new Date(summary.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
