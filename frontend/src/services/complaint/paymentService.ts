/**
 * MindFlow - Payment Service
 * CRUD for case-level Payment records.
 */

import { get, post, put, del } from '@/services/api/client';

const BASE = '/complaints/payments';

export type PaymentCaseStatus =
  | 'ASSIGNED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'REPORT_SUBMITTED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_RECEIVED'
  | 'CANCELLED';
export type PaymentBillingStatus = 'COMPANY_BILLING' | 'CUSTOMER_BILLING';
export type PaymentMode = 'CASH' | 'TRANSFER';

export interface Payment {
  id: string;
  caseReference: string;
  clientId: string;
  financeId?: string | null;
  vehicleRegistrationNumber: string;
  executiveEmployeeId: string;
  caseStatus: string;
  billingStatus: string;
  paymentMode?: string | null;
  utrNumber?: string | null;
  transactionDatetime?: string | null;
  amount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCreateRequest {
  caseReference: string;
  clientId: string;
  financeId?: string;
  vehicleRegistrationNumber: string;
  executiveEmployeeId: string;
  caseStatus?: string;
  billingStatus: string;
  paymentMode?: string;
  utrNumber?: string;
  transactionDatetime?: string;
  amount?: number;
}

export interface PaymentUpdateRequest {
  caseReference?: string;
  clientId?: string;
  financeId?: string | null;
  vehicleRegistrationNumber?: string;
  executiveEmployeeId?: string;
  caseStatus?: string;
  billingStatus?: string;
  paymentMode?: string | null;
  utrNumber?: string | null;
  transactionDatetime?: string | null;
  amount?: number | null;
}

export interface PaymentListResponse {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type PaymentSortColumn =
  | 'caseReference'
  | 'client'
  | 'finance'
  | 'executive'
  | 'caseStatus'
  | 'billingStatus'
  | 'amount'
  | 'createdAt';
export type PaymentSortOrder = 'asc' | 'desc';

export const paymentService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    caseStatus?: string;
    billingStatus?: string;
    clientId?: string;
    financeId?: string;
    executiveEmployeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: PaymentSortColumn;
    sortOrder?: PaymentSortOrder;
  }): Promise<PaymentListResponse> {
    return get<PaymentListResponse>(BASE, params);
  },

  async getById(id: string): Promise<Payment> {
    return get<Payment>(`${BASE}/${id}`);
  },

  async create(data: PaymentCreateRequest): Promise<Payment> {
    return post<Payment>(BASE, data);
  },

  async update(id: string, data: PaymentUpdateRequest): Promise<Payment> {
    return put<Payment>(`${BASE}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${BASE}/${id}`);
  },
};
