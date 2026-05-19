'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '@/services/billing';
import { formatCurrency, CURRENCIES } from '@/services/billing/types';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';
import type { InvoiceStatus, CurrencyCode } from '@/services/billing/types';

const statusColors: Record<InvoiceStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  DRAFT: 'gray',
  SENT: 'blue',
  PAID: 'green',
  OVERDUE: 'red',
  CANCELLED: 'yellow',
};

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices', { search, status, currency, page, pageSize }],
    queryFn: () =>
      invoiceService.list({
        search: search || undefined,
        status: (status as InvoiceStatus) || undefined,
        currency: (currency as CurrencyCode) || undefined,
        page,
        pageSize,
      }),
    retry: 1,
  });

  if (isLoading) return <LoadingState message="Loading invoices..." />;

  // Service unavailable (502/503) — show page with banner instead of error
  const isServiceDown = error && (error as { status?: number }).status === 502;
  if (error && !isServiceDown) return <ErrorState message="Failed to load invoices" onRetry={refetch} />;

  const invoices = data?.items || [];
  const totalPages = data?.pagination?.totalPages || data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-gray-600">Create and manage invoices</p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button>New Invoice</Button>
        </Link>
      </div>

      {/* Service unavailable banner */}
      {isServiceDown && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Billing service is currently unavailable. Invoices will appear once the service is running.
          <button onClick={() => refetch()} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoices..."
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-40"
        >
          <option value="">All Status</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
        <Select
          value={currency}
          onChange={(e) => { setCurrency(e.target.value); setPage(1); }}
          className="w-40"
        >
          <option value="">All Currencies</option>
          {Object.entries(CURRENCIES).map(([code, info]) => (
            <option key={code} value={code}>{info.symbol} {info.name}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Create your first invoice to get started."
          action={
            <Link href="/dashboard/invoices/new">
              <Button>New Invoice</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/dashboard/invoices/${invoice.id}`} className="text-blue-600 hover:underline font-mono text-sm">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-medium">{invoice.currencySymbol}</span> {invoice.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={statusColors[invoice.status as InvoiceStatus] || 'gray'}>
                      {statusLabels[invoice.status as InvoiceStatus] || invoice.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.dueDate || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.createdAt).toLocaleDateString()}
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
