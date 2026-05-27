import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { CrmLeadList } from '@/components/crm/CrmLeadList';
import { CrmLeadFilters } from '@/components/crm/CrmLeadFilters';

export const metadata: Metadata = {
  title: 'CRM Leads - MindFlow',
};

interface CrmPageProps {
  searchParams: {
    search?: string;
    interestLevel?: string;
    overdueOnly?: string;
    page?: string;
  };
}

export default function CrmPage({ searchParams }: CrmPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track Operating Office outreach and follow-ups
          </p>
        </div>
        <Link
          href="/dashboard/crm/new"
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Lead
        </Link>
      </div>

      <Suspense>
        <CrmLeadFilters />
      </Suspense>

      <Suspense fallback={
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">Loading leads...</div>
      }>
        <CrmLeadList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
