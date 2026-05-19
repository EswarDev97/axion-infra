/**
 * MindFlow - Complaint React Query Hooks
 * Per FRONTEND_ARCHITECTURE.md Section 6
 * React Query hooks for complaint data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  complaintService,
  complaintCategoryService,
  slaService,
  escalationService,
} from '@/services/complaint/complaintService';
import type {
  Complaint,
  ComplaintCreateRequest,
  ComplaintUpdateRequest,
  ComplaintAssignRequest,
  ComplaintEscalateRequest,
  ComplaintResolveRequest,
  ComplaintCloseRequest,
  ComplaintReopenRequest,
  ComplaintFilters,
  ComplaintActionCreateRequest,
  ComplaintAttachmentCreateRequest,
  ComplaintCategoryCreateRequest,
  ComplaintCategoryUpdateRequest,
  SLAConfigurationCreateRequest,
  SLAConfigurationUpdateRequest,
  EscalationRuleCreateRequest,
  EscalationRuleUpdateRequest,
} from '@/services/complaint/types';
import type { PaginationParams } from '@/services/api/types';

// Query Keys
export const complaintKeys = {
  all: ['complaints'] as const,
  lists: () => [...complaintKeys.all, 'list'] as const,
  list: (filters: ComplaintFilters & PaginationParams) => [...complaintKeys.lists(), filters] as const,
  details: () => [...complaintKeys.all, 'detail'] as const,
  detail: (id: string) => [...complaintKeys.details(), id] as const,
  myComplaints: () => [...complaintKeys.all, 'my-complaints'] as const,
  assignedToMe: () => [...complaintKeys.all, 'assigned-to-me'] as const,
  dashboardStats: () => [...complaintKeys.all, 'dashboard-stats'] as const,
  overdue: () => [...complaintKeys.all, 'overdue'] as const,
  actions: (complaintId: string) => [...complaintKeys.detail(complaintId), 'actions'] as const,
  attachments: (complaintId: string) => [...complaintKeys.detail(complaintId), 'attachments'] as const,
  categories: () => ['complaint-categories'] as const,
  slaConfigs: () => ['sla-configs'] as const,
  escalationRules: () => ['escalation-rules'] as const,
  reports: {
    slaCompliance: () => [...complaintKeys.all, 'reports', 'sla-compliance'] as const,
    aging: () => [...complaintKeys.all, 'reports', 'aging'] as const,
  },
};

// ============================================================================
// Complaint Queries
// ============================================================================

export function useComplaints(params?: PaginationParams & ComplaintFilters) {
  return useQuery({
    queryKey: complaintKeys.list(params || {}),
    queryFn: () => complaintService.list(params),
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: () => complaintService.getById(id),
    enabled: !!id,
  });
}

export function useMyComplaints(params?: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: complaintKeys.myComplaints(),
    queryFn: () => complaintService.getMyComplaints(params),
  });
}

export function useAssignedComplaints(params?: PaginationParams & { status?: string; search?: string }) {
  return useQuery({
    queryKey: complaintKeys.assignedToMe(),
    queryFn: () => complaintService.getAssignedToMe(params),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: complaintKeys.dashboardStats(),
    queryFn: () => complaintService.getDashboardStats(),
  });
}

export function useOverdueComplaints() {
  return useQuery({
    queryKey: complaintKeys.overdue(),
    queryFn: () => complaintService.getOverdueComplaints(),
  });
}

export function useComplaintActions(complaintId: string) {
  return useQuery({
    queryKey: complaintKeys.actions(complaintId),
    queryFn: () => complaintService.getActions(complaintId),
    enabled: !!complaintId,
  });
}

export function useComplaintAttachments(complaintId: string) {
  return useQuery({
    queryKey: complaintKeys.attachments(complaintId),
    queryFn: () => complaintService.getAttachments(complaintId),
    enabled: !!complaintId,
  });
}

// ============================================================================
// Category Queries
// ============================================================================

export function useComplaintCategories(params?: { isActive?: boolean; parentCategoryId?: string }) {
  return useQuery({
    queryKey: complaintKeys.categories(),
    queryFn: () => complaintCategoryService.list(params),
  });
}

// ============================================================================
// SLA Configuration Queries
// ============================================================================

export function useSLAConfigs(params?: { categoryId?: string; severity?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: complaintKeys.slaConfigs(),
    queryFn: () => slaService.list(params),
  });
}

// ============================================================================
// Escalation Rule Queries
// ============================================================================

export function useEscalationRules(params?: { categoryId?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: complaintKeys.escalationRules(),
    queryFn: () => escalationService.list(params),
  });
}

// ============================================================================
// Report Queries
// ============================================================================

export function useSLAComplianceReport(params?: { fromDate?: string; toDate?: string }) {
  return useQuery({
    queryKey: complaintKeys.reports.slaCompliance(),
    queryFn: () => complaintService.getSLAComplianceReport(params),
  });
}

export function useAgingReport() {
  return useQuery({
    queryKey: complaintKeys.reports.aging(),
    queryFn: () => complaintService.getAgingReport(),
  });
}

// ============================================================================
// Complaint Mutations
// ============================================================================

export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ComplaintCreateRequest) => complaintService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.dashboardStats() });
    },
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComplaintUpdateRequest }) =>
      complaintService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
}

export function useDeleteComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => complaintService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.dashboardStats() });
    },
  });
}

// ============================================================================
// Workflow Mutations
// ============================================================================

export function useAssignComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComplaintAssignRequest }) =>
      complaintService.assign(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.id) });
    },
  });
}

export function useStartProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => complaintService.startProgress(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(id) });
    },
  });
}

export function useRequestInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      complaintService.requestInfo(id, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.id) });
    },
  });
}

export function useProvideInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      complaintService.provideInfo(id, response),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.id) });
    },
  });
}

export function useEscalateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComplaintEscalateRequest }) =>
      complaintService.escalate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.id) });
    },
  });
}

export function useResolveComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComplaintResolveRequest }) =>
      complaintService.resolve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.id) });
    },
  });
}

export function useCloseComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComplaintCloseRequest }) =>
      complaintService.close(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.id) });
    },
  });
}

export function useReopenComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComplaintReopenRequest }) =>
      complaintService.reopen(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.id) });
    },
  });
}

// ============================================================================
// Action Mutations
// ============================================================================

export function useAddComplaintAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ complaintId, data }: { complaintId: string; data: ComplaintActionCreateRequest }) =>
      complaintService.addAction(complaintId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.complaintId) });
    },
  });
}

export function useAddComplaintComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ complaintId, content, isInternal }: { complaintId: string; content: string; isInternal?: boolean }) =>
      complaintService.addComment(complaintId, content, isInternal),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.actions(variables.complaintId) });
    },
  });
}

// ============================================================================
// Attachment Mutations
// ============================================================================

export function useAddComplaintAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ complaintId, data }: { complaintId: string; data: ComplaintAttachmentCreateRequest }) =>
      complaintService.addAttachment(complaintId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.attachments(variables.complaintId) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.complaintId) });
    },
  });
}

export function useDeleteComplaintAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ complaintId, attachmentId }: { complaintId: string; attachmentId: string }) =>
      complaintService.deleteAttachment(complaintId, attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.attachments(variables.complaintId) });
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.complaintId) });
    },
  });
}

// ============================================================================
// Category Mutations
// ============================================================================

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ComplaintCategoryCreateRequest) => complaintCategoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.categories() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ComplaintCategoryUpdateRequest }) =>
      complaintCategoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.categories() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => complaintCategoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.categories() });
    },
  });
}

// ============================================================================
// SLA Configuration Mutations
// ============================================================================

export function useCreateSLAConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SLAConfigurationCreateRequest) => slaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.slaConfigs() });
    },
  });
}

export function useUpdateSLAConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SLAConfigurationUpdateRequest }) =>
      slaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.slaConfigs() });
    },
  });
}

export function useDeleteSLAConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => slaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.slaConfigs() });
    },
  });
}

// ============================================================================
// Escalation Rule Mutations
// ============================================================================

export function useCreateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EscalationRuleCreateRequest) => escalationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.escalationRules() });
    },
  });
}

export function useUpdateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EscalationRuleUpdateRequest }) =>
      escalationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.escalationRules() });
    },
  });
}

export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => escalationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.escalationRules() });
    },
  });
}
