/**
 * MindFlow - Approval Service Types
 * Per API_CONTRACT.md Section 8.8 (Approval Module)
 */

// ============================================================================
// Approval Workflow
// ============================================================================

export type ApproverType = 'REPORTING_MANAGER' | 'ROLE' | 'POSITION' | 'SPECIFIC_USER' | 'DEPARTMENT_HEAD';

export interface ApprovalStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  name: string;
  approverType: ApproverType;
  approverValue?: string | null;
  isOptional: boolean;
  autoApproveAfterHours?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStepCreateRequest {
  stepOrder: number;
  name: string;
  approverType: ApproverType;
  approverValue?: string;
  isOptional?: boolean;
  autoApproveAfterHours?: number;
}

export interface ApprovalStepUpdateRequest {
  stepOrder?: number;
  name?: string;
  approverType?: ApproverType;
  approverValue?: string | null;
  isOptional?: boolean;
  autoApproveAfterHours?: number | null;
}

export interface ApprovalWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  entityType: string; // e.g., 'leave_request', 'expense_report', 'purchase_order'
  isActive: boolean;
  isDefault: boolean;
  steps: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflowCreateRequest {
  name: string;
  description?: string;
  entityType: string;
  isActive?: boolean;
  isDefault?: boolean;
  steps?: ApprovalStepCreateRequest[];
}

export interface ApprovalWorkflowUpdateRequest {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

// ============================================================================
// Approval Instance
// ============================================================================

export type ApprovalInstanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalInstance {
  id: string;
  tenantId: string;
  workflowId: string;
  workflowName?: string;
  entityType: string;
  entityId: string;
  entityTitle?: string | null;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  currentStepId?: string | null;
  currentStepOrder?: number | null;
  currentStepName?: string | null;
  currentApproverId?: string | null;
  currentApproverName?: string | null;
  status: ApprovalInstanceStatus;
  submittedAt: string;
  completedAt?: string | null;
  decisions: ApprovalDecision[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalInstanceCreateRequest {
  workflowId?: string;
  entityType: string;
  entityId: string;
  entityTitle?: string;
}

// ============================================================================
// Approval Decision
// ============================================================================

export type DecisionType = 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'INFO_REQUESTED';

export interface ApprovalDecision {
  id: string;
  instanceId: string;
  stepId: string;
  stepName?: string;
  stepOrder?: number;
  approverId: string;
  approverName?: string;
  decision: DecisionType;
  comments?: string | null;
  delegatedToId?: string | null;
  delegatedToName?: string | null;
  decidedAt: string;
}

export interface ApprovalDecisionRequest {
  decision: 'APPROVED' | 'REJECTED';
  comments?: string;
}

export interface DelegateRequest {
  delegateTo: string;
  comments?: string;
}

export interface RequestInfoRequest {
  message: string;
}

// ============================================================================
// Delegation Rule
// ============================================================================

export interface DelegationRule {
  id: string;
  tenantId: string;
  delegatorId: string;
  delegatorName?: string;
  delegateeId: string;
  delegateeName?: string;
  entityType?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DelegationRuleCreateRequest {
  delegateeId: string;
  entityType?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface DelegationRuleUpdateRequest {
  delegateeId?: string;
  entityType?: string | null;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  reason?: string | null;
}

// ============================================================================
// Filters
// ============================================================================

export interface ApprovalInstanceFilters {
  workflowId?: string;
  entityType?: string;
  status?: ApprovalInstanceStatus;
  requesterId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Dashboard/Summary
// ============================================================================

export interface ApprovalPendingItem {
  instance: ApprovalInstance;
  step: ApprovalStep;
  waitingDays: number;
}

export interface MyApprovalsSummary {
  pendingMyAction: number;
  pendingFromOthers: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
}

export interface ApprovalDashboardStats {
  totalPending: number;
  totalApprovedToday: number;
  totalRejectedToday: number;
  averageApprovalHours: number;
  byEntityType: Record<string, number>;
  byStatus: Record<ApprovalInstanceStatus, number>;
}
