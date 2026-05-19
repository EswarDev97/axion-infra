import { Metadata } from 'next';
import { DepartmentForm } from '@/components/departments/DepartmentForm';

export const metadata: Metadata = {
  title: 'Add Department - MindFlow',
};

export default function NewDepartmentPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Add Department</h1>
          <p className="text-gray-600">Create a new department</p>
        </div>
        <a
          href="/dashboard/departments"
          className="text-gray-600 hover:text-gray-900 transition"
        >
          Back to Departments
        </a>
      </div>

      {/* Department Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <DepartmentForm />
      </div>
    </div>
  );
}
