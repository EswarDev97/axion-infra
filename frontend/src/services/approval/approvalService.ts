/**
 * MindFlow - Approval Service
 * Per API_CONTRACT.md Section 8.8 (Approval Module)
 */

import { get, post, put, del } from '@/services/api/client';
import { getList } from '@/services/api/helpers';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  ApprovalWorkflow,
  ApprovalWorkflowCreateRequest,
  ApprovalWorkflowUpdateRequest,
  ApprovalStep,
  ApprovalStepCreateRequest,
  ApprovalStepUpdateRequest,
  ApprovalInstance,
  ApprovalInstanceCreateRequest,
  ApprovalInstanceFilters,
  ApprovalDecisionRequest,
  DelegateRequest,
  RequestInfoRequest,
  DelegationRule,
  DelegationRuleCreateRequest,
  DelegationRuleUpdateRequest,
  ApprovalPendingItem,
  MyApprovalsSummary,
  ApprovalDashboardStats,
} from './types';

const APPROVAL_BASE = '/approvals';

// ============================================================================
// Approval Workflow Service
// ============================================================================

export const workflowService = {
  async list(entityType?: string): Promise<ApprovalWorkflow[]> {
    return getList<ApprovalWorkflow>(`${APPROVAL_BASE}/workflows`, { entityType });
  },

  async getById(id: string): Promise<ApprovalWorkflow> {
    return get<ApprovalWorkflow>(`${APPROVAL_BASE}/workflows/${id}`);
  },

  async getByEntityType(entityType: string): Promise<ApprovalWorkflow | null> {
    return get<ApprovalWorkflow | null>(`${APPROVAL_BASE}/workflows/entity/${entityType}`);
  },

  async create(data: ApprovalWorkflowCreateRequest): Promise<ApprovalWorkflow> {
    return post<ApprovalWorkflow>(`${APPROVAL_BASE}/workflows`, data);
  },

  async update(id: string, data: ApprovalWorkflowUpdateRequest): Promise<ApprovalWorkflow> {
    return put<ApprovalWorkflow>(`${APPROVAL_BASE}/workflows/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${APPROVAL_BASE}/workflows/${id}`);
  },

  async setDefault(id: string): Promise<ApprovalWorkflow> {
    return post<ApprovalWorkflow>(`${APPROVAL_BASE}/workflows/${id}/set-default`, {});
  },

  // ============================================================================
  // Workflow Steps
  // ============================================================================

  async addStep(workflowId: string, data: ApprovalStepCreateRequest): Promise<ApprovalStep> {
    return post<ApprovalStep>(`${APPROVAL_BASE}/workflows/${workflowId}/steps`, data);
  },

  async updateStep(workflowId: string, stepId: string, data: ApprovalStepUpdateRequest): Promise<ApprovalStep> {
    return put<ApprovalStep>(`${APPROVAL_BASE}/workflows/${workflowId}/steps/${stepId}`, data);
  },

  async deleteStep(workflowId: string, stepId: string): Promise<void> {
    return del<void>(`${APPROVAL_BASE}/workflows/${workflowId}/steps/${stepId}`);
  },

  async reorderSteps(workflowId: string, stepIds: string[]): Promise<ApprovalStep[]> {
    return post<ApprovalStep[]>(`${APPROVAL_BASE}/workflows/${workflowId}/steps/reorder`, { stepIds });
  },
};

// ============================================================================
// Approval Instance Service
// ============================================================================

