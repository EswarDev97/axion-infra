/**
 * MindFlow - Employee Detail Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Edit,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { type Employee, employeeService } from '@/services/hr';

interface EmployeeDetailProps {
  employee: Employee;
}

const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  ACTIVE: 'success',
  PROBATION: 'warning',
  ON_LEAVE: 'info',
  TERMINATED: 'error',
  RESIGNED: 'error',
  RETIRED: 'neutral',
};

export function EmployeeDetail({ employee }: EmployeeDetailProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await employeeService.delete(employee.id);
      router.push('/dashboard/employees');
    } catch (error) {
      console.error('Failed to delete employee:', error);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              alt={`${employee.firstName} ${employee.lastName}`}
              fallback={`${employee.firstName[0]}${employee.lastName[0]}`}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-gray-500">{employee.employeeCode}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={statusColors[employee.status] || 'neutral'}>
                  {employee.status.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="neutral">
                  {employee.employmentType.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/employees/${employee.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <div className="space-y-4">
            <InfoItem icon={Mail} label="Email" value={employee.email} />
            <InfoItem icon={Phone} label="Phone" value={employee.phone} />
          </div>
        </div>

        {/* Employment Information */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Employment Information</h2>
          <div className="space-y-4">
            <InfoItem icon={Building2} label="Department" value={employee.departmentName} />
            <InfoItem icon={Briefcase} label="Position" value={employee.positionTitle} />
            <InfoItem icon={User} label="Reports To" value={employee.managerName} />
            <InfoItem
              icon={Calendar}
              label="Hire Date"
              value={new Date(employee.dateOfJoining).toLocaleDateString()}
            />
            {employee.dateOfExit && (
              <InfoItem
                icon={Calendar}
                label="Exit Date"
                value={new Date(employee.dateOfExit).toLocaleDateString()}
              />
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
          <div className="space-y-4">
            <InfoItem icon={User} label="Full Name" value={employee.fullName} />
            <InfoItem icon={Calendar} label="Created" value={new Date(employee.createdAt).toLocaleDateString()} />
            <InfoItem icon={Calendar} label="Last Updated" value={new Date(employee.updatedAt).toLocaleDateString()} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Employee"
        description={`Are you sure you want to delete ${employee.firstName} ${employee.lastName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
