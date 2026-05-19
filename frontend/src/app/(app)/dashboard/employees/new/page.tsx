import { Metadata } from 'next';
import { EmployeeForm } from '@/components/employees/EmployeeForm';

export const metadata: Metadata = {
  title: 'Add Employee - MindFlow',
};

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Add Employee</h1>
          <p className="text-gray-600">Create a new employee record</p>
        </div>
        <a
          href="/dashboard/employees"
          className="text-gray-600 hover:text-gray-900 transition"
        >
          Back to Employees
        </a>
      </div>

      {/* Employee Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <EmployeeForm />
      </div>
    </div>
  );
}
