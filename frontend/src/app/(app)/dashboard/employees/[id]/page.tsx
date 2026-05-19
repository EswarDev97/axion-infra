/**
 * MindFlow - Employee Detail Page
 * Full RUD: Read, Update link, Status toggle, Change Password
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/feedback/Alert';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { FormField } from '@/components/form/FormField';
import { EmployeeProfile } from '@/components/employees/EmployeeProfile';
import { EmployeeDocuments } from '@/components/employees/EmployeeDocuments';
import { EmployeeAttendance } from '@/components/employees/EmployeeAttendance';
import { EmployeeLeave } from '@/components/employees/EmployeeLeave';
import { EmployeePayroll } from '@/components/employees/EmployeePayroll';
import { employeeService, type Employee } from '@/services/hr';
import { useAuthStore } from '@/stores/authStore';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  PROBATION: 'warning',
  ON_LEAVE: 'info',
  TERMINATED: 'error',
  RESIGNED: 'error',
  RETIRED: 'neutral',
  INACTIVE: 'error',
};

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { hasRole } = useAuthStore();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Status toggle
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Change password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfPwd, setShowConfPwd] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const data = await employeeService.getById(id);
        setEmployee(data);
      } catch (err) {
        setError((err as Error).message || 'Failed to load employee');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  const handleStatusToggle = async () => {
    if (!employee) return;
    setStatusLoading(true);
    try {
      const newStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updated = await employeeService.updateStatus(employee.id, newStatus);
      setEmployee(updated);
      setSuccess(`Employee status changed to ${newStatus}`);
      setStatusConfirm(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to change status');
      setStatusConfirm(false);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newPassword) { setError('New Password is required'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!confirmPwd) { setError('Confirm Password is required'); return; }
    if (newPassword !== confirmPwd) { setError('Passwords do not match'); return; }

    setPasswordLoading(true);
    try {
      await employeeService.changePassword(id, newPassword);
      setSuccess('Password changed successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPwd('');
    } catch (err) {
      setError((err as Error).message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error || 'Employee not found'}</Alert>
        <Button variant="outline" onClick={() => router.push('/dashboard/employees')}>
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-2xl font-semibold text-gray-500">
              {employee.firstName[0]}{employee.lastName[0]}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-600">
              {employee.positionTitle}
              {employee.departmentName ? ` - ${employee.departmentName}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusColors[employee.status] || 'neutral'}>
                {employee.status.replace(/_/g, ' ')}
              </Badge>
              {employee.role && (
                <Badge variant="purple">
                  {employee.role.replace(/_/g, ' ')}
                </Badge>
              )}
              <span className="text-sm text-gray-500">{employee.employeeCode}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/employees')}>
            Back
          </Button>
          <Button onClick={() => router.push(`/dashboard/employees/${id}/edit`)}>
            Edit
          </Button>
          <Button
            variant={employee.status === 'ACTIVE' ? 'danger' : 'primary'}
            onClick={() => setStatusConfirm(true)}
          >
            {employee.status === 'ACTIVE' ? 'Inactivate' : 'Activate'}
          </Button>
          {isSuperAdmin && (
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(true);
                setNewPassword('');
                setConfirmPwd('');
                setShowNewPwd(false);
                setShowConfPwd(false);
              }}
            >
              Change Password
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <EmployeeProfile employeeId={id} />
        </TabsContent>
        <TabsContent value="documents">
          <EmployeeDocuments employeeId={id} />
        </TabsContent>
        <TabsContent value="attendance">
          <EmployeeAttendance employeeId={id} />
        </TabsContent>
        <TabsContent value="leave">
          <EmployeeLeave employeeId={id} />
        </TabsContent>
        <TabsContent value="payroll">
          <EmployeePayroll employeeId={id} />
        </TabsContent>
      </Tabs>

      {/* Status Toggle Confirmation */}
      <ConfirmDialog
        isOpen={statusConfirm}
        onClose={() => setStatusConfirm(false)}
        onConfirm={handleStatusToggle}
        title={employee.status === 'ACTIVE' ? 'Inactivate Employee' : 'Activate Employee'}
        description={
          employee.status === 'ACTIVE'
            ? `Are you sure you want to inactivate "${employee.firstName} ${employee.lastName}"? They will no longer be able to login to the portal.`
            : `Are you sure you want to activate "${employee.firstName} ${employee.lastName}"? They will be able to login again.`
        }
        confirmLabel={employee.status === 'ACTIVE' ? 'Inactivate' : 'Activate'}
        variant={employee.status === 'ACTIVE' ? 'danger' : 'info'}
        loading={statusLoading}
      />

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        description={`Change password for ${employee.firstName} ${employee.lastName}`}
        size="sm"
      >
        <form onSubmit={handleChangePassword}>
          <div className="space-y-4">
            <FormField
              label="New Password"
              required
              error={newPassword && newPassword.length < 6 ? 'Password must be at least 6 characters' : false}
            >
              <Input
                type={showNewPwd ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                error={!!(newPassword && newPassword.length < 6)}
                rightIcon={
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="focus:outline-none" tabIndex={-1}>
                    {showNewPwd ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                }
              />
            </FormField>

            <FormField
              label="Confirm Password"
              required
              error={confirmPwd && newPassword !== confirmPwd ? 'Passwords do not match' : false}
            >
              <Input
                type={showConfPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Confirm new password"
                error={!!(confirmPwd && newPassword !== confirmPwd)}
                rightIcon={
                  <button type="button" onClick={() => setShowConfPwd(!showConfPwd)} className="focus:outline-none" tabIndex={-1}>
                    {showConfPwd ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                }
              />
            </FormField>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button type="submit" loading={passwordLoading}>Change Password</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
