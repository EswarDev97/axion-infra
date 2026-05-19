'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { mindMapService } from '@/services/mindmap';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';
import type { MindMapStatus } from '@/services/mindmap/types';

const statusColors: Record<MindMapStatus, 'gray' | 'green' | 'yellow'> = {
  ACTIVE: 'green',
  ARCHIVED: 'gray',
};

export default function MindMapsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Fetch mind maps
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mindMaps', { search, status, page, pageSize }],
    queryFn: () =>
      mindMapService.list({
        search: search || undefined,
        status: status as MindMapStatus || undefined,
        page,
        pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading mind maps..." />;
  if (error) return <ErrorState message="Failed to load mind maps" onRetry={refetch} />;

  const mindMaps = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mind Maps</h1>
          <p className="text-gray-600">Visual brainstorming and idea mapping</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/mindmaps/templates">
            <Button variant="outline">Templates</Button>
          </Link>
          <Link href="/dashboard/mindmaps/new">
            <Button>New Mind Map</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search mind maps..."
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-40"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      {/* Mind Maps Grid */}
      {mindMaps.length === 0 ? (
        <EmptyState
          title="No mind maps found"
          description="Create your first mind map to visualize your ideas"
          action={
            <Link href="/dashboard/mindmaps/new">
              <Button>New Mind Map</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mindMaps.map((mindMap) => (
            <MindMapCard key={mindMap.id} mindMap={mindMap} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function MindMapCard({ mindMap }: { mindMap: { id: string; title: string; description?: string | null; status: MindMapStatus; nodeCount: number; createdAt: string; updatedAt: string } }) {
  return (
    <Link href={`/dashboard/mindmaps/${mindMap.id}`}>
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer h-full">
        {/* Preview Area */}
        <div className="h-40 bg-gradient-to-br from-blue-50 to-purple-50 rounded-t-lg overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Mind map icon/preview */}
            <svg className="w-20 h-20 text-blue-300" viewBox="0 0 100 100" fill="none">
              {/* Center node */}
              <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.6" />
              {/* Branch nodes */}
              <circle cx="25" cy="30" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="75" cy="30" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="20" cy="60" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="80" cy="60" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="35" cy="80" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="65" cy="80" r="8" fill="currentColor" opacity="0.4" />
              {/* Connecting lines */}
              <line x1="50" y1="50" x2="25" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <line x1="50" y1="50" x2="75" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <line x1="50" y1="50" x2="20" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <line x1="50" y1="50" x2="80" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <line x1="50" y1="50" x2="35" y2="80" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <line x1="50" y1="50" x2="65" y2="80" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            </svg>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant={statusColors[mindMap.status]}>{mindMap.status}</Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{mindMap.title}</h3>

          {mindMap.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{mindMap.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {mindMap.nodeCount} nodes
            </span>
            <span>
              {new Date(mindMap.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
