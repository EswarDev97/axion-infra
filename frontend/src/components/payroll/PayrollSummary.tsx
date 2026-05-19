/**
 * MindFlow - Payroll Summary Component
 * Stub implementation - TODO: Full implementation
 */
'use client';

interface PayrollSummaryProps {
  month?: string;
  year?: string;
}

export function PayrollSummary({ month, year }: PayrollSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <p className="text-sm text-gray-500">Total Payroll</p>
        <p className="text-2xl font-bold text-gray-900">--</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <p className="text-sm text-gray-500">Processed</p>
        <p className="text-2xl font-bold text-green-600">--</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <p className="text-sm text-gray-500">Pending</p>
        <p className="text-2xl font-bold text-yellow-600">--</p>
      </div>
    </div>
  );
}
