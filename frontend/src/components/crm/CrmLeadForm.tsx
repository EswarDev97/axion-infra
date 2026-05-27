'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/form/FormField';
import { Alert } from '@/components/feedback/Alert';
import { Badge } from '@/components/ui/Badge';
import { ContactPersonModal } from './ContactPersonModal';
import { crmService } from '@/services/crm';
import {
  DISCUSSION_SUMMARY_LABELS,
  INTEREST_LEVEL_LABELS,
  type CrmLead,
  type CrmLeadCreateRequest,
  type ContactPersonInput,
  type DiscussionSummary,
  type InterestLevel,
} from '@/services/crm';

interface CrmLeadFormProps {
  lead?: CrmLead | null;
}

const emptyForm = {
  operatingOfficeName: '',
  location: '',
  dateContacted: '',
  discussionSummary: '' as DiscussionSummary | '',
  interestLevel: '' as InterestLevel | '',
  demoRequired: 'false',
  trainingCompleted: 'false',
  nextFollowupDate: '',
  remarks: '',
};

export function CrmLeadForm({ lead }: CrmLeadFormProps) {
  const router = useRouter();
  const isEditing = !!lead;

  const [form, setForm] = useState({
    operatingOfficeName: lead?.operatingOfficeName ?? '',
    location: lead?.location ?? '',
    dateContacted: lead?.dateContacted ?? '',
    discussionSummary: (lead?.discussionSummary ?? '') as DiscussionSummary | '',
    interestLevel: (lead?.interestLevel ?? '') as InterestLevel | '',
    demoRequired: lead ? String(lead.demoRequired) : 'false',
    trainingCompleted: lead ? String(lead.trainingCompleted) : 'false',
    nextFollowupDate: lead?.nextFollowupDate ?? '',
    remarks: lead?.remarks ?? '',
  });

  const [contacts, setContacts] = useState<ContactPersonInput[]>(
    lead?.contacts.map((c) => ({
      name: c.name,
      designation: c.designation,
      mobile: c.mobile,
      email: c.email,
    })) ?? []
  );

  const [showContactModal, setShowContactModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof emptyForm | 'contacts', string>>>({});

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const removeContact = (idx: number) =>
    setContacts((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    const e: typeof formErrors = {};
    if (!form.operatingOfficeName.trim()) e.operatingOfficeName = 'Required';
    if (!form.location.trim()) e.location = 'Required';
    if (!form.dateContacted) e.dateContacted = 'Required';
    if (!form.discussionSummary) e.discussionSummary = 'Required';
    if (!form.interestLevel) e.interestLevel = 'Required';
    if (!form.demoRequired) e.demoRequired = 'Required';
    if (!form.trainingCompleted) e.trainingCompleted = 'Required';
    if (contacts.length === 0) e.contacts = 'At least one contact person is required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: CrmLeadCreateRequest = {
        operatingOfficeName: form.operatingOfficeName,
        location: form.location,
        contacts,
        dateContacted: form.dateContacted,
        discussionSummary: form.discussionSummary as DiscussionSummary,
        interestLevel: form.interestLevel as InterestLevel,
        demoRequired: form.demoRequired === 'true',
        trainingCompleted: form.trainingCompleted === 'true',
        nextFollowupDate: form.nextFollowupDate || null,
        remarks: form.remarks || null,
      };
      if (isEditing) {
        await crmService.update(lead.id, payload);
      } else {
        await crmService.create(payload);
      }
      router.push('/dashboard/crm');
    } catch (err) {
      setError((err as Error).message || 'Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Section A: Office Details */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
          Operating Office Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Operating Office Name" required error={formErrors.operatingOfficeName}>
            <Input
              value={form.operatingOfficeName}
              onChange={(e) => set('operatingOfficeName', e.target.value)}
              placeholder="e.g. Koramangala Branch"
              maxLength={150}
            />
          </FormField>
          <FormField label="Location" required error={formErrors.location}>
            <Input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="City / Area"
              maxLength={200}
            />
          </FormField>
        </div>
      </section>

      {/* Section B: Contact Persons */}
      <section>
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-800">Contact Persons</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowContactModal(true)}
          >
            + Add Contact
          </Button>
        </div>
        {formErrors.contacts && (
          <p className="text-sm text-red-500 mb-2">{formErrors.contacts}</p>
        )}
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No contacts added yet.</p>
        ) : (
          <div className="space-y-2">
            {contacts.map((c, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between bg-gray-50 border rounded-lg px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-sm text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.designation}</p>
                  <p className="text-xs text-gray-500">{c.mobile} · {c.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeContact(idx)}
                  className="text-gray-400 hover:text-red-500 transition text-lg leading-none ml-4"
                  aria-label="Remove contact"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section C: Interaction Details */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
          Interaction Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Date Contacted" required error={formErrors.dateContacted}>
            <Input
              type="date"
              value={form.dateContacted}
              onChange={(e) => set('dateContacted', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </FormField>

          <FormField label="Discussion Summary" required error={formErrors.discussionSummary} className="md:col-span-2">
            <Select
              value={form.discussionSummary}
              onChange={(e) => set('discussionSummary', e.target.value)}
            >
              <option value="">Select topic discussed...</option>
              {(Object.keys(DISCUSSION_SUMMARY_LABELS) as DiscussionSummary[]).map((k) => (
                <option key={k} value={k}>{DISCUSSION_SUMMARY_LABELS[k]}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Interest Level" required error={formErrors.interestLevel}>
            <Select
              value={form.interestLevel}
              onChange={(e) => set('interestLevel', e.target.value)}
            >
              <option value="">Select...</option>
              {(Object.keys(INTEREST_LEVEL_LABELS) as InterestLevel[]).map((k) => (
                <option key={k} value={k}>{INTEREST_LEVEL_LABELS[k]}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Demo Required" required error={formErrors.demoRequired}>
            <Select value={form.demoRequired} onChange={(e) => set('demoRequired', e.target.value)}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
          </FormField>

          <FormField label="Training Completed" required error={formErrors.trainingCompleted}>
            <Select value={form.trainingCompleted} onChange={(e) => set('trainingCompleted', e.target.value)}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
          </FormField>

          <FormField label="Next Follow-up Date" error={undefined}>
            <Input
              type="date"
              value={form.nextFollowupDate}
              onChange={(e) => set('nextFollowupDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </FormField>

          <FormField label="Remarks" className="md:col-span-2 lg:col-span-3">
            <Textarea
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              maxLength={1000}
            />
          </FormField>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEditing ? 'Update Lead' : 'Save Lead'}
        </Button>
      </div>

      <ContactPersonModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSave={(c) => {
          setContacts((prev) => [...prev, c]);
          setShowContactModal(false);
        }}
      />
    </form>
  );
}
