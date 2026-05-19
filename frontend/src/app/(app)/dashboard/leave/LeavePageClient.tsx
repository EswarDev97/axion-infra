/**
 * MindFlow - Leave Management Page Client Component
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard';
import { LeaveRequestList } from '@/components/leave/LeaveRequestList';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';

interface LeavePageClientProps {
  view: 'my' | 'pending' | 'all';
}

export function LeavePageClient({ view }: LeavePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showRequestForm, setShowRequestForm] = useState(false);

  const tabs = [
    { id: 'my', label: 'My Requests' },
    { id: 'pending', label: 'Pending Approvals' },
    { id: 'all', label: 'All Requests' },
  ];

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', tabId);
    router.push(`/dashboard/leave?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-gray-600">Apply for leave and track your balance</p>
        </div>
        <Button onClick={() => setShowRequestForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Apply for Leave
        </Button>
      </div>

      {/* Leave Balance Cards (only on my requests view) */}
      {view === 'my' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Leave Balance</h2>
          <LeaveBalanceCard />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                view === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Leave Request List */}
      <div className="bg-white rounded-lg border">
        <LeaveRequestList mode={view} />
      </div>

      {/* Request Form Modal */}
      <LeaveRequestForm
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        onSuccess={() => {
          setShowRequestForm(false);
          // List will refresh automatically
        }}
      />
    </div>
  );
}
