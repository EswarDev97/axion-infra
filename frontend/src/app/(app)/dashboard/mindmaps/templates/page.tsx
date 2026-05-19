'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateService, mindMapService } from '@/services/mindmap';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/feedback/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SearchInput } from '@/components/form/SearchInput';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/data/Pagination';

export default function MindMapTemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [newMapDescription, setNewMapDescription] = useState('');

  // Fetch templates
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mindMapTemplates', { search, category, page, pageSize }],
    queryFn: () =>
      templateService.list({
        search: search || undefined,
        category: category || undefined,
        isActive: true,
        page,
        pageSize,
      }),
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['templateCategories'],
    queryFn: () => templateService.getCategories(),
  });

  // Create from template mutation
  const createFromTemplateMutation = useMutation({
    mutationFn: (data: { templateId: string; title: string; description?: string }) =>
      mindMapService.createFromTemplate(data),
    onSuccess: (mindMap) => {
      setShowCreateModal(false);
      setSelectedTemplate(null);
      setNewMapTitle('');
      setNewMapDescription('');
      router.push(`/dashboard/mindmaps/${mindMap.id}`);
    },
  });

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (selectedTemplate && newMapTitle.trim()) {
      createFromTemplateMutation.mutate({
        templateId: selectedTemplate,
        title: newMapTitle,
        description: newMapDescription || undefined,
      });
    }
  };

  if (isLoading) return <LoadingState message="Loading templates..." />;
  if (error) return <ErrorState message="Failed to load templates" onRetry={refetch} />;

  const templates = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mind Map Templates</h1>
          <p className="text-gray-600">Start with a pre-built structure</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/mindmaps">
            <Button variant="outline">Back to Mind Maps</Button>
          </Link>
          <Link href="/dashboard/mindmaps/templates/new">
            <Button>Create Template</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search templates..."
          className="w-64"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-48"
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <EmptyState
          title="No templates found"
          description="Create a template to reuse mind map structures"
          action={
            <Link href="/dashboard/mindmaps/templates/new">
              <Button>Create Template</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="h-40 bg-gradient-to-br from-purple-50 to-blue-50 rounded-t-lg overflow-hidden relative">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-purple-300" viewBox="0 0 100 100" fill="none">
                      <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.6" />
                      <circle cx="25" cy="30" r="8" fill="currentColor" opacity="0.4" />
                      <circle cx="75" cy="30" r="8" fill="currentColor" opacity="0.4" />
                      <circle cx="20" cy="60" r="8" fill="currentColor" opacity="0.4" />
                      <circle cx="80" cy="60" r="8" fill="currentColor" opacity="0.4" />
                      <line x1="50" y1="50" x2="25" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <line x1="50" y1="50" x2="75" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <line x1="50" y1="50" x2="20" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <line x1="50" y1="50" x2="80" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    </svg>
                  </div>
                )}
                {template.isSystemTemplate && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="blue">System</Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>

                {template.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                )}

                {template.category && (
                  <Badge variant="gray">{template.category}</Badge>
                )}

                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
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

      {/* Create from Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedTemplate(null);
          setNewMapTitle('');
          setNewMapDescription('');
        }}
        title="Create from Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mind Map Title</label>
            <Input
              value={newMapTitle}
              onChange={(e) => setNewMapTitle(e.target.value)}
              placeholder="Enter a title for your mind map"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <Textarea
              value={newMapDescription}
              onChange={(e) => setNewMapDescription(e.target.value)}
              placeholder="Describe your mind map"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setSelectedTemplate(null);
                setNewMapTitle('');
                setNewMapDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createFromTemplateMutation.isPending}
              disabled={!newMapTitle.trim()}
            >
              Create Mind Map
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
