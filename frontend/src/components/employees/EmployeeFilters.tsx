/**
 * MindFlow - Employee Filters Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { departmentService, type Department } from '@/services/hr';

const employmentStatuses = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'RETIRED', label: 'Retired' },
];

const employmentTypes = [
  { value: '', label: 'All Types' },
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'CONSULTANT', label: 'Consultant' },
];

export function EmployeeFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await departmentService.list({ pageSize: 100 });
        setDepartments(response.items);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (department) params.set('department', department);
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    params.set('page', '1');
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setStatus('');
    setType('');
    router.push('/dashboard/employees');
  };

  const hasFilters = search || department || status || type;

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or employee code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
        </div>

        <Select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </Select>

        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {employmentStatuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {employmentTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        <Button onClick={applyFilters}>
          <Filter className="h-4 w-4 mr-1" />
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
