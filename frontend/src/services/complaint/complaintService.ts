/**
 * MindFlow - Complaint Service
 * Per API_CONTRACT.md Section 8.7 (Complaint Module)
 * ALIGNED WITH BACKEND API ENDPOINTS
 */

import { get, post, put, del } from '@/services/api/client';
import { getList, getPaginatedList } from '@/services/api/helpers';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  ComplaintCategory,
  ComplaintCategoryCreateRequest,
  ComplaintCategoryUpdateRequest,
  SLAConfiguration,
  SLAConfigurationCreateRequest,
  SLAConfigurationUpdateRequest,
  EscalationRule,
  EscalationRuleCreateRequest,
  EscalationRuleUpdateRequest,
  Complaint,
  ComplaintCreateRequest,
  ComplaintUpdateRequest,
  ComplaintAssignRequest,
  ComplaintEscalateRequest,
  ComplaintResolveRequest,
  ComplaintCloseRequest,
  ComplaintReopenRequest,
  ComplaintFilters,
  ComplaintAction,
  ComplaintActionCreateRequest,
  ComplaintAttachment,
  ComplaintAttachmentCreateRequest,
  ComplaintDashboardStats,
  MyComplaintsSummary,
  SLAComplianceReport,
  ComplaintTrendReport,
  AgingReport,
  AssignableUser,
  DepartmentReport,
  SeverityReport,
  EscalationReportItem,
  MonthlySummary,
  DailyReportItem,
} from './types';

const COMPLAINT_BASE = '/complaints';

// ============================================================================
// Complaint Category Service
// ============================================================================

export const complaintCategoryService = {
  async list(params?: { isActive?: boolean; parentCategoryId?: string }): Promise<ComplaintCategory[]> {
    return getList<ComplaintCategory>(`${COMPLAINT_BASE}/categories`, params);
  },

  async listPaginated(params?: PaginationParams & { isActive?: boolean; parentCategoryId?: string }): Promise<PaginatedResponse<ComplaintCategory>> {
    return getPaginatedList<ComplaintCategory>(`${COMPLAINT_BASE}/categories`, params);
  },

  async getById(id: string): Promise<ComplaintCategory> {
    return get<ComplaintCategory>(`${COMPLAINT_BASE}/categories/${id}`);
  },

  async create(data: ComplaintCategoryCreateRequest): Promise<ComplaintCategory> {
    return post<ComplaintCategory>(`${COMPLAINT_BASE}/categories`, data);
  },

  async update(id: string, data: ComplaintCategoryUpdateRequest): Promise<ComplaintCategory> {
    return put<ComplaintCategory>(`${COMPLAINT_BASE}/categories/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${COMPLAINT_BASE}/categories/${id}`);
  },
};

// ============================================================================
// SLA Configuration Service
// ============================================================================

export const slaService = {
  async list(params?: { categoryId?: string; severity?: string; isActive?: boolean }): Promise<SLAConfiguration[]> {
    return getList<SLAConfiguration>(`${COMPLAINT_BASE}/sla`, params);
  },

  async listPaginated(params?: PaginationParams & { categoryId?: string; severity?: string; isActive?: boolean }): Promise<PaginatedResponse<SLAConfiguration>> {
    return getPaginatedList<SLAConfiguration>(`${COMPLAINT_BASE}/sla`, params);
  },

  async getById(id: string): Promise<SLAConfiguration> {
    return get<SLAConfiguration>(`${COMPLAINT_BASE}/sla/${id}`);
  },

  async create(data: SLAConfigurationCreateRequest): Promise<SLAConfiguration> {
    return post<SLAConfiguration>(`${COMPLAINT_BASE}/sla`, data);
  },

  async update(id: string, data: SLAConfigurationUpdateRequest): Promise<SLAConfiguration> {
    return put<SLAConfiguration>(`${COMPLAINT_BASE}/sla/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${COMPLAINT_BASE}/sla/${id}`);
  },
};

// ============================================================================
// Escalation Rule Service
// ============================================================================

