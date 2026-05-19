'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseRequestService, expenseCategoryService } from '@/services/expense';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { ExpenseRequestUpdateRequest } from '@/services/expense/types';

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestId = params.id as string;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expenseDate: '',
    dueDate: '',
    categoryId: '',
    collectedBy: '',
    amount: undefined as number | undefined,
    currency: 'INR',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch the expense request
  const { data: request, isLoading, error } = useQuery({
    queryKey: ['expenseRequest', requestId],
    queryFn: () => expenseRequestService.getById(requestId),
  });

  // Fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => expenseCategoryService.list(),
  });

  // Populate form when data loads
  useEffect(() => {
    if (request) {
      setFormData({
        title: request.title || '',
        description: request.description || '',
        expenseDate: request.expenseDate ? request.expenseDate.split('T')[0] : '',
        dueDate: request.dueDate ? request.dueDate.split('T')[0] : '',
        categoryId: request.items?.[0]?.categoryId || '',
        collectedBy: request.collectedBy || '',
        amount: request.totalAmount || undefined,
        currency: request.currency || 'INR',
      });
    }
  }, [request]);

  const updateMutation = useMutation({
    mutationFn: (data: ExpenseRequestUpdateRequest) =>
      expenseRequestService.update(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
      queryClient.invalidateQueries({ queryKey: ['expenseRequests'] });
      router.push(`/dashboard/expenses/${requestId}`);
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to update expense request' });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }

    if (!formData.expenseDate) {
      newErrors.expenseDate = 'Expense date is required';
    }

    // Validate due date >= expense date
    if (formData.dueDate && formData.expenseDate && formData.dueDate < formData.expenseDate) {
      newErrors.dueDate = 'Due Date must be greater than or equal to Expense Date';
    }

    // Expense Type is mandatory
    if (!formData.categoryId) {
      newErrors.categoryId = 'Expense Type is required';
    }

    // Validate collected_by max length
    if (formData.collectedBy && formData.collectedBy.length > 150) {
      newErrors.collectedBy = 'Collected By must be less than 150 characters';
    }

    // Validate amount if provided
    if (formData.amount !== undefined && formData.amount < 0) {
      newErrors.amount = 'Amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData: ExpenseRequestUpdateRequest = {
        title: formData.title,
        description: formData.description || null,
        expenseDate: formData.expenseDate,
        dueDate: formData.dueDate || null,
        collectedBy: formData.collectedBy || null,
        currency: formData.currency,
      };

      if (formData.categoryId) {
        submitData.categoryId = formData.categoryId;
      }
      if (formData.amount !== undefined && formData.amount >= 0) {
        submitData.amount = formData.amount;
      }

      updateMutation.mutate(submitData);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (isLoading) return <LoadingState message="Loading expense request..." />;
  if (error || !request) return <ErrorState message="Failed to load expense request" />;

  if (request.status !== 'DRAFT') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800">Cannot Edit</h2>
          <p className="text-yellow-700 mt-2">
            Only DRAFT expense requests can be edited. This request is currently <strong>{request.status}</strong>.
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
        <h1 className="text-2xl font-bold mb-2">Edit Expense Request</h1>
        <p className="text-gray-500 font-mono text-sm mb-6">{request.requestNumber}</p>

        {errors.submit && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Client Meeting Travel - January"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Provide details about this expense request..."
              rows={4}
            />
          </div>

          {/* Expense Date */}
          <div>
            <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 mb-1">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="expenseDate"
              type="date"
              value={formData.expenseDate}
              onChange={(e) => handleChange('expenseDate', e.target.value)}
              className={errors.expenseDate ? 'border-red-500' : ''}
            />
            {errors.expenseDate && <p className="mt-1 text-sm text-red-500">{errors.expenseDate}</p>}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              className={errors.dueDate ? 'border-red-500' : ''}
            />
            {errors.dueDate && <p className="mt-1 text-sm text-red-500">{errors.dueDate}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Optional: Payment deadline (must be on or after expense date)
            </p>
          </div>

          {/* Expense Type (Category) */}
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
              Expense Type <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.categoryId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select expense type</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>}
          </div>

          {/* Collected By */}
          <div>
            <label htmlFor="collectedBy" className="block text-sm font-medium text-gray-700 mb-1">
              Collected By
            </label>
            <Input
              id="collectedBy"
              type="text"
              value={formData.collectedBy}
              onChange={(e) => handleChange('collectedBy', e.target.value)}
              placeholder="Name of the person who collected the payment"
              className={errors.collectedBy ? 'border-red-500' : ''}
              maxLength={150}
            />
            {errors.collectedBy && <p className="mt-1 text-sm text-red-500">{errors.collectedBy}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Optional: Employee, vendor, or external person
            </p>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                setFormData((prev) => ({ ...prev, amount: val }));
                if (errors.amount) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.amount;
                    return newErrors;
                  });
                }
              }}
              placeholder="0.00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="INR">INR - Indian Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
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
              loading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
