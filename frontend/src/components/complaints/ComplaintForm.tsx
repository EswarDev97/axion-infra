/**
 * MindFlow - Complaint Form Component
 * Updated per PART 2 — Exact field order for creation screen:
 * Channel, Category, Complaint Type, Complainant Name, Contact Number,
 * Insurer/Client, Claim No, Vehicle Number, Workshop Name,
 * Complaint Description, Severity, Assign To
 */

'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { FormField } from '@/components/form/FormField';
import { useComplaintStore } from '@/stores/complaintStore';
import type {
  Complaint,
  ComplaintCreateRequest,
  ComplaintUpdateRequest,
  ComplaintSeverity,
  ComplaintSourceChannel,
} from '@/services/complaint/types';

interface ComplaintFormProps {
  isOpen: boolean;
  onClose: () => void;
  complaint?: Complaint | null;
  onSuccess?: (complaint: Complaint) => void;
}

const severityOptions: { value: ComplaintSeverity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

// Channel dropdown — MAIL and PHONE only per PART 2
const channelOptions: { value: ComplaintSourceChannel; label: string }[] = [
  { value: 'MAIL', label: 'Mail' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'WHATSAPP', label: 'WhatsApp Group' },
];

// Category dropdown — fixed values per PART 2
const categoryFixedOptions = [
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'CLAIMS', label: 'Claims' },
];

const defaultFormData = {
  sourceChannel: 'MAIL' as ComplaintSourceChannel,
  categoryId: '',
  complaintType: '',
  complainantName: '',
  complainantContact: '',
  insurerClient: '',
  claimNo: '',
  vehicleNumber: '',
  workshopName: '',
  description: '',
  severity: 'MEDIUM' as ComplaintSeverity,
  assignTo: '',
};

