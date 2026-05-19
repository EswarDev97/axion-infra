/**
 * MindFlow - Manage Complaints Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { complaintService } from '@/services/complaint';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { ComplaintStatus, ComplaintSeverity } from '@/services/complaint/types';

const statusColors: Record<ComplaintStatus, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
  NEW: 'info',
  ASSIGNED: 'neutral',
  IN_PROGRESS: 'warning',
  WAITING_INFO: 'neutral',
  RESOLVED: 'success',
  CLOSED: 'neutral',
  REOPENED: 'error',
};

const statusLabels: Record<ComplaintStatus, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_INFO: 'Waiting Info',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
};

const severityColors: Record<ComplaintSeverity, 'neutral' | 'info' | 'warning' | 'error'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

export default function ManageComplaintsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['complaintDashboardStats'],
    queryFn: () => complaintService.getDashboardStats(),
  });

  // Fetch assigned complaints
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignedComplaints', { search, status, severity, page, pageSize }],
    queryFn: () =>
      complaintService.getAssignedToMe({
        search: search || undefined,
        status: status as ComplaintStatus || undefined,
        page,
        pageSize,
      }),
  });

  // Fetch overdue complaints
  const { data: overdueComplaints } = useQuery({
    queryKey: ['overdueComplaints'],
    queryFn: () => complaintService.getOverdueComplaints(),
  });

  if (isLoading) return <LoadingState message="Loading complaints..." />;
  if (error) return <ErrorState message="Failed to load complaints" onRetry={refetch} />;

  const complaints = data?.items || [];
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Manage Complaints</h1>
        <p className="text-gray-600">Handle and resolve assigned complaints</p>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SummaryCard label="Total Open" value={stats.openComplaints} color="blue" />
          <SummaryCard label="In Progress" value={stats.inProgressComplaints} color="yellow" />
          <SummaryCard label="Resolved Today" value={stats.resolvedToday} color="green" />
          <SummaryCard label="Overdue" value={stats.overdueResolution} color="red" />
          <SummaryCard
            label="Avg Resolution"
            value={stats.averageResolutionHours ? `${stats.averageResolutionHours.toFixed(1)}h` : '-'}
          />
          <SummaryCard label="Critical" value={stats.bySeverity?.CRITICAL || 0} color="red" />
        </div>
      )}

      {/* Overdue Alert */}
      {overdueComplaints && overdueComplaints.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">
            {overdueComplaints.length} Overdue Complaint{overdueComplaints.length > 1 ? 's' : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {overdueComplaints.slice(0, 5).map((c) => (
              <Link key={c.id} href={`/dashboard/complaints/${c.id}`}>
                <Badge variant="error">{c.complaintNumber}</Badge>
              </Link>
            ))}
            {overdueComplaints.length > 5 && (
              <span className="text-red-600 text-sm">
                +{overdueComplaints.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search complaints..."
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-48"
        >
          <option value="">All Status</option>
          <option value="NEW">New</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_INFO">Waiting Info</option>
          <option value="REOPENED">Reopened</option>
        </Select>
        <Select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="w-48"
        >
          <option value="">All Severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </Select>
      </div>

      {/* Complaints List */}
      {complaints.length === 0 ? (
        <EmptyState
          title="No complaints assigned"
          description="You have no complaints assigned to you"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Submitted By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Severity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {complaints.map((complaint) => {
                const isOverdue = complaint.isOverdueResolution;
                return (
                  <tr key={complaint.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/complaints/${complaint.id}`}
                        className="font-mono text-sm text-blue-600 hover:text-blue-700"
                      >
                        {complaint.complaintNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{complaint.title}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{complaint.complainantName || complaint.createdBy?.name || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {complaint.category?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={severityColors[complaint.severity]}>
                        {complaint.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[complaint.status]}>
                        {statusLabels[complaint.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {complaint.slaResolutionDueAt
                          ? new Date(complaint.slaResolutionDueAt).toLocaleDateString()
                          : '-'}
                      </span>
                      {isOverdue && <span className="ml-1 text-red-600 text-xs">OVERDUE</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/complaints/${complaint.id}`}>
                        <Button variant="outline" size="sm">
                          Handle
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: number | string;
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
