/**
 * MindFlow - Expense Service Types
 * Per API_CONTRACT.md Section 8.5 (Expense Module)
 * Aligned with backend database schema (DATABASE_GOVERNANCE.md)
 */

// ============================================================================
// Expense Category
// ============================================================================

export interface ExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  code: string;
  maxAmount?: number | null;
  requiresReceipt: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryCreateRequest {
  name: string;
  description?: string;
  code: string;
  maxAmount?: number;
  requiresReceipt?: boolean;
}

export interface ExpenseCategoryUpdateRequest {
  name?: string;
  description?: string | null;
  maxAmount?: number | null;
  requiresReceipt?: boolean;
  isActive?: boolean;
}

// ============================================================================
// Expense Request
// ============================================================================

export type ExpenseRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED'
  | 'FINANCE_APPROVED'
  | 'FINANCE_REJECTED'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED';

export interface EmployeeInfo {
  id: string;
  employeeCode: string;
  fullName: string;
  department?: string | null;
}

export interface ExpenseItemInfo {
  id: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  quantity: number;
  expenseDate: string;
}

export interface ReceiptInfo {
  id: string;
  fileId: string;
  expenseItemId?: string | null;
  uploadedAt: string;
}

export interface ExpenseRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  employee?: EmployeeInfo | null;
  requestNumber: string;
  title: string;
  description?: string | null;
  expenseDate: string;
  dueDate?: string | null;
  collectedBy?: string | null;
  totalAmount: number;
  currency: string;
  status: ExpenseRequestStatus;
  itemCount: number;
  receiptCount: number;
  items: ExpenseItemInfo[];
  receipts: ReceiptInfo[];
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ExpenseRequestCreateRequest {
  title: string;
  description?: string;
  expenseDate: string;
  dueDate?: string;
  categoryId?: string;
  collectedBy?: string;
  amount?: number;
  currency?: string;
}

export interface ExpenseRequestUpdateRequest {
  title?: string;
  description?: string | null;
  expenseDate?: string;
  dueDate?: string | null;
  collectedBy?: string | null;
  categoryId?: string;
  amount?: number;
  currency?: string;
}

export interface ExpenseRequestFilters {
  status?: ExpenseRequestStatus;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  dueStartDate?: string;
  dueEndDate?: string;
  minAmount?: number;
  maxAmount?: number;
  collectedBy?: string;
  categoryId?: string;
  search?: string;
}

// ============================================================================
// Expense Item
// ============================================================================

export interface CategoryInfo {
  id: string;
  name: string;
  code: string;
  requiresReceipt: boolean;
}

export interface ExpenseItem {
  id: string;
  expenseRequestId: string;
  categoryId: string;
  category?: CategoryInfo | null;
  description: string;
  amount: number;
  quantity: number;
  unitPrice?: number | null;
  expenseDate: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ExpenseItemCreateRequest {
  categoryId: string;
  description: string;
  amount: number;
  expenseDate: string;
  quantity?: number;
  unitPrice?: number;
}

export interface ExpenseItemUpdateRequest {
  categoryId?: string;
  description?: string;
  amount?: number;
  expenseDate?: string;
  quantity?: number;
  unitPrice?: number | null;
}

// ============================================================================
// Expense Receipt
// ============================================================================

export interface ExpenseReceipt {
  id: string;
  expenseRequestId: string;
  expenseItemId?: string | null;
  fileId: string;
  uploadedAt: string;
  uploadedBy: string;
  tenantId: string;
  createdAt: string;
}

export interface ExpenseReceiptUploadRequest {
  fileId: string;
  expenseItemId?: string;
}

// ============================================================================
// Payment Record
// ============================================================================

export type PaymentMode = 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'DIGITAL_WALLET';

export interface ExpenseRequestInfo {
  id: string;
  requestNumber: string;
  title: string;
  totalAmount: number;
}

export interface PaymentRecord {
  id: string;
  expenseRequestId: string;
  expenseRequest?: ExpenseRequestInfo | null;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  amountPaid: number;
  remarks?: string | null;
  processedBy: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecordCreateRequest {
  expenseRequestId: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  amountPaid: number;
  referenceNumber?: string;
  remarks?: string;
}

// ============================================================================
// Expense Reports
// ============================================================================

export interface ExpenseSummaryReport {
  startDate: string;
  endDate: string;
  totalRequests: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  paidAmount: number;
  byStatus: Record<string, number>;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  totalAmount: number;
  itemCount: number;
  percentage: number;
}

export interface ExpenseByCategoryReport {
  startDate: string;
  endDate: string;
  totalAmount: number;
  categories: CategorySummary[];
}

export interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department?: string | null;
  totalAmount: number;
  requestCount: number;
}

export interface ExpenseByEmployeeReport {
  startDate: string;
  endDate: string;
  totalAmount: number;
  employees: EmployeeSummary[];
}

// ============================================================================
// Approval Workflow
// ============================================================================

export interface ApprovalRequest {
  comments?: string;
}

export interface RejectionRequest {
  reason: string;
}

// ============================================================================
// My Expenses (Employee Dashboard)
// ============================================================================

export interface MyExpensesSummary {
  totalRequests: number;
  draftRequests: number;
  pendingApproval: number;
  approved: number;
  totalSubmittedAmount: number;
  totalPaidAmount: number;
  pendingReimbursement: number;
}
