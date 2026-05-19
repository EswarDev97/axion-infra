/**
 * MindFlow - Payslip List Component
 * Stub implementation - TODO: Full implementation
 */
'use client';

interface PayslipListProps {
  searchParams: {
    month?: string;
    year?: string;
    department?: string;
  };
}

export function PayslipList({ searchParams }: PayslipListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
      <p className="text-gray-500">Payslip List - Coming Soon</p>
      <p className="text-sm text-gray-400 mt-2">
        Filter: {searchParams.month || 'All months'} / {searchParams.year || 'All years'}
      </p>
    </div>
  );
}
