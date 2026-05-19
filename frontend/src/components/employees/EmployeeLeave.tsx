/**
 * MindFlow - Employee Leave Component
 * Stub implementation - TODO: Full implementation
 */
'use client';

interface EmployeeLeaveProps {
  employeeId: string;
}

export function EmployeeLeave({ employeeId }: EmployeeLeaveProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
      <p className="text-gray-500">Employee Leave - Coming Soon</p>
      <p className="text-sm text-gray-400 mt-2">Employee ID: {employeeId}</p>
    </div>
  );
}
