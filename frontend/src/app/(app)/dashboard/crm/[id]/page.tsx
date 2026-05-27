'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { crmService } from '@/services/crm';
import {
  DISCUSSION_SUMMARY_LABELS,
  INTEREST_LEVEL_LABELS,
  type CrmLead,
  type InterestLevel,
} from '@/services/crm';

const interestBadge: Record<InterestLevel, 'success' | 'warning' | 'error'> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'error',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

export default function CrmLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    crmService.getById(id).then(setLead).catch(() => setError('Lead not found')).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    try {
      await crmService.delete(id);
      router.push('/dashboard/crm');
    } catch {
      setError('Failed to delete lead');
    }
    setConfirmDelete(false);
  };

  const isOverdue =
    lead?.nextFollowupDate && new Date(lead.nextFollowupDate) <= new Date();

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;
  if (!lead) return <div className="text-red-500 p-8">Lead not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lead.operatingOfficeName}</h1>
          <p className="text-gray-500 text-sm mt-1">{lead.location}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/crm" className="text-sm text-gray-500 hover:text-gray-800 mr-2">
            ← Back
          </Link>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/crm/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Interest badge */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant={interestBadge[lead.interestLevel]}>
          {INTEREST_LEVEL_LABELS[lead.interestLevel]} Interest
        </Badge>
        {lead.demoRequired && <Badge variant="info">Demo Required</Badge>}
        {lead.trainingCompleted && <Badge variant="success">Training Completed</Badge>}
        {isOverdue && <Badge variant="error">Follow-up Overdue</Badge>}
      </div>

      {/* Interaction details */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Interaction Details</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
          <Field
            label="Date Contacted"
            value={new Date(lead.dateContacted).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          />
          <Field
            label="Discussion Summary"
            value={DISCUSSION_SUMMARY_LABELS[lead.discussionSummary]}
          />
          <Field
            label="Next Follow-up"
            value={
              lead.nextFollowupDate ? (
                <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                  {new Date(lead.nextFollowupDate).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
              ) : undefined
            }
          />
          <Field label="Demo Required" value={lead.demoRequired ? 'Yes' : 'No'} />
          <Field label="Training Completed" value={lead.trainingCompleted ? 'Yes' : 'No'} />
        </dl>
        {lead.remarks && (
          <div className="mt-5 pt-5 border-t">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Remarks</dt>
            <dd className="mt-1 text-sm text-gray-700 whitespace-pre-line">{lead.remarks}</dd>
          </div>
        )}
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Contact Persons ({lead.contacts.length})
        </h2>
        {lead.contacts.length === 0 ? (
          <p className="text-gray-400 text-sm">No contacts recorded.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lead.contacts.map((c) => (
              <div key={c.id} className="border rounded-lg p-4 space-y-1">
                <p className="font-semibold text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-500">{c.designation}</p>
                <p className="text-sm text-gray-700">{c.mobile}</p>
                <p className="text-sm text-blue-600">{c.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        description={`Delete lead for "${lead.operatingOfficeName}"? This cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
