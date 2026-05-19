'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mindMapService } from '@/services/mindmap';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MindMapCanvas } from './components/MindMapCanvas';

export default function MindMapEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mindMapId = params.id as string;

  // Fetch mind map details
  const { data: mindMap, isLoading, error, refetch } = useQuery({
    queryKey: ['mindMap', mindMapId],
    queryFn: () => mindMapService.getById(mindMapId),
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: () => mindMapService.archive(mindMapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mindMap', mindMapId] });
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: () => mindMapService.restore(mindMapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mindMap', mindMapId] });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: () => mindMapService.duplicate(mindMapId, { title: `${mindMap?.title} (Copy)` }),
    onSuccess: (newMindMap) => {
      router.push(`/dashboard/mindmaps/${newMindMap.id}`);
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading mind map..." />;
  if (error || !mindMap) return <ErrorState message="Failed to load mind map" onRetry={refetch} />;

  const isEditable = mindMap.status === 'ACTIVE';
  const nodes = mindMap.nodes || [];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/mindmaps')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-6 w-px bg-gray-200" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900">{mindMap.title}</h1>
              <Badge variant={mindMap.status === 'ACTIVE' ? 'green' : 'gray'}>
                {mindMap.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
              {mindMap.description && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-xs">{mindMap.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Duplicate */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateMutation.mutate()}
            loading={duplicateMutation.isPending}
            title="Duplicate this mind map"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Duplicate</span>
          </Button>

          {/* Archive/Restore */}
          {mindMap.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => archiveMutation.mutate()}
              loading={archiveMutation.isPending}
              title="Archive this mind map"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="hidden sm:inline">Archive</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => restoreMutation.mutate()}
              loading={restoreMutation.isPending}
              title="Restore this mind map"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Restore</span>
            </Button>
          )}

          {/* Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/mindmaps/${mindMapId}/edit`)}
            title="Mind map settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Archived Banner */}
      {mindMap.status === 'ARCHIVED' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-amber-800">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">This mind map is archived. Restore it to make changes.</span>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <MindMapCanvas
          mindMap={mindMap}
          isEditable={isEditable}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
