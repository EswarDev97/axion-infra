/**
 * MindFlow - Document Filters Component
 * Stub implementation - TODO: Full implementation in Phase 7+
 */
'use client';

interface DocumentFiltersProps {
  currentView: 'my' | 'all';
}

export function DocumentFilters({ currentView }: DocumentFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex gap-4 items-center">
        <a
          href="?view=my"
          className={`px-4 py-2 rounded-lg ${
            currentView === 'my'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          My Documents
        </a>
        <a
          href="?view=all"
          className={`px-4 py-2 rounded-lg ${
            currentView === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Documents
        </a>
      </div>
    </div>
  );
}
