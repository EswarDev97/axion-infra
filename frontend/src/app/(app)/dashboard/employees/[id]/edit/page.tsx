/**
 * MindFlow - Edit Employee Page
 * Update form WITHOUT password fields
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { FormField } from '@/components/form/FormField';
import {
  employeeService,
  departmentService,
  positionService,
  leaveBalanceService,
  type Employee,
  type EmployeeUpdateRequest,
  type Department,
  type Position,
  type LeaveBalance,
  type LeaveBalanceInput,
} from '@/services/hr';
import { roleService, type Role } from '@/services/roles';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRole, setCurrentRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    departmentId: '',
    positionId: '',
    managerId: '',
    employmentStatus: 'ACTIVE',
    employmentType: 'FULL_TIME',
    salary: '',
    casualLeave: '0',
    sickLeave: '0',
    earnedLeave: '0',
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetched independently (not Promise.all) so one lookup failing —
      // e.g. roleService.list() requiring auth:read:all, a permission a
      // caller might lack — doesn't also blank out the rest of the form.
      // The employee record itself is the only genuinely required piece;
      // department/position/manager/role dropdowns degrade to empty
      // options (still editable via other fields) rather than blocking
      // the whole page behind one error banner.
      const [empResult, deptResult, posResult, managersResult, rolesResult] =
        await Promise.allSettled([
          employeeService.getById(id),
          departmentService.list({ pageSize: 100 }),
          positionService.list({ pageSize: 100 }),
          employeeService.list({ pageSize: 100, status: 'ACTIVE' }),
          roleService.list({ pageSize: 100 }),
        ]);

      if (empResult.status === 'rejected') {
        setError((empResult.reason as Error)?.message || 'Failed to load employee');
        setLoading(false);
        return;
      }
      const emp = empResult.value;
      setEmployee(emp);

      if (deptResult.status === 'fulfilled') setDepartments(deptResult.value.items);
      if (posResult.status === 'fulfilled') setPositions(posResult.value.items);
      if (managersResult.status === 'fulfilled') {
        setManagers(managersResult.value.items.filter((e) => e.id !== id));
      }
      if (rolesResult.status === 'fulfilled') setRoles(rolesResult.value.items);

      const firstRejection = [deptResult, posResult, managersResult, rolesResult].find(
        (r) => r.status === 'rejected'
      ) as PromiseRejectedResult | undefined;
      if (firstRejection) {
        setError((firstRejection.reason as Error)?.message || 'Some form data failed to load');
      }

      const empRole = emp.role || 'EMPLOYEE';
      setCurrentRole(empRole);

      // Fetch leave balances for this employee
      let clBalance = '0', slBalance = '0', elBalance = '0';
      try {
        const balances = await leaveBalanceService.getByEmployee(id, new Date().getFullYear());
        for (const b of balances) {
          if (b.leaveTypeName === 'Casual Leave') clBalance = String(b.totalDays);
          else if (b.leaveTypeName === 'Sick Leave') slBalance = String(b.totalDays);
          else if (b.leaveTypeName === 'Earned Leave') elBalance = String(b.totalDays);
        }
      } catch {
        // Balances may not exist yet
      }

      setFormData({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone || '',
        role: empRole,
        departmentId: emp.departmentId || '',
        positionId: emp.positionId || '',
        managerId: emp.managerId || '',
        employmentStatus: emp.status || 'ACTIVE',
        employmentType: emp.employmentType || 'FULL_TIME',
        salary: emp.salary != null ? String(emp.salary) : '',
        casualLeave: clBalance,
        sickLeave: slBalance,
        earnedLeave: elBalance,
      });
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim()) { setError('First Name is required'); return; }
    if (!formData.lastName.trim()) { setError('Last Name is required'); return; }
    if (!formData.email.trim()) { setError('Email is required'); return; }

    setSaving(true);
    try {
      const leaveBalances: LeaveBalanceInput[] = [
        { leaveTypeCode: 'CL', days: parseFloat(formData.casualLeave) || 0 },
        { leaveTypeCode: 'SL', days: parseFloat(formData.sickLeave) || 0 },
        { leaveTypeCode: 'EL', days: parseFloat(formData.earnedLeave) || 0 },
      ];
      const updateData: EmployeeUpdateRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || null,
        positionId: formData.positionId || null,
        departmentId: formData.departmentId || null,
        managerId: formData.managerId || null,
        status: formData.employmentStatus || undefined,
        employmentType: formData.employmentType || undefined,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        leaveBalances,
      };
      await employeeService.update(id, updateData);

      // Update role if changed and employee has a user account
      if (formData.role && formData.role !== currentRole && employee?.userId) {
        try {
          const { put } = await import('@/services/api/client');
          await put(`/auth/users/${employee.userId}`, { roles: [formData.role] });
        } catch {
          // Role update failed but employee update succeeded
        }
      }

      router.push(`/dashboard/employees/${id}`);
    } catch (err) {
      setError((err as Error).message || 'Failed to update employee');
    } finally {
      setSaving(false);
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

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PROBATION', label: 'Probation' },
    { value: 'ON_LEAVE', label: 'On Leave' },
    { value: 'TERMINATED', label: 'Terminated' },
    { value: 'RESIGNED', label: 'Resigned' },
    { value: 'RETIRED', label: 'Retired' },
  ];

  const typeOptions = [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'INTERN', label: 'Intern' },
    { value: 'CONSULTANT', label: 'Consultant' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Edit Employee</h1>
          <p className="text-gray-600">
            Update details for {employee.firstName} {employee.lastName} ({employee.employeeCode})
          </p>
        </div>
        <a
          href={`/dashboard/employees/${id}`}
          className="text-gray-600 hover:text-gray-900 transition"
        >
          Back to Details
        </a>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Employee Code">
                <Input value={employee.employeeCode} disabled />
              </FormField>

              <FormField label="First Name" required>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
              </FormField>

              <FormField label="Last Name" required>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
              </FormField>

              <FormField label="Email" required>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </FormField>

              <FormField label="Phone">
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </FormField>
            </div>
          </section>

          {/* Employment Information */}
          <section>
            <h3 className="text-lg font-medium mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Department">
                <Select value={formData.departmentId} onChange={(e) => handleChange('departmentId', e.target.value)}>
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Position">
                <Select value={formData.positionId} onChange={(e) => handleChange('positionId', e.target.value)}>
                  <option value="">Select Position</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>{pos.title}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Role" required>
                <Select value={formData.role} onChange={(e) => handleChange('role', e.target.value)}>
                  {roles.map((r) => (
                    <option key={r.id} value={r.code}>{r.name}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Reports To">
                <Select value={formData.managerId} onChange={(e) => handleChange('managerId', e.target.value)}>
                  <option value="">Select Manager</option>
                  {managers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>{mgr.firstName} {mgr.lastName}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Employment Status">
                <Select value={formData.employmentStatus} onChange={(e) => handleChange('employmentStatus', e.target.value)}>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Employment Type">
                <Select value={formData.employmentType} onChange={(e) => handleChange('employmentType', e.target.value)}>
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Salary">
                <Input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => handleChange('salary', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </FormField>
            </div>
          </section>

          {/* Leave Balances */}
          <section>
            <h3 className="text-lg font-medium mb-4">Leave Balances</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Casual Leave (CL)">
                <Input
                  type="number"
                  value={formData.casualLeave}
                  onChange={(e) => handleChange('casualLeave', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </FormField>

              <FormField label="Sick Leave (SL)">
                <Input
                  type="number"
                  value={formData.sickLeave}
                  onChange={(e) => handleChange('sickLeave', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </FormField>

              <FormField label="Earned Leave (EL)">
                <Input
                  type="number"
                  value={formData.earnedLeave}
                  onChange={(e) => handleChange('earnedLeave', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </FormField>
            </div>
          </section>

          {/* Note about password */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            Password cannot be changed from this form. Use the "Change Password" option from the employee detail page (Super Admin only).
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Update Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
