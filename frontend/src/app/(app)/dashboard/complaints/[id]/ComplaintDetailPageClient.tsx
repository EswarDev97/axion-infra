/**
 * MindFlow - Complaint Detail Page Client Component
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ComplaintDetail } from '@/components/complaints/ComplaintDetail';
import { ComplaintForm } from '@/components/complaints/ComplaintForm';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useComplaintStore } from '@/stores/complaintStore';

interface ComplaintDetailPageClientProps {
  complaintId: string;
}

export function ComplaintDetailPageClient({ complaintId }: ComplaintDetailPageClientProps) {
  const router = useRouter();
  const { currentComplaint, isLoadingComplaint, error, fetchComplaint, clearError } = useComplaintStore();
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchComplaint(complaintId);
    return () => clearError();
  }, [complaintId, fetchComplaint, clearError]);

  if (isLoadingComplaint) {
    return <LoadingState message="Loading complaint..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load complaint"
        message={error}
        onRetry={() => fetchComplaint(complaintId)}
      />
    );
  }

  if (!currentComplaint) {
    return (
      <ErrorState
        title="Complaint not found"
        message="The complaint you're looking for doesn't exist or has been deleted."
        onRetry={() => router.push('/dashboard/complaints')}
        retryLabel="Back to Complaints"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/complaints')}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Complaints
      </Button>

      {/* Complaint Detail */}
      <ComplaintDetail complaint={currentComplaint} onEdit={() => setShowEditForm(true)} />

      {/* Edit Form Modal */}
      <ComplaintForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        complaint={currentComplaint}
        onSuccess={() => {
          setShowEditForm(false);
          fetchComplaint(complaintId);
        }}
      />
    </div>
  );
}
