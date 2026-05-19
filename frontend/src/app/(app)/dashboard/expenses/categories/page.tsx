'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseCategoryService } from '@/services/expense';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/feedback/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import type { ExpenseCategory, ExpenseCategoryCreateRequest } from '@/services/expense/types';

export default function ExpenseCategoriesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState<ExpenseCategoryCreateRequest>({
    name: '',
    code: '',
    description: '',
    maxAmount: undefined,
    requiresReceipt: true,
  });

  // Fetch categories
  const { data: categories, isLoading, error, refetch } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => expenseCategoryService.list(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ExpenseCategoryCreateRequest) => expenseCategoryService.create(data),
    onSuccess: () => {
      setShowCreateModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseCategoryCreateRequest> }) =>
      expenseCategoryService.update(id, data),
    onSuccess: () => {
      setShowCreateModal(false);
      setSelectedCategory(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseCategoryService.delete(id),
    onSuccess: () => {
      setShowDeleteConfirm(false);
      setSelectedCategory(null);
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      maxAmount: undefined,
      requiresReceipt: true,
    });
  };

  const handleEdit = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || '',
      maxAmount: category.maxAmount || undefined,
      requiresReceipt: category.requiresReceipt,
    });
    setShowCreateModal(true);
  };

  const handleSubmit = () => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'No limit';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (isLoading) return <LoadingState message="Loading categories..." />;
  if (error) return <ErrorState message="Failed to load categories" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Expense Categories</h1>
          <p className="text-gray-600">Manage expense categories and limits</p>
        </div>
        <Button
          onClick={() => {
            setSelectedCategory(null);
            resetForm();
            setShowCreateModal(true);
          }}
        >
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      {categories && categories.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Create expense categories to classify expenses"
          action={
            <Button onClick={() => setShowCreateModal(true)}>Add Category</Button>
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Max Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Receipt Required</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories?.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium">{category.code}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{category.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {category.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(category.maxAmount)}
                  </td>
                  <td className="px-4 py-3">
                    {category.requiresReceipt ? (
                      <Badge variant="blue">Yes</Badge>
                    ) : (
                      <Badge variant="gray">No</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={category.isActive ? 'green' : 'gray'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedCategory(null);
          resetForm();
        }}
        title={selectedCategory ? 'Edit Category' : 'Add Category'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., TRAVEL"
              disabled={!!selectedCategory}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Category name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Category description"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Amount (optional)
            </label>
            <Input
              type="number"
              value={formData.maxAmount || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty for no limit"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.requiresReceipt}
              onChange={(e) => setFormData({ ...formData, requiresReceipt: e.target.checked })}
            />
            <label className="text-sm text-gray-700">Requires receipt</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setSelectedCategory(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!formData.name || !formData.code}
            >
              {selectedCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedCategory(null);
        }}
        onConfirm={() => selectedCategory && deleteMutation.mutate(selectedCategory.id)}
        title="Delete Category"
        message={`Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
