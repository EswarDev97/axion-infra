/**
 * MindFlow - Complaint Detail Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  Edit,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  ArrowUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { FormField } from '@/components/form/FormField';
import { useComplaintStore } from '@/stores/complaintStore';
import type {
  Complaint,
  ComplaintSeverity,
  ComplaintStatus,
  ComplaintAction,
} from '@/services/complaint/types';

interface ComplaintDetailProps {
  complaint: Complaint;
  onEdit?: () => void;
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

export function ComplaintDetail({ complaint, onEdit }: ComplaintDetailProps) {
  const router = useRouter();
  const {
    complaintActions,
    complaintAttachments,
    assignableUsers,
    fetchActions,
    fetchAttachments,
    fetchAssignableUsers,
    deleteComplaint,
    assignComplaint,
    startProgress,
    requestInfo,
    provideInfo,
    escalateComplaint,
    resolveComplaint,
    closeComplaint,
    reopenComplaint,
    addAction,
  } = useComplaintStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Workflow modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false);
  const [showProvideInfoModal, setShowProvideInfoModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  // Form states
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  // Closure fields per PART 4 — Reason for Complaint + Corrective Action required
  const [closureReasonForComplaint, setClosureReasonForComplaint] = useState('');
  const [closureCorrectiveAction, setClosureCorrectiveAction] = useState('');
  const [closureRemarks, setClosureRemarks] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [newComment, setNewComment] = useState('');
  // Working stage fields per PART 3
  const [workingExpectedDate, setWorkingExpectedDate] = useState('');
  const [workingRemarks, setWorkingRemarks] = useState('');
  const [showWorkingModal, setShowWorkingModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchActions(complaint.id);
    fetchAttachments(complaint.id);
    fetchAssignableUsers();
  }, [complaint.id, fetchActions, fetchAttachments, fetchAssignableUsers]);

  const handleDelete = async () => {
    setDeleting(true);
    const success = await deleteComplaint(complaint.id);
    if (success) {
      router.push('/dashboard/complaints');
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  // Workflow handlers
  const handleAssign = async () => {
    if (!assignEmployeeId) return;
    setActionLoading(true);
    await assignComplaint(complaint.id, { ownerEmployeeId: assignEmployeeId, notes: assignNotes || undefined });
    setShowAssignModal(false);
    setAssignEmployeeId('');
    setAssignNotes('');
    setActionLoading(false);
  };

  const handleStartProgress = async () => {
    setActionLoading(true);
    await startProgress(complaint.id);
    setActionLoading(false);
  };

  const handleRequestInfo = async () => {
    if (!infoMessage) return;
    setActionLoading(true);
    await requestInfo(complaint.id, infoMessage);
    setShowRequestInfoModal(false);
    setInfoMessage('');
    setActionLoading(false);
  };

  const handleProvideInfo = async () => {
    if (!infoMessage) return;
    setActionLoading(true);
    await provideInfo(complaint.id, infoMessage);
    setShowProvideInfoModal(false);
    setInfoMessage('');
    setActionLoading(false);
  };

  const handleEscalate = async () => {
    if (!escalateReason) return;
    setActionLoading(true);
    await escalateComplaint(complaint.id, { reason: escalateReason });
    setShowEscalateModal(false);
    setEscalateReason('');
    setActionLoading(false);
  };

  const handleResolve = async () => {
    if (!resolutionNotes) return;
    setActionLoading(true);
    await resolveComplaint(complaint.id, { resolutionNotes });
    setShowResolveModal(false);
    setResolutionNotes('');
    setActionLoading(false);
  };

  const handleClose = async () => {
    if (!closureReasonForComplaint || !closureCorrectiveAction) return;
    setActionLoading(true);
    await closeComplaint(complaint.id, {
      reasonForComplaint: closureReasonForComplaint,
      correctiveAction: closureCorrectiveAction,
      closureRemarks: closureRemarks || undefined,
    });
    setShowCloseModal(false);
    setClosureReasonForComplaint('');
    setClosureCorrectiveAction('');
    setClosureRemarks('');
    setActionLoading(false);
  };

  const handleWorkingUpdate = async () => {
    setActionLoading(true);
    const updateData: Record<string, string | undefined> = {};
    if (workingExpectedDate) updateData.expectedClosureDate = workingExpectedDate;
    if (workingRemarks) updateData.closureRemarks = workingRemarks;
    // updateComplaint imported from store
    const { updateComplaint: storeUpdate } = useComplaintStore.getState();
    await storeUpdate(complaint.id, updateData);
    setShowWorkingModal(false);
    setWorkingExpectedDate('');
    setWorkingRemarks('');
    setActionLoading(false);
  };

  const handleReopen = async () => {
    if (!reopenReason) return;
    setActionLoading(true);
    await reopenComplaint(complaint.id, { reason: reopenReason });
    setShowReopenModal(false);
    setReopenReason('');
    setActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setActionLoading(true);
    await addAction(complaint.id, { description: newComment, actionType: 'COMMENT', isInternal: true });
    setNewComment('');
    setActionLoading(false);
  };

  // Determine available actions based on status
  const getAvailableActions = () => {
    const actions: React.ReactNode[] = [];
    const status = complaint.status;

    if (status === 'NEW' || status === 'REOPENED') {
      actions.push(
        <Button key="assign" onClick={() => setShowAssignModal(true)}>
          <User className="h-4 w-4 mr-2" />
          Assign
        </Button>
      );
    }

    if (status === 'ASSIGNED') {
      actions.push(
        <Button key="start" onClick={handleStartProgress} loading={actionLoading}>
          <Play className="h-4 w-4 mr-2" />
          Start Progress
        </Button>
      );
    }

    if (status === 'IN_PROGRESS') {
      actions.push(
        <Button key="update-working" variant="outline" onClick={() => setShowWorkingModal(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Update Working
        </Button>,
        <Button key="request-info" variant="outline" onClick={() => setShowRequestInfoModal(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Request Info
        </Button>
      );
    }

    if (status === 'ASSIGNED') {
      actions.push(
        <Button key="update-working" variant="outline" onClick={() => setShowWorkingModal(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Update Working
        </Button>
      );
    }

    if (status === 'WAITING_INFO') {
      actions.push(
        <Button key="provide-info" onClick={() => setShowProvideInfoModal(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Provide Info
        </Button>
      );
    }

    if (['ASSIGNED', 'IN_PROGRESS', 'WAITING_INFO'].includes(status)) {
      actions.push(
        <Button key="escalate" variant="outline" onClick={() => setShowEscalateModal(true)}>
          <ArrowUp className="h-4 w-4 mr-2" />
          Escalate
        </Button>,
        <Button key="resolve" variant="primary" onClick={() => setShowResolveModal(true)}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Resolve
        </Button>,
        <Button key="close" variant="outline" onClick={() => setShowCloseModal(true)}>
          <XCircle className="h-4 w-4 mr-2" />
          Close
        </Button>
      );
    }

    if (status === 'RESOLVED') {
      actions.push(
        <Button key="close" variant="primary" onClick={() => setShowCloseModal(true)}>
          <XCircle className="h-4 w-4 mr-2" />
          Close
        </Button>,
        <Button key="reopen" variant="outline" onClick={() => setShowReopenModal(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reopen
        </Button>
      );
    }

    if (status === 'CLOSED') {
      actions.push(
        <Button key="reopen" variant="outline" onClick={() => setShowReopenModal(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reopen
        </Button>
      );
    }

    return actions;
  };

  const InfoRow = ({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="text-sm font-medium text-gray-900">{children}</div>
      </div>
    </div>
  );

  const formatActionType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-500 font-mono">
                {complaint.complaintNumber}
              </span>
              <Badge variant={statusColors[complaint.status]}>
                {complaint.status.replace('_', ' ')}
              </Badge>
              <Badge variant={severityColors[complaint.severity]}>
                {complaint.severity}
              </Badge>
              {complaint.isOverdueResolution && (
                <Badge variant="error">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{complaint.title}</h1>
            {complaint.description && (
              <p className="text-gray-600 whitespace-pre-wrap">{complaint.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Workflow Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          {getAvailableActions()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* SLA Status */}
          {complaint.sla && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                SLA Status
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${complaint.isOverdueResponse ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-sm text-gray-500">Response Due</p>
                  <p className={`font-medium ${complaint.isOverdueResponse ? 'text-red-600' : ''}`}>
                    {complaint.slaResponseDueAt
                      ? new Date(complaint.slaResponseDueAt).toLocaleString()
                      : '-'}
                  </p>
                  {complaint.respondedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Responded: {new Date(complaint.respondedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className={`p-4 rounded-lg ${complaint.isOverdueResolution ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-sm text-gray-500">Resolution Due</p>
                  <p className={`font-medium ${complaint.isOverdueResolution ? 'text-red-600' : ''}`}>
                    {complaint.slaResolutionDueAt
                      ? new Date(complaint.slaResolutionDueAt).toLocaleString()
                      : '-'}
                  </p>
                  {complaint.resolvedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Resolved: {new Date(complaint.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">Escalation Level</p>
                  <p className="font-medium">{complaint.escalationLevel}</p>
                  {complaint.lastEscalatedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last: {new Date(complaint.lastEscalatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action History */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Activity History ({complaintActions.length})
            </h2>

            {/* Add Comment */}
            <div className="mb-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  loading={actionLoading}
                  disabled={!newComment.trim()}
                >
                  Add Comment
                </Button>
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-4">
              {complaintActions.map((action) => (
                <div key={action.id} className="flex gap-3 border-l-2 border-gray-200 pl-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">
                        {formatActionType(action.actionType)}
                      </span>
                      {action.performedBy && (
                        <span className="text-sm text-gray-600">
                          by {action.performedBy.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(action.performedAt).toLocaleString()}
                      </span>
                      {action.isInternal && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">
                          Internal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{action.description}</p>
                    {action.oldStatus && action.newStatus && (
                      <p className="text-xs text-gray-500 mt-1">
                        Status: {action.oldStatus} → {action.newStatus}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {complaintActions.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No activity yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <div className="divide-y">
              <InfoRow icon={User} label="Display Status">
                <Badge variant={
                  complaint.displayStatus === 'Open' ? 'info' :
                  complaint.displayStatus === 'Working' ? 'warning' : 'success'
                }>
                  {complaint.displayStatus}
                </Badge>
              </InfoRow>
              <InfoRow icon={User} label="Category">
                {complaint.category?.name || '-'}
              </InfoRow>
              <InfoRow icon={User} label="Source Channel">
                {complaint.sourceChannel.replace('_', ' ')}
              </InfoRow>
              <InfoRow icon={User} label="Complainant Type">
                {complaint.complainantType || '-'}
              </InfoRow>
              <InfoRow icon={User} label="Complainant">
                {complaint.complainantName || complaint.createdBy?.name || '-'}
              </InfoRow>
              {complaint.complainantContact && (
                <InfoRow icon={User} label="Contact Number">
                  {complaint.complainantContact}
                </InfoRow>
              )}
              {complaint.insurerClient && (
                <InfoRow icon={User} label="Insurer / Client">
                  {complaint.insurerClient}
                </InfoRow>
              )}
              {complaint.vehicleNumber && (
                <InfoRow icon={User} label="Vehicle Number">
                  {complaint.vehicleNumber}
                </InfoRow>
              )}
              {complaint.workshopName && (
                <InfoRow icon={User} label="Workshop Name">
                  {complaint.workshopName}
                </InfoRow>
              )}
              {complaint.referenceId && (
                <InfoRow icon={User} label="Claim Number">
                  {complaint.referenceId}
                </InfoRow>
              )}
              <InfoRow icon={User} label="Created By">
                {complaint.createdBy?.name || '-'}
              </InfoRow>
              <InfoRow icon={Calendar} label="Date Time Received">
                {new Date(complaint.createdAt).toLocaleString()}
              </InfoRow>
              {complaint.assignedAt && (
                <InfoRow icon={Calendar} label="Assigned On">
                  {new Date(complaint.assignedAt).toLocaleString()}
                </InfoRow>
              )}
              {complaint.expectedClosureDate && (
                <InfoRow icon={Calendar} label="Expected Closure Date">
                  {new Date(complaint.expectedClosureDate).toLocaleDateString()}
                </InfoRow>
              )}
              {complaint.closedAt && (
                <InfoRow icon={Calendar} label="Closed On">
                  {new Date(complaint.closedAt).toLocaleString()}
                </InfoRow>
              )}
              {complaint.closureTatHours != null && (
                <InfoRow icon={Clock} label="Closure TAT">
                  {Number(complaint.closureTatHours).toFixed(1)} hours
                </InfoRow>
              )}
              <InfoRow icon={RefreshCw} label="Reopened Count">
                {complaint.reopenedCount}
              </InfoRow>
              {complaint.isEscalated && (
                <InfoRow icon={ArrowUp} label="Escalation">
                  Level {complaint.escalationLevel}
                </InfoRow>
              )}
            </div>
          </div>

          {/* Reason for Complaint */}
          {complaint.reasonForComplaint && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Reason for Complaint</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{complaint.reasonForComplaint}</p>
            </div>
          )}

          {/* Corrective Action */}
          {complaint.correctiveAction && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Corrective Action</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{complaint.correctiveAction}</p>
            </div>
          )}

          {/* Closure Remarks / Action Taken */}
          {complaint.closureRemarks && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Action Taken / Remarks</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{complaint.closureRemarks}</p>
            </div>
          )}

          {/* Attachments */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Paperclip className="h-5 w-5" />
              Attachments ({complaintAttachments.length})
            </h2>
            <div className="space-y-2">
              {complaintAttachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                  <span className="text-sm truncate flex-1">{attachment.fileId}</span>
                  <span className="text-xs text-gray-500">{attachment.attachmentType}</span>
                </div>
              ))}
              {complaintAttachments.length === 0 && (
                <p className="text-sm text-gray-500">No attachments</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Complaint"
        description={`Are you sure you want to delete "${complaint.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Complaint"
      >
        <div className="space-y-4">
          <FormField label="Assign To" required>
            <Select
              value={assignEmployeeId}
              onChange={(e) => setAssignEmployeeId(e.target.value)}
            >
              <option value="">Select Employee</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.employeeCode}){user.department ? ` - ${user.department}` : ''}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Add assignment notes..."
              rows={2}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} loading={actionLoading} disabled={!assignEmployeeId}>
              Assign
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Request Info Modal */}
      <Modal
        isOpen={showRequestInfoModal}
        onClose={() => setShowRequestInfoModal(false)}
        title="Request Information"
      >
        <div className="space-y-4">
          <FormField label="Message" required>
            <Textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="What information do you need?"
              rows={3}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowRequestInfoModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestInfo} loading={actionLoading} disabled={!infoMessage}>
              Send Request
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Provide Info Modal */}
      <Modal
        isOpen={showProvideInfoModal}
        onClose={() => setShowProvideInfoModal(false)}
        title="Provide Information"
      >
        <div className="space-y-4">
          <FormField label="Response" required>
            <Textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="Provide the requested information..."
              rows={3}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowProvideInfoModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleProvideInfo} loading={actionLoading} disabled={!infoMessage}>
              Submit
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Escalate Modal */}
      <Modal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        title="Escalate Complaint"
      >
        <div className="space-y-4">
          <FormField label="Reason for Escalation" required>
            <Textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="Why is this complaint being escalated?"
              rows={3}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEscalateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEscalate} loading={actionLoading} disabled={!escalateReason}>
              Escalate
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve Complaint"
      >
        <div className="space-y-4">
          <FormField label="Resolution Notes" required>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe how the complaint was resolved..."
              rows={4}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowResolveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleResolve} loading={actionLoading} disabled={!resolutionNotes}>
              Mark Resolved
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Close Modal — Requires Reason for Complaint + Corrective Action per PART 4 */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Close Complaint"
      >
        <div className="space-y-4">
          <FormField label="Reason for Complaint" required>
            <Textarea
              value={closureReasonForComplaint}
              onChange={(e) => setClosureReasonForComplaint(e.target.value)}
              placeholder="Enter the reason for this complaint..."
              rows={3}
            />
          </FormField>
          <FormField label="Corrective Action" required>
            <Textarea
              value={closureCorrectiveAction}
              onChange={(e) => setClosureCorrectiveAction(e.target.value)}
              placeholder="Describe the corrective action taken..."
              rows={3}
            />
          </FormField>
          <FormField label="Additional Remarks">
            <Textarea
              value={closureRemarks}
              onChange={(e) => setClosureRemarks(e.target.value)}
              placeholder="Optional final remarks..."
              rows={2}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleClose}
              loading={actionLoading}
              disabled={!closureReasonForComplaint || !closureCorrectiveAction}
            >
              Close Complaint
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Working Stage Modal — Update expected closure date and action taken */}
      <Modal
        isOpen={showWorkingModal}
        onClose={() => setShowWorkingModal(false)}
        title="Update Working Status"
      >
        <div className="space-y-4">
          <FormField label="Expected Closure Date">
            <Input
              type="date"
              value={workingExpectedDate}
              onChange={(e) => setWorkingExpectedDate(e.target.value)}
            />
          </FormField>
          <FormField label="Action Taken / Remarks">
            <Textarea
              value={workingRemarks}
              onChange={(e) => setWorkingRemarks(e.target.value)}
              placeholder="Describe the action taken or update remarks..."
              rows={3}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowWorkingModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWorkingUpdate}
              loading={actionLoading}
              disabled={!workingExpectedDate && !workingRemarks}
            >
              Update
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Reopen Modal */}
      <Modal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        title="Reopen Complaint"
      >
        <div className="space-y-4">
          <FormField label="Reason for Reopening" required>
            <Textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Why is this complaint being reopened?"
              rows={3}
            />
          </FormField>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowReopenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReopen} loading={actionLoading} disabled={!reopenReason}>
              Reopen
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
