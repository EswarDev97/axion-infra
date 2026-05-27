'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ContactPersonInput } from '@/services/crm';

interface ContactPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: ContactPersonInput) => void;
}

const empty: ContactPersonInput = { name: '', designation: '', mobile: '', email: '' };

export function ContactPersonModal({ isOpen, onClose, onSave }: ContactPersonModalProps) {
  const [form, setForm] = useState<ContactPersonInput>({ ...empty });
  const [errors, setErrors] = useState<Partial<ContactPersonInput>>({});

  const set = (field: keyof ContactPersonInput, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const e: Partial<ContactPersonInput> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.designation.trim()) e.designation = 'Designation is required';
    if (!form.mobile.trim()) e.mobile = 'Mobile is required';
    else if (!/^\d{10,15}$/.test(form.mobile.replace(/[\s\-+]/g, '')))
      e.mobile = 'Enter a valid mobile number';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form });
    setForm({ ...empty });
    setErrors({});
  };

  const handleClose = () => {
    setForm({ ...empty });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Contact Person" size="md">
      <div className="space-y-4 py-2">
        <FormField label="Name" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Full name"
          />
        </FormField>
        <FormField label="Designation" required error={errors.designation}>
          <Input
            value={form.designation}
            onChange={(e) => set('designation', e.target.value)}
            placeholder="e.g. Branch Manager"
          />
        </FormField>
        <FormField label="Mobile Number" required error={errors.mobile}>
          <Input
            value={form.mobile}
            onChange={(e) => set('mobile', e.target.value)}
            placeholder="10-digit mobile number"
            maxLength={15}
          />
        </FormField>
        <FormField label="Email ID" required error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="email@example.com"
          />
        </FormField>
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Contact</Button>
      </ModalFooter>
    </Modal>
  );
}