export function ComplaintForm({
  isOpen,
  onClose,
  complaint,
  onSuccess,
}: ComplaintFormProps) {
  const {
    categories,
    assignableUsers,
    clients,
    fetchCategories,
    fetchAssignableUsers,
    fetchClients,
    createComplaint,
    updateComplaint,
  } = useComplaintStore();
  const isEditing = !!complaint;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...defaultFormData });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchAssignableUsers();
      fetchClients();
    }
  }, [isOpen, fetchCategories, fetchAssignableUsers, fetchClients]);

  useEffect(() => {
    if (complaint) {
      setFormData({
        sourceChannel: complaint.sourceChannel || 'MAIL',
        categoryId: complaint.category?.id || '',
        complaintType: complaint.complaintType || '',
        complainantName: complaint.complainantName || '',
        complainantContact: complaint.complainantContact || '',
        insurerClient: complaint.insurerClient || '',
        claimNo: complaint.referenceId || '',
        vehicleNumber: complaint.vehicleNumber || '',
        workshopName: complaint.workshopName || '',
        description: complaint.description || '',
        severity: complaint.severity,
        assignTo: complaint.ownerEmployeeId || '',
      });
    } else {
      setFormData({ ...defaultFormData });
    }
  }, [complaint]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result: Complaint | null;

      if (isEditing && complaint) {
        const updateData: ComplaintUpdateRequest = {
          description: formData.description || undefined,
          categoryId: formData.categoryId || undefined,
          severity: formData.severity,
          complaintType: formData.complaintType || null,
          complainantName: formData.complainantName || null,
          complainantContact: formData.complainantContact || null,
          insurerClient: formData.insurerClient || null,
          referenceId: formData.claimNo || null,
          vehicleNumber: formData.vehicleNumber || null,
          workshopName: formData.workshopName || null,
        };
        result = await updateComplaint(complaint.id, updateData);
      } else {
        const createData: ComplaintCreateRequest = {
          sourceChannel: formData.sourceChannel,
          categoryId: formData.categoryId,
          complaintType: formData.complaintType || undefined,
          complainantName: formData.complainantName || undefined,
          complainantContact: formData.complainantContact || undefined,
          insurerClient: formData.insurerClient || undefined,
          claimNo: formData.claimNo || undefined,
          vehicleNumber: formData.vehicleNumber || undefined,
          workshopName: formData.workshopName || undefined,
          description: formData.description,
          severity: formData.severity,
          assignTo: formData.assignTo || undefined,
        };
        result = await createComplaint(createData);
      }

      if (result) {
        onSuccess?.(result);
        handleClose();
      } else {
        setError('Failed to save complaint');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ ...defaultFormData });
    setError(null);
    onClose();
  };

  // Use categories from backend, but also provide fixed options as fallback
  const activeCategories = categories.filter(c => c.isActive);
  const hasDynamicCategories = activeCategories.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Complaint' : 'Submit Complaint'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 1. Channel (required) — Dropdown: Mail, Phone */}
        <FormField label="Channel" required>
          <Select
            value={formData.sourceChannel}
            onChange={(e) => handleChange('sourceChannel', e.target.value)}
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        {/* 2. Category (required) — Dropdown: Inspection, Claims */}
        <FormField label="Category" required>
          <Select
            value={formData.categoryId}
            onChange={(e) => handleChange('categoryId', e.target.value)}
          >
            <option value="">Select Category</option>
            {hasDynamicCategories
              ? activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              : categoryFixedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
            }
          </Select>
        </FormField>

        {/* 3. Complaint Type — Text field (NOT dropdown) */}
        <FormField label="Complaint Type">
          <Input
            value={formData.complaintType}
            onChange={(e) => handleChange('complaintType', e.target.value)}
            placeholder="Enter complaint type..."
          />
        </FormField>

        {/* 4. Complainant Name */}
        <FormField label="Complainant Name">
          <Input
            value={formData.complainantName}
            onChange={(e) => handleChange('complainantName', e.target.value)}
            placeholder="Name of the complainant"
          />
        </FormField>

        {/* 5. Contact Number */}
        <FormField label="Contact Number">
          <Input
            value={formData.complainantContact}
            onChange={(e) => handleChange('complainantContact', e.target.value)}
            placeholder="Phone number or email"
          />
        </FormField>

        {/* 6. Insurer / Client (required) — Dropdown from clients master table */}
        <FormField label="Insurer / Client" required>
          <Select
            value={formData.insurerClient}
            onChange={(e) => handleChange('insurerClient', e.target.value)}
          >
            <option value="">Select Insurer / Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        {/* 7. Claim No */}
        <FormField label="Claim No">
          <Input
            value={formData.claimNo}
            onChange={(e) => handleChange('claimNo', e.target.value)}
            placeholder="Claim number"
          />
        </FormField>

        {/* 8. Vehicle Number */}
        <FormField label="Vehicle Number">
          <Input
            value={formData.vehicleNumber}
            onChange={(e) => handleChange('vehicleNumber', e.target.value)}
            placeholder="Vehicle number"
          />
        </FormField>

        {/* 9. Workshop Name */}
        <FormField label="Workshop Name">
          <Input
            value={formData.workshopName}
            onChange={(e) => handleChange('workshopName', e.target.value)}
            placeholder="Workshop name"
          />
        </FormField>

        {/* 10. Complaint Description (required) */}
        <FormField label="Complaint Description" required>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Provide detailed description of the complaint..."
            rows={4}
          />
        </FormField>

        {/* 11. Severity */}
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

        {/* 12. Assign To — Dynamic dropdown filtered by role hierarchy */}
        {!isEditing && (
          <FormField label="Assign To">
            <Select
              value={formData.assignTo}
              onChange={(e) => handleChange('assignTo', e.target.value)}
            >
              <option value="">Select Employee</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.employeeCode})
                  {user.department ? ` - ${user.department}` : ''}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!formData.description.trim() || !formData.categoryId || !formData.sourceChannel}
          >
            {isEditing ? 'Update Complaint' : 'Submit Complaint'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