export const escalationService = {
  async list(params?: { categoryId?: string; isActive?: boolean }): Promise<EscalationRule[]> {
    return getList<EscalationRule>(`${COMPLAINT_BASE}/escalation-rules`, params);
  },

  async listPaginated(params?: PaginationParams & { categoryId?: string; isActive?: boolean }): Promise<PaginatedResponse<EscalationRule>> {
    return getPaginatedList<EscalationRule>(`${COMPLAINT_BASE}/escalation-rules`, params);
  },

  async getById(id: string): Promise<EscalationRule> {
    return get<EscalationRule>(`${COMPLAINT_BASE}/escalation-rules/${id}`);
  },

  async create(data: EscalationRuleCreateRequest): Promise<EscalationRule> {
    return post<EscalationRule>(`${COMPLAINT_BASE}/escalation-rules`, data);
  },

  async update(id: string, data: EscalationRuleUpdateRequest): Promise<EscalationRule> {
    return put<EscalationRule>(`${COMPLAINT_BASE}/escalation-rules/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${COMPLAINT_BASE}/escalation-rules/${id}`);
  },
};

// ============================================================================
// Complaint Service
// ============================================================================

export const complaintService = {
  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async list(params?: PaginationParams & ComplaintFilters): Promise<PaginatedResponse<Complaint>> {
    return getPaginatedList<Complaint>(COMPLAINT_BASE, params);
  },

  async getById(id: string): Promise<Complaint> {
    return get<Complaint>(`${COMPLAINT_BASE}/${id}`);
  },

  async create(data: ComplaintCreateRequest): Promise<Complaint> {
    return post<Complaint>(COMPLAINT_BASE, data);
  },

  async update(id: string, data: ComplaintUpdateRequest): Promise<Complaint> {
    return put<Complaint>(`${COMPLAINT_BASE}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${COMPLAINT_BASE}/${id}`);
  },

  // ============================================================================
  // Complaint Workflow Actions (State Transitions)
  // ============================================================================

  /** Assign complaint to an employee (NEW/REOPENED -> ASSIGNED) */
  async assign(id: string, data: ComplaintAssignRequest): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/assign`, data);
  },

  /** Start working on complaint (ASSIGNED -> IN_PROGRESS) */
  async startProgress(id: string): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/start-progress`, {});
  },

  /** Request more information (IN_PROGRESS -> WAITING_INFO) */
  async requestInfo(id: string, message: string): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/request-info`, { message });
  },

  /** Provide information (WAITING_INFO -> IN_PROGRESS) */
  async provideInfo(id: string, response: string): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/provide-info`, { response });
  },

  /** Escalate complaint */
  async escalate(id: string, data: ComplaintEscalateRequest): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/escalate`, data);
  },

  /** Resolve complaint (IN_PROGRESS/WAITING_INFO/ASSIGNED -> RESOLVED) */
  async resolve(id: string, data: ComplaintResolveRequest): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/resolve`, data);
  },

  /** Close complaint (RESOLVED -> CLOSED) */
  async close(id: string, data: ComplaintCloseRequest): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/close`, data);
  },

  /** Reopen complaint (RESOLVED/CLOSED -> REOPENED) */
  async reopen(id: string, data: ComplaintReopenRequest): Promise<Complaint> {
    return post<Complaint>(`${COMPLAINT_BASE}/${id}/reopen`, data);
  },

  // ============================================================================
  // My Complaints
  // ============================================================================

  /** Get complaints created by current user */
  async getMyComplaints(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<Complaint>> {
    return getPaginatedList<Complaint>(`${COMPLAINT_BASE}/my-complaints`, params);
  },

  /** Get summary of user's complaints */
  async getMyComplaintsSummary(): Promise<MyComplaintsSummary> {
    return get<MyComplaintsSummary>(`${COMPLAINT_BASE}/my-complaints/summary`);
  },

  /** Get complaints assigned to current user */
  async getAssignedToMe(params?: PaginationParams & { status?: string; search?: string }): Promise<PaginatedResponse<Complaint>> {
    return getPaginatedList<Complaint>(`${COMPLAINT_BASE}/assigned-to-me`, params);
  },

  // ============================================================================
  // Dashboard & Statistics
  // ============================================================================

  async getDashboardStats(): Promise<ComplaintDashboardStats> {
    return get<ComplaintDashboardStats>(`${COMPLAINT_BASE}/dashboard/stats`);
  },

  async getOverdueComplaints(): Promise<Complaint[]> {
    return getList<Complaint>(`${COMPLAINT_BASE}/dashboard/overdue`);
  },

  // ============================================================================
  // Assignable Users (Role-Based)
  // ============================================================================

  async getAssignableUsers(): Promise<AssignableUser[]> {
    return get<AssignableUser[]>(`${COMPLAINT_BASE}/assignable-users`);
  },

  // ============================================================================
  // Reports
  // ============================================================================

  async getSLAComplianceReport(params?: { fromDate?: string; toDate?: string }): Promise<SLAComplianceReport[]> {
    return get<SLAComplianceReport[]>(`${COMPLAINT_BASE}/reports/sla-compliance`, params);
  },

  async getComplaintsByCategory(params?: { fromDate?: string; toDate?: string }): Promise<ComplaintTrendReport[]> {
    return get<ComplaintTrendReport[]>(`${COMPLAINT_BASE}/reports/by-category`, params);
  },

  async getAgingReport(): Promise<AgingReport[]> {
    return get<AgingReport[]>(`${COMPLAINT_BASE}/reports/aging`);
  },

  async getDepartmentReport(params?: { fromDate?: string; toDate?: string }): Promise<DepartmentReport[]> {
    return get<DepartmentReport[]>(`${COMPLAINT_BASE}/reports/department`, params);
  },

  async getSeverityReport(params?: { fromDate?: string; toDate?: string }): Promise<SeverityReport[]> {
    return get<SeverityReport[]>(`${COMPLAINT_BASE}/reports/severity`, params);
  },

  async getEscalationReport(params?: { fromDate?: string; toDate?: string }): Promise<EscalationReportItem[]> {
    return get<EscalationReportItem[]>(`${COMPLAINT_BASE}/reports/escalation`, params);
  },

  async getDailyReport(params?: { reportDate?: string }): Promise<DailyReportItem[]> {
    return get<DailyReportItem[]>(`${COMPLAINT_BASE}/reports/daily`, params);
  },

  async getMonthlySummary(params?: { fromDate?: string; toDate?: string }): Promise<MonthlySummary> {
    return get<MonthlySummary>(`${COMPLAINT_BASE}/reports/monthly-summary`, params);
  },

  // ============================================================================
  // Auto-Escalation
  // ============================================================================

  async runAutoEscalation(): Promise<{ escalatedCount: number }> {
    return post<{ escalatedCount: number }>(`${COMPLAINT_BASE}/escalation/run`, {});
  },

  // ============================================================================
  // Complaint Actions (History/Comments)
  // ============================================================================

  async getActions(complaintId: string): Promise<ComplaintAction[]> {
    return getList<ComplaintAction>(`${COMPLAINT_BASE}/${complaintId}/actions`);
  },

  async addAction(complaintId: string, data: ComplaintActionCreateRequest): Promise<ComplaintAction> {
    return post<ComplaintAction>(`${COMPLAINT_BASE}/${complaintId}/actions`, data);
  },

  /** Convenience method to add a comment */
  async addComment(complaintId: string, content: string, isInternal: boolean = true): Promise<ComplaintAction> {
    return this.addAction(complaintId, {
      actionType: 'COMMENT',
      description: content,
      isInternal,
    });
  },

  // ============================================================================
  // Complaint Attachments
  // ============================================================================

  async getAttachments(complaintId: string): Promise<ComplaintAttachment[]> {
    return getList<ComplaintAttachment>(`${COMPLAINT_BASE}/${complaintId}/attachments`);
  },

  async addAttachment(complaintId: string, data: ComplaintAttachmentCreateRequest): Promise<ComplaintAttachment> {
    return post<ComplaintAttachment>(`${COMPLAINT_BASE}/${complaintId}/attachments`, data);
  },

  async deleteAttachment(complaintId: string, attachmentId: string): Promise<void> {
    return del<void>(`${COMPLAINT_BASE}/${complaintId}/attachments/${attachmentId}`);
  },
};

// ============================================================================
// Combined Complaint Module Export
// ============================================================================

export const complaintModule = {
  categories: complaintCategoryService,
  sla: slaService,
  escalation: escalationService,
  complaints: complaintService,
};

export default complaintService;
