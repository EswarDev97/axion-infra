/**
 * MindFlow - Complaint List Component
 * Updated per PART 5 — Required list columns:
 * Complaint ID, Channel, Category, Complaint Type, Complainant Name,
 * Insurer/Client, Claim Number, Vehicle Number, Assigned To, Severity,
 * Current Status, Closure TAT (Days), Escalated (Y/N), Escalation Level,
 * Last Update Date, Created Date
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useComplaintStore } from '@/stores/complaintStore';
import type { Complaint, ComplaintFilters, ComplaintSeverity, ComplaintStatus } from '@/services/complaint/types';

interface ComplaintListProps {
  filters?: ComplaintFilters;
  onComplaintClick?: (complaint: Complaint) => void;
}

const severityColors: Record<ComplaintSeverity, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

const statusColors: Record<ComplaintStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  NEW: 'info',
  ASSIGNED: 'neutral',
  IN_PROGRESS: 'warning',
  WAITING_INFO: 'neutral',
  RESOLVED: 'success',
  CLOSED: 'neutral',
  REOPENED: 'error',
};

export function ComplaintList({ filters, onComplaintClick }: ComplaintListProps) {
  const router = useRouter();
  const {
    complaints,
    isLoading,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    fetchComplaints,
  } = useComplaintStore();

  const filtersRef = useRef<string>('');

  useEffect(() => {
    const filtersKey = JSON.stringify(filters || {});
    if (filtersRef.current !== filtersKey) {
      filtersRef.current = filtersKey;
      fetchComplaints({ ...filters, page: 1 });
    }
  }, [filters, fetchComplaints]);

  const handlePageChange = useCallback((page: number) => {
    fetchComplaints({ page });
  }, [fetchComplaints]);

  const handleRowClick = useCallback((complaint: Complaint) => {
    if (onComplaintClick) {
      onComplaintClick(complaint);
    } else {
      router.push(`/dashboard/complaints/${complaint.id}`);
    }
  }, [router, onComplaintClick]);

  const columns: Column<Complaint>[] = [
    {
      key: 'complaintNumber',
      header: 'Complaint ID',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm text-primary-600">{value as string}</span>
      ),
    },
    {
      key: 'sourceChannel',
      header: 'Channel',
      render: (value) => (
        <span className="text-sm">{value as string}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (_, row) => (
        <span className="text-sm">{row.category?.name || '-'}</span>
      ),
    },
    {
      key: 'complaintType',
      header: 'Complaint Type',
      render: (value) => (
        <span className="text-sm text-gray-600">{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'complainantName',
      header: 'Complainant Name',
      render: (value) => (
        <span className="text-sm text-gray-600">{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'insurerClient',
      header: 'Insurer / Client',
      render: (value) => (
        <span className="text-sm text-gray-600">{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'referenceId',
      header: 'Claim Number',
      render: (value) => (
        <span className="text-sm font-mono">{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'vehicleNumber',
      header: 'Vehicle Number',
      render: (value) => (
        <span className="text-sm">{(value as string) || '-'}</span>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assigned To',
      render: (value) => (
        <span className="text-sm text-gray-600">
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (value) => (
        <Badge variant={severityColors[value as ComplaintSeverity]}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Current Status',
      sortable: true,
      render: (value) => (
        <Badge variant={statusColors[value as ComplaintStatus]}>
          {(value as string).replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'closureTatDays',
      header: 'Closure TAT (Days)',
      render: (value) => (
        <span className="text-sm">{value != null ? `${value}` : '-'}</span>
      ),
    },
    {
      key: 'escalatedYN',
      header: 'Escalated',
      render: (_, row) => {
        const yn = row.escalationLevel > 0 ? 'Y' : 'N';
        return (
          <Badge variant={yn === 'Y' ? 'error' : 'neutral'}>{yn}</Badge>
        );
      },
    },
    {
      key: 'escalationLevel',
      header: 'Escalation Level',
      render: (value) => (
        <span className="text-sm">{value as number}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Update Date',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value as string).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const pagination = {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };

  return (
    <DataTable
      columns={columns}
      data={complaints}
      keyField="id"
      loading={isLoading}
      pagination={pagination}
      onPageChange={handlePageChange}
      onRowClick={handleRowClick}
      emptyMessage="No complaints found"
    />
  );
}
