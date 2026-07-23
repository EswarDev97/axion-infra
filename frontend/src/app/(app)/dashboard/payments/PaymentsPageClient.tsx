'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/feedback/Alert';
import { paymentService, type Payment } from '@/services/complaint/paymentService';

const PAGE_SIZE = 20;

export function PaymentsPageClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentService.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
      });
      setPayments(res.items ?? []);
      setTotalPages(res.pages ?? 1);
    } catch (e) {
      setError((e as Error).message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSearch = () => {
    setPage(1);
    fetchPayments();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payment Management</h1>
          <p className="text-gray-600">Track case-level payments, billing and finance references</p>
        </div>
        <Button disabled title="Coming soon">
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Reg. No.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Executive</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{payment.caseReference}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{payment.clientId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{payment.vehicleRegistrationNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{payment.executiveEmployeeId}</td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral">{payment.caseStatus}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral">{payment.billingStatus}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.amount != null ? payment.amount : '-'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {/* Edit/Delete actions added in a later task */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
