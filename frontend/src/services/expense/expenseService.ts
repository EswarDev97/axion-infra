/**
 * MindFlow - Expense Service
 * Per API_CONTRACT.md Section 8.5 (Expense Module)
 */

import { get, post, put, del } from '@/services/api/client';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  ExpenseCategory,
  ExpenseCategoryCreateRequest,
  ExpenseCategoryUpdateRequest,
  ExpenseRequest,
  ExpenseRequestCreateRequest,
  ExpenseRequestUpdateRequest,
  ExpenseRequestFilters,
  ExpenseItem,
  ExpenseItemCreateRequest,
  ExpenseItemUpdateRequest,
  ExpenseReceipt,
  ExpenseReceiptUploadRequest,
  PaymentRecord,
  PaymentRecordCreateRequest,
  ExpenseSummaryReport,
  ExpenseByCategoryReport,
  ExpenseByEmployeeReport,
  ApprovalRequest,
  RejectionRequest,
  MyExpensesSummary,
} from './types';

const EXPENSE_BASE = '/expenses';

// ============================================================================
// Expense Category Service
// ============================================================================

export const expenseCategoryService = {
  async list(): Promise<ExpenseCategory[]> {
    return get<ExpenseCategory[]>(`${EXPENSE_BASE}/categories`);
  },

  async getById(id: string): Promise<ExpenseCategory> {
    return get<ExpenseCategory>(`${EXPENSE_BASE}/categories/${id}`);
  },

  async create(data: ExpenseCategoryCreateRequest): Promise<ExpenseCategory> {
    return post<ExpenseCategory>(`${EXPENSE_BASE}/categories`, data);
  },

  async update(id: string, data: ExpenseCategoryUpdateRequest): Promise<ExpenseCategory> {
    return put<ExpenseCategory>(`${EXPENSE_BASE}/categories/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${EXPENSE_BASE}/categories/${id}`);
  },
};

// ============================================================================
// Expense Request Service
// ============================================================================

