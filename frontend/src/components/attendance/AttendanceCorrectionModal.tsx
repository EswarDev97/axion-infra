/**
 * MindFlow - Attendance Correction Modal
 * Allows HR Admin to correct attendance records
 */

'use client';

import { useState } from 'react';
import { Modal } from '@/components/feedback/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/feedback/Alert';
import { attendanceService, type AttendanceRecord } from '@/services/hr';

interface AttendanceCorrectionModalProps {
  record: AttendanceRecord;
  isOpen: boolean;
  onClose: () => void;
  onCorrected: (updated: AttendanceRecord) => void;
}

const statusOptions = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'WORK_FROM_HOME', label: 'Work From Home' },
];

export function AttendanceCorrectionModal({
  record,
  isOpen,
  onClose,
  onCorrected,
}: AttendanceCorrectionModalProps) {
  const [checkIn, setCheckIn] = useState(record.checkIn?.slice(0, 16) || '');
  const [checkOut, setCheckOut] = useState(record.checkOut?.slice(0, 16) || '');
  const [status, setStatus] = useState(record.status);
  const [notes, setNotes] = useState(record.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated = await attendanceService.correctRecord(record.id, {
        checkIn: checkIn ? new Date(checkIn).toISOString() : undefined,
        checkOut: checkOut ? new Date(checkOut).toISOString() : undefined,
        status,
        notes,
      });
      onCorrected(updated);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Correct Attendance Record">
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div>
          <p className="text-sm text-gray-500 mb-3">
            Employee: <span className="font-medium text-gray-900">{record.employeeName}</span>
            {' - '}
            Date: <span className="font-medium text-gray-900">
              {new Date(record.date).toLocaleDateString()}
            </span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
          <Input
            type="datetime-local"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
          <Input
            type="datetime-local"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for correction"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Save Correction</Button>
        </div>
      </div>
    </Modal>
  );
}
