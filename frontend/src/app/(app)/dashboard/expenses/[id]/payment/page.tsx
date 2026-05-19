'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseRequestService, paymentService } from '@/services/expense';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useAuthStore } from '@/stores/authStore';
import type { PaymentRecordCreateRequest, PaymentMode } from '@/services/expense/types';

const paymentModes: { value: PaymentMode; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet' },
];

export default function RecordPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestId = params.id as string;
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);
  const canRecordPayment = hasAnyRole(['SUPER_ADMIN', 'FINANCE']);

  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'BANK_TRANSFER' as PaymentMode,
    amountPaid: '',
    referenceNumber: '',
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch the expense request
  const { data: request, isLoading, error } = useQuery({
    queryKey: ['expenseRequest', requestId],
    queryFn: () => expenseRequestService.getById(requestId),
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentRecordCreateRequest) => paymentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
      queryClient.invalidateQueries({ queryKey: ['expenseRequests'] });
      queryClient.invalidateQueries({ queryKey: ['expensePayments', requestId] });
      router.push(`/dashboard/expenses/${requestId}`);
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to record payment' });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required';
    }

    const amount = parseFloat(formData.amountPaid);
    if (!formData.amountPaid || isNaN(amount) || amount <= 0) {
      newErrors.amountPaid = 'Amount must be greater than 0';
    } else if (request && amount > Number(request.totalAmount)) {
      newErrors.amountPaid = `Amount cannot exceed total of ${formatCurrency(request.totalAmount, request.currency)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData: PaymentRecordCreateRequest = {
        expenseRequestId: requestId,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        amountPaid: parseFloat(formData.amountPaid),
      };

      if (formData.referenceNumber.trim()) {
        submitData.referenceNumber = formData.referenceNumber.trim();
      }
      if (formData.remarks.trim()) {
        submitData.remarks = formData.remarks.trim();
      }

      createPaymentMutation.mutate(submitData);
    }
  };

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  if (isLoading) return <LoadingState message="Loading expense request..." />;
  if (error || !request) return <ErrorState message="Failed to load expense request" />;

  if (!canRecordPayment) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
          <p className="text-red-700 mt-2">
            Only Super Admin and Finance roles can record payments.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/dashboard/expenses/${requestId}`)}
          >
            Back to Details
          </Button>
        </div>
      </div>
    );
  }

  if (request.status !== 'FINANCE_APPROVED') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800">Cannot Record Payment</h2>
          <p className="text-yellow-700 mt-2">
            Only FINANCE_APPROVED expenses can have payments recorded. This request is currently <strong>{request.status}</strong>.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/dashboard/expenses/${requestId}`)}
          >
            Back to Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold mb-2">Record Payment</h1>
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <p className="text-gray-500 font-mono text-sm">{request.requestNumber}</p>
            <p className="font-medium">{request.title}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(request.totalAmount, request.currency)}</p>
          </div>
        </div>

        {errors.submit && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Date */}
          <div>
            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
              className={errors.paymentDate ? 'border-red-500' : ''}
            />
            {errors.paymentDate && <p className="mt-1 text-sm text-red-500">{errors.paymentDate}</p>}
          </div>

          {/* Payment Mode */}
          <div>
            <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              id="paymentMode"
              value={formData.paymentMode}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentMode: e.target.value as PaymentMode }))}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.paymentMode ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {paymentModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            {errors.paymentMode && <p className="mt-1 text-sm text-red-500">{errors.paymentMode}</p>}
          </div>

          {/* Amount Paid */}
          <div>
            <label htmlFor="amountPaid" className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid ({request.currency}) <span className="text-red-500">*</span>
            </label>
            <Input
              id="amountPaid"
              type="number"
              min="0.01"
              step="0.01"
              max={Number(request.totalAmount)}
              value={formData.amountPaid}
              onChange={(e) => setFormData((prev) => ({ ...prev, amountPaid: e.target.value }))}
              placeholder={Number(request.totalAmount).toFixed(2)}
              className={errors.amountPaid ? 'border-red-500' : ''}
            />
            {errors.amountPaid && <p className="mt-1 text-sm text-red-500">{errors.amountPaid}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Maximum: {formatCurrency(request.totalAmount, request.currency)}
            </p>
          </div>

          {/* Reference Number */}
          <div>
            <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <Input
              id="referenceNumber"
              type="text"
              value={formData.referenceNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))}
              placeholder="e.g., Transaction ID, Cheque No."
            />
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="Optional notes about this payment..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/expenses/${requestId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createPaymentMutation.isPending}
            >
              Confirm Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
