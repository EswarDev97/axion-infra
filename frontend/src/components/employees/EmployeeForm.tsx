/**
 * MindFlow - Employee Form Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { FormField } from '@/components/form/FormField';
import {
  employeeService,
  departmentService,
  positionService,
  type Employee,
  type EmployeeCreateRequest,
  type EmployeeUpdateRequest,
  type Department,
  type Position,
  type LeaveBalanceInput,
} from '@/services/hr';
import { roleService, type Role } from '@/services/roles';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess?: (employee: Employee) => void;
}

const employmentStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'RETIRED', label: 'Retired' },
];

const employmentTypeOptions = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'CONSULTANT', label: 'Consultant' },
];

export function EmployeeForm({ employee, onSuccess }: EmployeeFormProps) {
  const router = useRouter();
  const isEditing = !!employee;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    employeeCode: employee?.employeeCode || '',
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    password: '',
    confirmPassword: '',
    role: 'EMPLOYEE',
    departmentId: employee?.departmentId || '',
    positionId: employee?.positionId || '',
    managerId: employee?.managerId || '',
    hireDate: employee?.dateOfJoining || '',
    employmentStatus: employee?.status || 'ACTIVE',
    employmentType: employee?.employmentType || 'FULL_TIME',
    salary: employee?.salary != null ? String(employee.salary) : '',
    casualLeave: '12',
    sickLeave: '10',
    earnedLeave: '15',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptResponse, posResponse, empResponse, rolesResponse] = await Promise.all([
          departmentService.list({ pageSize: 100 }),
          positionService.list({ pageSize: 100 }),
          employeeService.list({ pageSize: 100, status: 'ACTIVE' }),
          roleService.list({ pageSize: 100 }),
        ]);
        setDepartments(deptResponse.items);
        setPositions(posResponse.items);
        setManagers(empResponse.items.filter((e) => e.id !== employee?.id));
        setRoles(rolesResponse.items);
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    };
    fetchData();
  }, [employee?.id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields for create
    if (!isEditing) {
      if (!formData.positionId) {
        setError('Position is required');
        return;
      }
      if (!formData.hireDate) {
        setError('Hire Date is required');
        return;
      }
      if (!formData.password) {
        setError('Password is required');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (!formData.confirmPassword) {
        setError('Confirm Password is required');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    // Validate password match on edit (only if password is provided)
    if (isEditing && formData.password) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      let result: Employee;

      if (isEditing) {
        const updateData: EmployeeUpdateRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone || null,
          password: formData.password || undefined,
          positionId: formData.positionId || null,
          departmentId: formData.departmentId || null,
          managerId: formData.managerId || null,
          status: formData.employmentStatus || undefined,
          employmentType: formData.employmentType || undefined,
          salary: formData.salary ? parseFloat(formData.salary) : null,
        };
        result = await employeeService.update(employee.id, updateData);
      } else {
        const leaveBalances: LeaveBalanceInput[] = [
          { leaveTypeCode: 'CL', days: parseFloat(formData.casualLeave) || 0 },
          { leaveTypeCode: 'SL', days: parseFloat(formData.sickLeave) || 0 },
          { leaveTypeCode: 'EL', days: parseFloat(formData.earnedLeave) || 0 },
        ];
        const createData: EmployeeCreateRequest = {
          employeeCode: formData.employeeCode,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
          role: formData.role || undefined,
          positionId: formData.positionId,
          departmentId: formData.departmentId || undefined,
          managerId: formData.managerId || undefined,
          dateOfJoining: formData.hireDate,
          employmentType: formData.employmentType || undefined,
          salary: formData.salary ? parseFloat(formData.salary) : undefined,
          leaveBalances,
        };
        result = await employeeService.create(createData);
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push(`/dashboard/employees/${result.id}`);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <FormField label="Employee Code" required error={!formData.employeeCode && 'Required'}>
            <Input
              value={formData.employeeCode}
              onChange={(e) => handleChange('employeeCode', e.target.value)}
              disabled={isEditing}
              placeholder="EMP001"
            />
          </FormField>

          <FormField label="First Name" required>
            <Input
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="John"
            />
          </FormField>

          <FormField label="Last Name" required>
            <Input
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Doe"
            />
          </FormField>

          <FormField label="Email" required>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={isEditing}
              placeholder="john.doe@company.com"
            />
          </FormField>

          <FormField label="Phone">
            <Input
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </FormField>

          <FormField
            label="Password"
            required={!isEditing}
            error={
              formData.password && formData.password.length < 6
                ? 'Password must be at least 6 characters'
                : false
            }
          >
            <Input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder={isEditing ? 'Leave blank to keep unchanged' : 'Enter password'}
              minLength={6}
              error={!!(formData.password && formData.password.length < 6)}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />
          </FormField>

          <FormField
            label="Confirm Password"
            required={!isEditing}
            error={
              formData.confirmPassword && formData.password !== formData.confirmPassword
                ? 'Passwords do not match'
                : false
            }
          >
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder={isEditing ? 'Leave blank to keep unchanged' : 'Confirm password'}
              minLength={6}
              error={!!(formData.confirmPassword && formData.password !== formData.confirmPassword)}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
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

          <FormField label="Position" required>
            <Select value={formData.positionId} onChange={(e) => handleChange('positionId', e.target.value)}>
              <option value="">Select Position</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>{pos.title}</option>
              ))}
            </Select>
          </FormField>

          {!isEditing && (
            <FormField label="Role" required>
              <Select value={formData.role} onChange={(e) => handleChange('role', e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>{r.name}</option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="Reports To">
            <Select value={formData.managerId} onChange={(e) => handleChange('managerId', e.target.value)}>
              <option value="">Select Manager</option>
              {managers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>{mgr.firstName} {mgr.lastName}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Hire Date" required={!isEditing}>
            <Input
              type="date"
              value={formData.hireDate}
              onChange={(e) => handleChange('hireDate', e.target.value)}
              disabled={isEditing}
            />
          </FormField>

          <FormField label="Employment Status">
            <Select value={formData.employmentStatus} onChange={(e) => handleChange('employmentStatus', e.target.value)}>
              {employmentStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Employment Type">
            <Select value={formData.employmentType} onChange={(e) => handleChange('employmentType', e.target.value)}>
              {employmentTypeOptions.map((opt) => (
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

      {/* Leave Balances - only on create */}
      {!isEditing && (
        <section>
          <h3 className="text-lg font-medium mb-4">Leave Balances</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Casual Leave (CL)">
              <Input
                type="number"
                value={formData.casualLeave}
                onChange={(e) => handleChange('casualLeave', e.target.value)}
                placeholder="12"
                min="0"
                step="1"
              />
            </FormField>

            <FormField label="Sick Leave (SL)">
              <Input
                type="number"
                value={formData.sickLeave}
                onChange={(e) => handleChange('sickLeave', e.target.value)}
                placeholder="10"
                min="0"
                step="1"
              />
            </FormField>

            <FormField label="Earned Leave (EL)">
              <Input
                type="number"
                value={formData.earnedLeave}
                onChange={(e) => handleChange('earnedLeave', e.target.value)}
                placeholder="15"
                min="0"
                step="1"
              />
            </FormField>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEditing ? 'Update Employee' : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
}
