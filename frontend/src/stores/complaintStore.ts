/**
 * MindFlow - Complaint Store
 * Per FRONTEND_ARCHITECTURE.md Section 5 & 6
 * Zustand store for complaint state management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Complaint,
  ComplaintCategory,
  ComplaintFilters,
  ComplaintAction,
  ComplaintAttachment,
  ComplaintDashboardStats,
  MyComplaintsSummary,
  SLAConfiguration,
  EscalationRule,
  AssignableUser,
} from '@/services/complaint/types';
import {
  complaintService,
  complaintCategoryService,
  slaService,
  escalationService,
} from '@/services/complaint/complaintService';
import { clientService, type Client } from '@/services/complaint/clientService';

interface ComplaintState {
  // Data
  complaints: Complaint[];
  currentComplaint: Complaint | null;
  categories: ComplaintCategory[];
  slaConfigs: SLAConfiguration[];
  escalationRules: EscalationRule[];
  dashboardStats: ComplaintDashboardStats | null;
  myComplaintsSummary: MyComplaintsSummary | null;
  complaintActions: ComplaintAction[];
  complaintAttachments: ComplaintAttachment[];
  assignableUsers: AssignableUser[];
  clients: Client[];

  // UI State
  isLoading: boolean;
  isLoadingComplaint: boolean;
  isLoadingActions: boolean;
  error: string | null;
  filters: ComplaintFilters;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;

  // Actions - Data Fetching
  fetchComplaints: (params?: ComplaintFilters & { page?: number; pageSize?: number }) => Promise<void>;
  fetchComplaint: (id: string) => Promise<Complaint | null>;
  fetchCategories: () => Promise<void>;
  fetchSLAConfigs: () => Promise<void>;
  fetchEscalationRules: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchMyComplaintsSummary: () => Promise<void>;
  fetchAssignableUsers: () => Promise<void>;
  fetchClients: () => Promise<void>;

  // Actions - Complaint CRUD
  createComplaint: (data: Parameters<typeof complaintService.create>[0]) => Promise<Complaint | null>;
  updateComplaint: (id: string, data: Parameters<typeof complaintService.update>[1]) => Promise<Complaint | null>;
  deleteComplaint: (id: string) => Promise<boolean>;

  // Actions - Workflow
  assignComplaint: (id: string, data: Parameters<typeof complaintService.assign>[1]) => Promise<Complaint | null>;
  startProgress: (id: string) => Promise<Complaint | null>;
  requestInfo: (id: string, message: string) => Promise<Complaint | null>;
  provideInfo: (id: string, response: string) => Promise<Complaint | null>;
  escalateComplaint: (id: string, data: Parameters<typeof complaintService.escalate>[1]) => Promise<Complaint | null>;
  resolveComplaint: (id: string, data: Parameters<typeof complaintService.resolve>[1]) => Promise<Complaint | null>;
  closeComplaint: (id: string, data: Parameters<typeof complaintService.close>[1]) => Promise<Complaint | null>;
  reopenComplaint: (id: string, data: Parameters<typeof complaintService.reopen>[1]) => Promise<Complaint | null>;

  // Actions - Actions (History/Comments)
  fetchActions: (complaintId: string) => Promise<void>;
  addAction: (complaintId: string, data: Parameters<typeof complaintService.addAction>[1]) => Promise<ComplaintAction | null>;
  addComment: (complaintId: string, content: string, isInternal?: boolean) => Promise<ComplaintAction | null>;

  // Actions - Attachments
  fetchAttachments: (complaintId: string) => Promise<void>;
  addAttachment: (complaintId: string, data: Parameters<typeof complaintService.addAttachment>[1]) => Promise<ComplaintAttachment | null>;
  deleteAttachment: (complaintId: string, attachmentId: string) => Promise<boolean>;

  // Actions - UI State
  setFilters: (filters: ComplaintFilters) => void;
  clearFilters: () => void;
  setCurrentComplaint: (complaint: Complaint | null) => void;
  clearError: () => void;
}

export const useComplaintStore = create<ComplaintState>()(
  devtools(
    (set, get) => ({
      // Initial Data State
      complaints: [],
      currentComplaint: null,
      categories: [],
      slaConfigs: [],
      escalationRules: [],
      dashboardStats: null,
      myComplaintsSummary: null,
      complaintActions: [],
      complaintAttachments: [],
      assignableUsers: [],
      clients: [],

      // Initial UI State
      isLoading: false,
      isLoadingComplaint: false,
      isLoadingActions: false,
      error: null,
      filters: {},

      // Initial Pagination
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      pageSize: 20,

      // ========================================================================
      // Data Fetching Actions
      // ========================================================================

      fetchComplaints: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const { filters } = get();
          const response = await complaintService.list({
            ...filters,
            ...params,
            page: params?.page || 1,
            pageSize: params?.pageSize || 20,
          });
          // Handle both response formats:
          // Backend returns: { items, total, page, limit, pages }
          // Frontend PaginatedResponse expects: { items, pagination: { page, pageSize, ... } }
          const pagination = response.pagination ?? {
            page: (response as any).page ?? 1,
            pageSize: (response as any).limit ?? (response as any).pageSize ?? 20,
            totalItems: (response as any).total ?? (response as any).totalItems ?? 0,
            totalPages: (response as any).pages ?? (response as any).totalPages ?? 0,
            hasNext: false,
            hasPrevious: false,
          };
          set({
            complaints: response.items ?? [],
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.totalItems,
            pageSize: pagination.pageSize,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to fetch complaints',
            isLoading: false,
          });
        }
      },

      fetchComplaint: async (id) => {
        set({ isLoadingComplaint: true, error: null });
        try {
          const complaint = await complaintService.getById(id);
          set({ currentComplaint: complaint, isLoadingComplaint: false });
          return complaint;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to fetch complaint',
            isLoadingComplaint: false,
          });
          return null;
        }
      },

      fetchCategories: async () => {
        try {
          const categories = await complaintCategoryService.list();
          set({ categories });
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        }
      },

      fetchSLAConfigs: async () => {
        try {
          const slaConfigs = await slaService.list();
          set({ slaConfigs });
        } catch (error) {
          console.error('Failed to fetch SLA configs:', error);
        }
      },

      fetchEscalationRules: async () => {
        try {
          const escalationRules = await escalationService.list();
          set({ escalationRules });
        } catch (error) {
          console.error('Failed to fetch escalation rules:', error);
        }
      },

      fetchDashboardStats: async () => {
        try {
          const stats = await complaintService.getDashboardStats();
          set({ dashboardStats: stats });
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
        }
      },

      fetchMyComplaintsSummary: async () => {
        try {
          const summary = await complaintService.getMyComplaintsSummary();
          set({ myComplaintsSummary: summary });
        } catch (error) {
          console.error('Failed to fetch my complaints summary:', error);
        }
      },

      fetchAssignableUsers: async () => {
        try {
          const users = await complaintService.getAssignableUsers();
          set({ assignableUsers: users });
        } catch (error) {
          console.error('Failed to fetch assignable users:', error);
        }
      },

      fetchClients: async () => {
        try {
          const response = await clientService.list({ isActive: true, limit: 200 });
          set({ clients: response.items ?? [] });
        } catch (error) {
          console.error('Failed to fetch clients:', error);
        }
      },

      // ========================================================================
      // Complaint CRUD Actions
      // ========================================================================

      createComplaint: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const complaint = await complaintService.create(data);
          const { complaints } = get();
          set({
            complaints: [complaint, ...complaints],
            isLoading: false,
          });
          return complaint;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to create complaint',
            isLoading: false,
          });
          return null;
        }
      },

      updateComplaint: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedComplaint = await complaintService.update(id, data);
          const { complaints, currentComplaint } = get();

          set({
            complaints: complaints.map((c) => (c.id === id ? updatedComplaint : c)),
            currentComplaint: currentComplaint?.id === id ? updatedComplaint : currentComplaint,
            isLoading: false,
          });

          return updatedComplaint;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to update complaint',
            isLoading: false,
          });
          return null;
        }
      },

      deleteComplaint: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await complaintService.delete(id);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.filter((c) => c.id !== id),
            currentComplaint: currentComplaint?.id === id ? null : currentComplaint,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            error: (error as Error).message || 'Failed to delete complaint',
            isLoading: false,
          });
          return false;
        }
      },

      // ========================================================================
      // Workflow Actions
      // ========================================================================

      assignComplaint: async (id, data) => {
        try {
          const updated = await complaintService.assign(id, data);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to assign complaint' });
          return null;
        }
      },

      startProgress: async (id) => {
        try {
          const updated = await complaintService.startProgress(id);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to start progress' });
          return null;
        }
      },

      requestInfo: async (id, message) => {
        try {
          const updated = await complaintService.requestInfo(id, message);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to request info' });
          return null;
        }
      },

      provideInfo: async (id, response) => {
        try {
          const updated = await complaintService.provideInfo(id, response);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to provide info' });
          return null;
        }
      },

      escalateComplaint: async (id, data) => {
        try {
          const updated = await complaintService.escalate(id, data);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to escalate complaint' });
          return null;
        }
      },

      resolveComplaint: async (id, data) => {
        try {
          const updated = await complaintService.resolve(id, data);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to resolve complaint' });
          return null;
        }
      },

      closeComplaint: async (id, data) => {
        try {
          const updated = await complaintService.close(id, data);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to close complaint' });
          return null;
        }
      },

      reopenComplaint: async (id, data) => {
        try {
          const updated = await complaintService.reopen(id, data);
          const { complaints, currentComplaint } = get();
          set({
            complaints: complaints.map((c) => (c.id === id ? updated : c)),
            currentComplaint: currentComplaint?.id === id ? updated : currentComplaint,
          });
          return updated;
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to reopen complaint' });
          return null;
        }
      },

      // ========================================================================
      // Action History Actions
      // ========================================================================

      fetchActions: async (complaintId) => {
        set({ isLoadingActions: true });
        try {
          const actions = await complaintService.getActions(complaintId);
          set({ complaintActions: actions, isLoadingActions: false });
        } catch (error) {
          set({ isLoadingActions: false });
        }
      },

      addAction: async (complaintId, data) => {
        try {
          const action = await complaintService.addAction(complaintId, data);
          const { complaintActions } = get();
          set({ complaintActions: [action, ...complaintActions] });
          return action;
        } catch (error) {
          return null;
        }
      },

      addComment: async (complaintId, content, isInternal = true) => {
        try {
          const action = await complaintService.addComment(complaintId, content, isInternal);
          const { complaintActions } = get();
          set({ complaintActions: [action, ...complaintActions] });
          return action;
        } catch (error) {
          return null;
        }
      },

      // ========================================================================
      // Attachment Actions
      // ========================================================================

      fetchAttachments: async (complaintId) => {
        try {
          const attachments = await complaintService.getAttachments(complaintId);
          set({ complaintAttachments: attachments });
        } catch (error) {
          console.error('Failed to fetch attachments:', error);
        }
      },

      addAttachment: async (complaintId, data) => {
        try {
          const attachment = await complaintService.addAttachment(complaintId, data);
          const { complaintAttachments } = get();
          set({ complaintAttachments: [...complaintAttachments, attachment] });
          return attachment;
        } catch (error) {
          return null;
        }
      },

      deleteAttachment: async (complaintId, attachmentId) => {
        try {
          await complaintService.deleteAttachment(complaintId, attachmentId);
          const { complaintAttachments } = get();
          set({ complaintAttachments: complaintAttachments.filter((a) => a.id !== attachmentId) });
          return true;
        } catch (error) {
          return false;
        }
      },

      // ========================================================================
      // UI State Actions
      // ========================================================================

      setFilters: (filters) => {
        set({ filters: { ...get().filters, ...filters } });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      setCurrentComplaint: (complaint) => {
        set({ currentComplaint: complaint });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'complaintStore' }
  )
);

// Selector hooks for common use cases
export const useComplaints = () => useComplaintStore((state) => state.complaints);
export const useCurrentComplaint = () => useComplaintStore((state) => state.currentComplaint);
export const useComplaintCategories = () => useComplaintStore((state) => state.categories);
export const useSLAConfigs = () => useComplaintStore((state) => state.slaConfigs);
export const useEscalationRules = () => useComplaintStore((state) => state.escalationRules);
export const useComplaintLoading = () => useComplaintStore((state) => state.isLoading);
export const useComplaintError = () => useComplaintStore((state) => state.error);
export const useDashboardStats = () => useComplaintStore((state) => state.dashboardStats);
export const useAssignableUsers = () => useComplaintStore((state) => state.assignableUsers);
export const useClients = () => useComplaintStore((state) => state.clients);
