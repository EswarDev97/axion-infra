'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { crmService } from '@/services/crm';
import {
  DISCUSSION_SUMMARY_LABELS,
  INTEREST_LEVEL_LABELS,
  type CrmLead,
  type InterestLevel,
} from '@/services/crm';

interface CrmLeadListProps {
  searchParams: {
    search?: string;
    interestLevel?: string;
    overdueOnly?: string;
    page?: string;
  };
}

const interestBadge: Record<InterestLevel, 'success' | 'warning' | 'error'> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'error',
};

export function CrmLeadList({ searchParams }: CrmLeadListProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingLead, setDeletingLead] = useState<CrmLead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await crmService.list({
        search: searchParams.search,
        interestLevel: searchParams.interestLevel as InterestLevel | undefined,
        overdueOnly: searchParams.overdueOnly === 'true',
        page: searchParams.page ? Number(searchParams.page) : 1,
        pageSize: 20,
      });
      setLeads(response.items);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total,
      });
    } catch (err) {
      setError((err as Error).message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleDelete = async () => {
    if (!deletingLead) return;
    try {
      await crmService.delete(deletingLead.id);
      setSuccess('Lead deleted successfully');
      setDeletingLead(null);
      fetchLeads();
    } catch {
      setError('Failed to delete lead');
      setDeletingLead(null);
    }
  };

  const isOverdue = (lead: CrmLead) => {
    if (!lead.nextFollowupDate) return false;
    return new Date(lead.nextFollowupDate) <= new Date();
  };

  const columns: Column<CrmLead>[] = [
    {
      key: 'operatingOfficeName',
      header: 'Operating Office',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.operatingOfficeName}</p>
          <p className="text-xs text-gray-500">{row.location}</p>
        </div>
      ),
    },
    {
      key: 'contacts',
      header: 'Primary Contact',
      render: (_, row) =>
        row.contacts.length > 0 ? (
          <div>
            <p className="text-sm font-medium">{row.contacts[0].name}</p>
            <p className="text-xs text-gray-500">{row.contacts[0].designation}</p>
            {row.contacts.length > 1 && (
              <p className="text-xs text-gray-400">+{row.contacts.length - 1} more</p>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: 'dateContacted',
      header: 'Date Contacted',
      sortable: true,
      render: (v) => <span className="text-sm">{new Date(String(v)).toLocaleDateString('en-IN')}</span>,
    },
    {
      key: 'discussionSummary',
      header: 'Discussion',
      render: (v) => (
        <span className="text-sm text-gray-700">
          {DISCUSSION_SUMMARY_LABELS[v as keyof typeof DISCUSSION_SUMMARY_LABELS] ?? String(v)}
        </span>
      ),
    },
    {
      key: 'interestLevel',
      header: 'Interest',
      sortable: true,
      render: (v) => {
        const level = v as InterestLevel;
        return <Badge variant={interestBadge[level]}>{INTEREST_LEVEL_LABELS[level]}</Badge>;
      },
    },
    {
      key: 'nextFollowupDate',
      header: 'Next Follow-up',
      sortable: true,
      render: (v, row) =>
        v ? (
          <span className={`text-sm ${isOverdue(row) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
            {new Date(String(v)).toLocaleDateString('en-IN')}
            {isOverdue(row) && <span className="ml-1 text-xs">(overdue)</span>}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
    {
      key: 'id',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/crm/${row.id}`)}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/crm/${row.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingLead(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <DataTable
        columns={columns}
        data={leads}
        keyField="id"
        loading={loading}
        pagination={{
          page: pagination.page,
          pageSize: 20,
          totalItems: pagination.total,
          totalPages: pagination.totalPages,
          hasNext: pagination.page < pagination.totalPages,
          hasPrevious: pagination.page > 1,
        }}
        onPageChange={(page) => {
          const p = new URLSearchParams(searchParams as Record<string, string>);
          p.set('page', String(page));
          router.push(`/dashboard/crm?${p.toString()}`);
        }}
        onRowClick={(row) => router.push(`/dashboard/crm/${row.id}`)}
        rowClassName={(row) =>
          isOverdue(row) ? 'bg-amber-50 hover:bg-amber-100' : ''
        }
        emptyMessage="No leads found. Add your first Operating Office lead."
      />

      <ConfirmDialog
        isOpen={!!deletingLead}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleDelete}
        title="Delete Lead"
        description={`Are you sure you want to delete the lead for "${deletingLead?.operatingOfficeName}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
