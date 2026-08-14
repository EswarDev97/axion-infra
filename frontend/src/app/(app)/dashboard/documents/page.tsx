import { Metadata } from 'next';
import { Suspense } from 'react';
import { DocumentFilters } from '@/components/documents/DocumentFilters';
import { DocumentGrid } from '@/components/documents/DocumentGrid';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const metadata: Metadata = {
  title: 'Documents - Wings Associates HRMS',
};

interface DocumentsPageProps {
  searchParams: {
    view?: 'my' | 'all';
    type?: string;
    category?: string;
    search?: string;
  };
}

export default function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const view = searchParams.view || 'my';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-600">
            {view === 'my'
              ? 'View and manage your documents'
              : 'Manage all employee documents'}
          </p>
        </div>
        <DocumentUpload />
      </div>

      {/* Filters */}
      <DocumentFilters currentView={view} />

      {/* Document Grid */}
      <Suspense fallback={<TableSkeleton rows={6} />}>
        <DocumentGrid searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
