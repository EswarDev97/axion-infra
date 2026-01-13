import { Metadata } from 'next';
import { Suspense } from 'react';
import { PayrollFilters } from '@/components/payroll/PayrollFilters';
import { PayslipList } from '@/components/payroll/PayslipList';
import { PayrollSummary } from '@/components/payroll/PayrollSummary';
import { PayrollActions } from '@/components/payroll/PayrollActions';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const metadata: Metadata = {
  title: 'Payroll - AxionPCS HRMS',
};

interface PayrollPageProps {
  searchParams: {
    view?: 'my' | 'all';
    month?: string;
    year?: string;
    status?: string;
    department?: string;
  };
}

export default function PayrollPage({ searchParams }: PayrollPageProps) {
  const view = searchParams.view || 'my';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-gray-600">
            {view === 'my'
              ? 'View your payslips and salary details'
              : 'Manage payroll processing'}
          </p>
        </div>
        {view === 'all' && <PayrollActions />}
      </div>

      {/* Summary (HR view) */}
      {view === 'all' && (
        <PayrollSummary
          month={searchParams.month}
          year={searchParams.year}
        />
      )}

      {/* Filters */}
      <PayrollFilters currentView={view} />

      {/* Payslip List */}
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <PayslipList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
