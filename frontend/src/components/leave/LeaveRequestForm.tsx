/**
 * MindFlow - Leave Request Form Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
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
import {
  leaveTypeService,
  leaveBalanceService,
  leaveRequestService,
  type LeaveType,
  type LeaveBalance,
  type LeaveRequest,
} from '@/services/hr';

interface LeaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (request: LeaveRequest) => void;
}

export function LeaveRequestForm({ isOpen, onClose, onSuccess }: LeaveRequestFormProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [typesResult, balancesResult] = await Promise.allSettled([
        leaveTypeService.list({ pageSize: 100 }),
        leaveBalanceService.getCurrentUserBalances(currentYear),
      ]);

      if (typesResult.status === 'fulfilled') {
        setLeaveTypes(typesResult.value.items.filter((t) => t.isActive));
      } else {
        console.error('Failed to load leave types:', typesResult.reason);
      }

      if (balancesResult.status === 'fulfilled') {
        setBalances(balancesResult.value);
      } else {
        console.error('Failed to load leave balances:', balancesResult.reason);
      }
    } catch (err) {
      console.error('Failed to load form data:', err);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getAvailableDays = (leaveTypeId: string): number => {
    const balance = balances.find((b) => b.leaveTypeId === leaveTypeId);
    return balance?.availableDays || 0;
  };

  const calculateDays = (): number => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const requestedDays = calculateDays();
    const selectedType = leaveTypes.find((t) => t.id === formData.leaveTypeId);
    const isUnpaidLeave = selectedType && !selectedType.isPaid;

    // Skip balance validation for unpaid leave types (e.g., LOP)
    if (!isUnpaidLeave) {
      const availableDays = getAvailableDays(formData.leaveTypeId);
      if (requestedDays > availableDays) {
        setError(`Requested ${requestedDays} days but only ${availableDays} days available`);
        setLoading(false);
        return;
      }
    }

    try {
      const result = await leaveRequestService.create({
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason || undefined,
      });

      if (onSuccess) {
        onSuccess(result);
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      reason: '',
    });
    setError(null);
    onClose();
  };

  const requestedDays = calculateDays();
  const selectedLeaveType = leaveTypes.find((t) => t.id === formData.leaveTypeId);
  const isSelectedUnpaid = selectedLeaveType && !selectedLeaveType.isPaid;
  const availableDays = formData.leaveTypeId ? getAvailableDays(formData.leaveTypeId) : 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Leave" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <FormField label="Leave Type" required>
          <Select
            value={formData.leaveTypeId}
            onChange={(e) => handleChange('leaveTypeId', e.target.value)}
          >
            <option value="">Select Leave Type</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          {selectedLeaveType && (
            <p className="text-sm text-gray-500 mt-1">
              {isSelectedUnpaid ? 'Loss of Pay — no balance deduction' : `Available: ${availableDays} days`}
            </p>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" required>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </FormField>

          <FormField label="End Date" required>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
            />
          </FormField>
        </div>

        {requestedDays > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              Requesting <strong>{requestedDays}</strong> day{requestedDays > 1 ? 's' : ''} of leave
            </p>
          </div>
        )}

        <FormField label="Reason">
          <Textarea
            value={formData.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            placeholder="Optional reason for leave..."
            rows={3}
          />
        </FormField>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!formData.leaveTypeId || !formData.startDate || !formData.endDate}
          >
            Submit Request
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