export const expenseRequestService = {
  async list(params?: PaginationParams & ExpenseRequestFilters): Promise<PaginatedResponse<ExpenseRequest>> {
    return get<PaginatedResponse<ExpenseRequest>>(`${EXPENSE_BASE}/requests`, params);
  },

  async getById(id: string): Promise<ExpenseRequest> {
    return get<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}`);
  },

  async create(data: ExpenseRequestCreateRequest): Promise<ExpenseRequest> {
    return post<ExpenseRequest>(`${EXPENSE_BASE}/requests`, data);
  },

  async update(id: string, data: ExpenseRequestUpdateRequest): Promise<ExpenseRequest> {
    return put<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${EXPENSE_BASE}/requests/${id}`);
  },

  // Workflow Actions
  async submit(id: string): Promise<ExpenseRequest> {
    return post<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}/submit`, {});
  },

  async cancel(id: string): Promise<ExpenseRequest> {
    return post<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}/cancel`, {});
  },

  async managerApprove(id: string, data?: ApprovalRequest): Promise<ExpenseRequest> {
    return post<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}/manager-approve`, data || {});
  },

  async managerReject(id: string, data: RejectionRequest): Promise<ExpenseRequest> {
    return post<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}/manager-reject`, data);
  },

  async financeApprove(id: string, data?: ApprovalRequest): Promise<ExpenseRequest> {
    return post<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}/finance-approve`, data || {});
  },

  async financeReject(id: string, data: RejectionRequest): Promise<ExpenseRequest> {
    return post<ExpenseRequest>(`${EXPENSE_BASE}/requests/${id}/finance-reject`, data);
  },

  // Pending Approvals (for managers/finance)
  async getPendingManagerApprovals(params?: PaginationParams): Promise<PaginatedResponse<ExpenseRequest>> {
    return get<PaginatedResponse<ExpenseRequest>>(`${EXPENSE_BASE}/requests/pending/manager`, params);
  },

  async getPendingFinanceApprovals(params?: PaginationParams): Promise<PaginatedResponse<ExpenseRequest>> {
    return get<PaginatedResponse<ExpenseRequest>>(`${EXPENSE_BASE}/requests/pending/finance`, params);
  },
};

// ============================================================================
// Expense Item Service
// ============================================================================

export const expenseItemService = {
  async getByRequest(requestId: string): Promise<ExpenseItem[]> {
    return get<ExpenseItem[]>(`${EXPENSE_BASE}/requests/${requestId}/items`);
  },

  async create(requestId: string, data: ExpenseItemCreateRequest): Promise<ExpenseItem> {
    return post<ExpenseItem>(`${EXPENSE_BASE}/requests/${requestId}/items`, data);
  },

  async update(requestId: string, itemId: string, data: ExpenseItemUpdateRequest): Promise<ExpenseItem> {
    return put<ExpenseItem>(`${EXPENSE_BASE}/requests/${requestId}/items/${itemId}`, data);
  },

  async delete(requestId: string, itemId: string): Promise<void> {
    return del<void>(`${EXPENSE_BASE}/requests/${requestId}/items/${itemId}`);
  },
};

// ============================================================================
// Expense Receipt Service (Request-level)
// ============================================================================

export const expenseReceiptService = {
  async getByRequest(requestId: string): Promise<ExpenseReceipt[]> {
    return get<ExpenseReceipt[]>(`${EXPENSE_BASE}/requests/${requestId}/receipts`);
  },

  async upload(requestId: string, data: ExpenseReceiptUploadRequest): Promise<ExpenseReceipt> {
    return post<ExpenseReceipt>(`${EXPENSE_BASE}/requests/${requestId}/receipts`, data);
  },

  async getById(receiptId: string): Promise<ExpenseReceipt> {
    return get<ExpenseReceipt>(`${EXPENSE_BASE}/requests/receipts/${receiptId}`);
  },

  async delete(receiptId: string): Promise<void> {
    return del<void>(`${EXPENSE_BASE}/requests/receipts/${receiptId}`);
  },
};

// ============================================================================
// Payment Service
// ============================================================================

export const paymentService = {
  async list(params?: PaginationParams & { expenseRequestId?: string; startDate?: string; endDate?: string }): Promise<PaginatedResponse<PaymentRecord>> {
    return get<PaginatedResponse<PaymentRecord>>(`${EXPENSE_BASE}/payments`, params);
  },

  async getById(paymentId: string): Promise<PaymentRecord> {
    return get<PaymentRecord>(`${EXPENSE_BASE}/payments/${paymentId}`);
  },

  async create(data: PaymentRecordCreateRequest): Promise<PaymentRecord> {
    return post<PaymentRecord>(`${EXPENSE_BASE}/payments`, data);
  },

  async getPendingPayments(params?: PaginationParams): Promise<PaginatedResponse<ExpenseRequest>> {
    return get<PaginatedResponse<ExpenseRequest>>(`${EXPENSE_BASE}/requests/pending/payment`, params);
  },
};

// ============================================================================
// Expense Reports Service
// ============================================================================

export const expenseReportService = {
  async getSummary(params: { startDate: string; endDate: string }): Promise<ExpenseSummaryReport> {
    return get<ExpenseSummaryReport>(`${EXPENSE_BASE}/reports/summary`, params);
  },

  async getByCategory(params: { startDate: string; endDate: string }): Promise<ExpenseByCategoryReport> {
    return get<ExpenseByCategoryReport>(`${EXPENSE_BASE}/reports/by-category`, params);
  },

  async getByEmployee(params: { startDate: string; endDate: string }): Promise<ExpenseByEmployeeReport> {
    return get<ExpenseByEmployeeReport>(`${EXPENSE_BASE}/reports/by-employee`, params);
  },
};

// ============================================================================
// My Expenses (Employee Dashboard)
// ============================================================================

export const myExpensesService = {
  async getSummary(): Promise<MyExpensesSummary> {
    return get<MyExpensesSummary>(`${EXPENSE_BASE}/me/summary`);
  },

  async getRequests(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<ExpenseRequest>> {
    return get<PaginatedResponse<ExpenseRequest>>(`${EXPENSE_BASE}/me/requests`, params);
  },
};

// ============================================================================
// Combined Expense Module Export
// ============================================================================

export const expenseModule = {
  categories: expenseCategoryService,
  requests: expenseRequestService,
  items: expenseItemService,
  receipts: expenseReceiptService,
  payments: paymentService,
  reports: expenseReportService,
  myExpenses: myExpensesService,
};

export default expenseModule;
