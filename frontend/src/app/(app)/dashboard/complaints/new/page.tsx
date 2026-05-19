/**
 * MindFlow - New Complaint Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/form/FormField';
import { Alert } from '@/components/feedback/Alert';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useComplaintStore } from '@/stores/complaintStore';
import type {
  ComplaintSeverity,
  ComplaintSourceChannel,
  ComplaintCreateRequest,
} from '@/services/complaint/types';

const severityOptions: { value: ComplaintSeverity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const sourceChannelOptions: { value: ComplaintSourceChannel; label: string }[] = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewComplaintPage() {
  const router = useRouter();
  const { categories, isLoading, error, fetchCategories, createComplaint, clearError } = useComplaintStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    severity: 'MEDIUM' as ComplaintSeverity,
    sourceChannel: 'INTERNAL' as ComplaintSourceChannel,
    complainantName: '',
    complainantContact: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.title.trim()) {
      setFormError('Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Please enter a description');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Please select a category');
      return;
    }

    setSubmitting(true);

    try {
      const createData: ComplaintCreateRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        severity: formData.severity,
        sourceChannel: formData.sourceChannel,
        complainantName: formData.complainantName.trim() || undefined,
        complainantContact: formData.complainantContact.trim() || undefined,
      };

      const complaint = await createComplaint(createData);
      if (complaint) {
        router.push(`/dashboard/complaints/${complaint.id}`);
      } else {
        setFormError('Failed to create complaint');
      }
    } catch (err) {
      setFormError((err as Error).message || 'Failed to create complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading form..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load form"
        message={error}
        onRetry={() => {
          clearError();
          fetchCategories();
        }}
      />
    );
  }

  // Filter to only show active categories
  const activeCategories = categories.filter(c => c.isActive);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/complaints')}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Complaints
      </Button>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">New Complaint</h1>
        <p className="text-gray-600">Submit a new complaint or issue</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        {formError && (
          <Alert variant="error" onClose={() => setFormError(null)}>
            {formError}
          </Alert>
        )}

        <FormField label="Title" required>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Brief summary of the complaint"
          />
        </FormField>

        <FormField label="Description" required>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Provide detailed information about the issue..."
            rows={5}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category" required>
            <Select
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
            >
              <option value="">Select a category</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Severity">
            <Select
              value={formData.severity}
              onChange={(e) => handleChange('severity', e.target.value)}
            >
              {severityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Source Channel">
          <Select
            value={formData.sourceChannel}
            onChange={(e) => handleChange('sourceChannel', e.target.value)}
          >
            {sourceChannelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-sm text-gray-500">
            How was this complaint received?
          </p>
        </FormField>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Complainant Information (Optional)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Complainant Name">
              <Input
                value={formData.complainantName}
                onChange={(e) => handleChange('complainantName', e.target.value)}
                placeholder="Name of the complainant"
              />
            </FormField>

            <FormField label="Contact">
              <Input
                value={formData.complainantContact}
                onChange={(e) => handleChange('complainantContact', e.target.value)}
                placeholder="Phone or email"
              />
            </FormField>
          </div>
        </div>

        <div className="flex gap-4 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Submit Complaint
          </Button>
        </div>
      </form>
    </div>
  );
}