export const instanceService = {
  async list(params?: PaginationParams & ApprovalInstanceFilters): Promise<PaginatedResponse<ApprovalInstance>> {
    return get<PaginatedResponse<ApprovalInstance>>(`${APPROVAL_BASE}/instances`, params);
  },

  async getById(id: string): Promise<ApprovalInstance> {
    return get<ApprovalInstance>(`${APPROVAL_BASE}/instances/${id}`);
  },

  async getByEntity(entityType: string, entityId: string): Promise<ApprovalInstance | null> {
    return get<ApprovalInstance | null>(`${APPROVAL_BASE}/instances/entity/${entityType}/${entityId}`);
  },

  async create(data: ApprovalInstanceCreateRequest): Promise<ApprovalInstance> {
    return post<ApprovalInstance>(`${APPROVAL_BASE}/instances`, data);
  },

  async cancel(id: string, reason?: string): Promise<ApprovalInstance> {
    return post<ApprovalInstance>(`${APPROVAL_BASE}/instances/${id}/cancel`, { reason });
  },

  // ============================================================================
  // Approval Actions
  // ============================================================================

  async approve(id: string, data?: ApprovalDecisionRequest): Promise<ApprovalInstance> {
    return post<ApprovalInstance>(`${APPROVAL_BASE}/instances/${id}/approve`, data || { decision: 'APPROVED' });
  },

  async reject(id: string, data: ApprovalDecisionRequest): Promise<ApprovalInstance> {
    return post<ApprovalInstance>(`${APPROVAL_BASE}/instances/${id}/reject`, data);
  },

  async delegate(id: string, data: DelegateRequest): Promise<ApprovalInstance> {
    return post<ApprovalInstance>(`${APPROVAL_BASE}/instances/${id}/delegate`, data);
  },

  async requestInfo(id: string, data: RequestInfoRequest): Promise<ApprovalInstance> {
    return post<ApprovalInstance>(`${APPROVAL_BASE}/instances/${id}/request-info`, data);
  },

  async provideInfo(id: string, response: string): Promise<ApprovalInstance> {
    return post<ApprovalInstance>(`${APPROVAL_BASE}/instances/${id}/provide-info`, { response });
  },

  // ============================================================================
  // My Approvals
  // ============================================================================

  async getPendingForMe(params?: PaginationParams): Promise<PaginatedResponse<ApprovalPendingItem>> {
    return get<PaginatedResponse<ApprovalPendingItem>>(`${APPROVAL_BASE}/instances/me/pending`, params);
  },

  async getMyRequests(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<ApprovalInstance>> {
    return get<PaginatedResponse<ApprovalInstance>>(`${APPROVAL_BASE}/instances/me/requests`, params);
  },

  async getMySummary(): Promise<MyApprovalsSummary> {
    return get<MyApprovalsSummary>(`${APPROVAL_BASE}/instances/me/summary`);
  },

  async getMyHistory(params?: PaginationParams): Promise<PaginatedResponse<ApprovalInstance>> {
    return get<PaginatedResponse<ApprovalInstance>>(`${APPROVAL_BASE}/instances/me/history`, params);
  },

  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboardStats(): Promise<ApprovalDashboardStats> {
    return get<ApprovalDashboardStats>(`${APPROVAL_BASE}/dashboard/stats`);
  },
};

// ============================================================================
// Delegation Rule Service
// ============================================================================

export const delegationService = {
  async list(includeInactive?: boolean): Promise<DelegationRule[]> {
    return getList<DelegationRule>(`${APPROVAL_BASE}/delegations`, { includeInactive });
  },

  async getMyDelegations(): Promise<DelegationRule[]> {
    return getList<DelegationRule>(`${APPROVAL_BASE}/delegations/me`);
  },

  async getDelegatedToMe(): Promise<DelegationRule[]> {
    return getList<DelegationRule>(`${APPROVAL_BASE}/delegations/to-me`);
  },

  async getById(id: string): Promise<DelegationRule> {
    return get<DelegationRule>(`${APPROVAL_BASE}/delegations/${id}`);
  },

  async create(data: DelegationRuleCreateRequest): Promise<DelegationRule> {
    return post<DelegationRule>(`${APPROVAL_BASE}/delegations`, data);
  },

  async update(id: string, data: DelegationRuleUpdateRequest): Promise<DelegationRule> {
    return put<DelegationRule>(`${APPROVAL_BASE}/delegations/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${APPROVAL_BASE}/delegations/${id}`);
  },

  async deactivate(id: string): Promise<DelegationRule> {
    return post<DelegationRule>(`${APPROVAL_BASE}/delegations/${id}/deactivate`, {});
  },
};

// ============================================================================
// Combined Approval Module Export
// ============================================================================

export const approvalModule = {
  workflows: workflowService,
  instances: instanceService,
  delegations: delegationService,
};

export default instanceService;
