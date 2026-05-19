'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { mindMapService } from '@/services/mindmap';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { MindMapCreateRequest } from '@/services/mindmap/types';

export default function NewMindMapPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<MindMapCreateRequest>({
    title: '',
    description: '',
    themeSettings: {
      backgroundColor: '#f8fafc',
      nodeColor: '#3b82f6',
      lineColor: '#cbd5e1',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: MindMapCreateRequest) => mindMapService.create(data),
    onSuccess: (mindMap) => {
      router.push(`/dashboard/mindmaps/${mindMap.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold">Create New Mind Map</h1>
        <p className="text-gray-600">Start with a blank canvas or use a template</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="My Mind Map"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What is this mind map about?"
            rows={3}
          />
        </div>

        {/* Theme Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.themeSettings?.backgroundColor || '#f8fafc'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      themeSettings: {
                        ...formData.themeSettings,
                        backgroundColor: e.target.value,
                      },
                    })
                  }
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.themeSettings?.backgroundColor || '#f8fafc'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      themeSettings: {
                        ...formData.themeSettings,
                        backgroundColor: e.target.value,
                      },
                    })
                  }
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Node Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.themeSettings?.nodeColor || '#3b82f6'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      themeSettings: {
                        ...formData.themeSettings,
                        nodeColor: e.target.value,
                      },
                    })
                  }
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.themeSettings?.nodeColor || '#3b82f6'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      themeSettings: {
                        ...formData.themeSettings,
                        nodeColor: e.target.value,
                      },
                    })
                  }
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Line Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.themeSettings?.lineColor || '#cbd5e1'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      themeSettings: {
                        ...formData.themeSettings,
                        lineColor: e.target.value,
                      },
                    })
                  }
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.themeSettings?.lineColor || '#cbd5e1'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      themeSettings: {
                        ...formData.themeSettings,
                        lineColor: e.target.value,
                      },
                    })
                  }
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
          <div
            className="h-40 rounded-lg border flex items-center justify-center"
            style={{ backgroundColor: formData.themeSettings?.backgroundColor }}
          >
            <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none">
              <circle
                cx="50"
                cy="50"
                r="12"
                fill={formData.themeSettings?.nodeColor}
                opacity="0.8"
              />
              <circle
                cx="25"
                cy="30"
                r="8"
                fill={formData.themeSettings?.nodeColor}
                opacity="0.6"
              />
              <circle
                cx="75"
                cy="30"
                r="8"
                fill={formData.themeSettings?.nodeColor}
                opacity="0.6"
              />
              <circle
                cx="20"
                cy="65"
                r="8"
                fill={formData.themeSettings?.nodeColor}
                opacity="0.6"
              />
              <circle
                cx="80"
                cy="65"
                r="8"
                fill={formData.themeSettings?.nodeColor}
                opacity="0.6"
              />
              <line
                x1="50"
                y1="50"
                x2="25"
                y2="30"
                stroke={formData.themeSettings?.lineColor}
                strokeWidth="2"
              />
              <line
                x1="50"
                y1="50"
                x2="75"
                y2="30"
                stroke={formData.themeSettings?.lineColor}
                strokeWidth="2"
              />
              <line
                x1="50"
                y1="50"
                x2="20"
                y2="65"
                stroke={formData.themeSettings?.lineColor}
                strokeWidth="2"
              />
              <line
                x1="50"
                y1="50"
                x2="80"
                y2="65"
                stroke={formData.themeSettings?.lineColor}
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending}
            disabled={!formData.title.trim()}
          >
            Create Mind Map
          </Button>
        </div>
      </form>

      {/* Or use template */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 mb-2">Or start with a template</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/mindmaps/templates')}
        >
          Browse Templates
        </Button>
      </div>
    </div>
  );
}
