/**
 * MindFlow - Leave Request List Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/data/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/feedback/Alert';
import { leaveRequestService, type LeaveRequest } from '@/services/hr';
import type { PaginationMeta } from '@/services/api/types';
import { Check, X } from 'lucide-react';

interface LeaveRequestListProps {
  mode?: 'all' | 'pending' | 'my';
  employeeId?: string;
}

const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral',
};

export function LeaveRequestList({ mode = 'all', employeeId }: LeaveRequestListProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    request: LeaveRequest | null;
    action: 'APPROVED' | 'REJECTED';
  }>({ isOpen: false, request: null, action: 'APPROVED' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let response;
      if (mode === 'my') {
        const myRequests = await leaveRequestService.getMyRequests();
        setRequests(myRequests);
        setPagination(null);
      } else if (mode === 'pending') {
        const pendingRequests = await leaveRequestService.getPending();
        setRequests(pendingRequests);
        setPagination(null);
      } else {
        response = await leaveRequestService.list({
          page: currentPage,
          pageSize: 20,
          employeeId,
        });
        setRequests(response.items);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    } finally {
      setLoading(false);
    }
  }, [mode, currentPage, employeeId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprovalAction = (request: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    setApprovalModal({ isOpen: true, request, action });
    setRejectionReason('');
    setError(null);
  };

  const handleSubmitApproval = async () => {
    if (!approvalModal.request) return;

    if (approvalModal.action === 'REJECTED' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      await leaveRequestService.approve(approvalModal.request.id, {
        status: approvalModal.action,
        rejectionReason: approvalModal.action === 'REJECTED' ? rejectionReason : undefined,
      });
      setApprovalModal({ isOpen: false, request: null, action: 'APPROVED' });
      fetchRequests();
    } catch (err) {
      setError((err as Error).message || 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (value) => <span className="font-medium">{value as string}</span>,
    },
    {
      key: 'leaveTypeName',
      header: 'Leave Type',
    },
    {
      key: 'dateRange',
      header: 'Date Range',
      render: (_, row) => (
        <span>
          {new Date(row.startDate).toLocaleDateString()} -{' '}
          {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'totalDays',
      header: 'Days',
      align: 'center',
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (value) => (
        <span className="text-sm text-gray-600 truncate max-w-[200px] block">
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <Badge variant={statusColors[value as string] || 'neutral'}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
  ];

  // Add action column for pending requests
  if (mode === 'pending' || mode === 'all') {
    columns.push({
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => {
        if (row.status !== 'PENDING') return null;
        return (
          <div className="flex gap-1 justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleApprovalAction(row, 'APPROVED');
              }}
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleApprovalAction(row, 'REJECTED');
              }}
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={requests}
        keyField="id"
        loading={loading}
        pagination={pagination || undefined}
        onPageChange={setCurrentPage}
        emptyMessage="No leave requests found"
      />

      {/* Approval Modal */}
      <Modal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, request: null, action: 'APPROVED' })}
        title={approvalModal.action === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
        size="md"
      >
        {error && (
          <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {approvalModal.request && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Employee:</span>
                  <p className="font-medium">{approvalModal.request.employeeName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Leave Type:</span>
                  <p className="font-medium">{approvalModal.request.leaveTypeName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <p className="font-medium">
                    {new Date(approvalModal.request.startDate).toLocaleDateString()} -{' '}
                    {new Date(approvalModal.request.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Days:</span>
                  <p className="font-medium">{approvalModal.request.totalDays}</p>
                </div>
              </div>
              {approvalModal.request.reason && (
                <div className="mt-4">
                  <span className="text-gray-500 text-sm">Reason:</span>
                  <p className="text-sm mt-1">{approvalModal.request.reason}</p>
                </div>
              )}
            </div>

            {approvalModal.action === 'REJECTED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setApprovalModal({ isOpen: false, request: null, action: 'APPROVED' })}
          >
            Cancel
          </Button>
          <Button
            variant={approvalModal.action === 'APPROVED' ? 'primary' : 'danger'}
            onClick={handleSubmitApproval}
            loading={submitting}
          >
            {approvalModal.action === 'APPROVED' ? 'Approve' : 'Reject'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
