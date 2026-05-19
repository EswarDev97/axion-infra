/**
 * MindFlow - Billing Service
 * Quote and Invoice API client with multi-currency support.
 */

import { get, post, put, del, apiClient } from '@/services/api/client';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  CurrencyInfo,
  Quote,
  QuoteCreateRequest,
  QuoteUpdateRequest,
  QuoteFilters,
  QuoteItemCreateRequest,
  Invoice,
  InvoiceCreateRequest,
  InvoiceUpdateRequest,
  InvoiceFilters,
  InvoiceItemCreateRequest,
} from './types';

const BILLING_BASE = '/billing';

// ============================================================================
// Currency Service
// ============================================================================

export const currencyService = {
  async list(): Promise<CurrencyInfo[]> {
    return get<CurrencyInfo[]>(`${BILLING_BASE}/currencies`);
  },
};

// ============================================================================
// Quote Service
// ============================================================================

export const quoteService = {
  async getNextNumber(): Promise<string> {
    const data = await get<{ nextNumber: string }>(`${BILLING_BASE}/quotes/next-number`);
    return data.nextNumber;
  },

  async list(
    params?: PaginationParams & QuoteFilters
  ): Promise<PaginatedResponse<Quote>> {
    return get<PaginatedResponse<Quote>>(`${BILLING_BASE}/quotes`, params);
  },

  async getById(id: string): Promise<Quote> {
    return get<Quote>(`${BILLING_BASE}/quotes/${id}`);
  },

  async create(data: QuoteCreateRequest): Promise<Quote> {
    return post<Quote>(`${BILLING_BASE}/quotes`, data);
  },

  async update(id: string, data: QuoteUpdateRequest): Promise<Quote> {
    return put<Quote>(`${BILLING_BASE}/quotes/${id}`, data);
  },

  async delete(id: string, reason?: string): Promise<void> {
    const url = reason
      ? `${BILLING_BASE}/quotes/${id}?reason=${encodeURIComponent(reason)}`
      : `${BILLING_BASE}/quotes/${id}`;
    return del<void>(url);
  },

  // Items
  async addItem(quoteId: string, data: QuoteItemCreateRequest): Promise<Quote> {
    return post<Quote>(`${BILLING_BASE}/quotes/${quoteId}/items`, data);
  },

  async removeItem(quoteId: string, itemId: string): Promise<Quote> {
    return del<Quote>(`${BILLING_BASE}/quotes/${quoteId}/items/${itemId}`);
  },

  // Status transitions
  async send(id: string): Promise<Quote> {
    return post<Quote>(`${BILLING_BASE}/quotes/${id}/send`, {});
  },

  async accept(id: string): Promise<Quote> {
    return post<Quote>(`${BILLING_BASE}/quotes/${id}/accept`, {});
  },

  async reject(id: string, reason?: string): Promise<Quote> {
    const url = reason
      ? `${BILLING_BASE}/quotes/${id}/reject?reason=${encodeURIComponent(reason)}`
      : `${BILLING_BASE}/quotes/${id}/reject`;
    return post<Quote>(url, {});
  },

  // PDF
  async downloadPdf(id: string, filename?: string): Promise<void> {
    const response = await apiClient.get(`${BILLING_BASE}/quotes/${id}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `quote-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ============================================================================
// Invoice Service
// ============================================================================

export const invoiceService = {
  async getNextNumber(): Promise<string> {
    const data = await get<{ nextNumber: string }>(`${BILLING_BASE}/invoices/next-number`);
    return data.nextNumber;
  },

  async list(
    params?: PaginationParams & InvoiceFilters
  ): Promise<PaginatedResponse<Invoice>> {
    return get<PaginatedResponse<Invoice>>(`${BILLING_BASE}/invoices`, params);
  },

  async getById(id: string): Promise<Invoice> {
    return get<Invoice>(`${BILLING_BASE}/invoices/${id}`);
  },

  async create(data: InvoiceCreateRequest): Promise<Invoice> {
    return post<Invoice>(`${BILLING_BASE}/invoices`, data);
  },

  async update(id: string, data: InvoiceUpdateRequest): Promise<Invoice> {
    return put<Invoice>(`${BILLING_BASE}/invoices/${id}`, data);
  },

  async delete(id: string, reason?: string): Promise<void> {
    const url = reason
      ? `${BILLING_BASE}/invoices/${id}?reason=${encodeURIComponent(reason)}`
      : `${BILLING_BASE}/invoices/${id}`;
    return del<void>(url);
  },

  // Items
  async addItem(invoiceId: string, data: InvoiceItemCreateRequest): Promise<Invoice> {
    return post<Invoice>(`${BILLING_BASE}/invoices/${invoiceId}/items`, data);
  },

  async removeItem(invoiceId: string, itemId: string): Promise<Invoice> {
    return del<Invoice>(`${BILLING_BASE}/invoices/${invoiceId}/items/${itemId}`);
  },

  // Status transitions
  async send(id: string): Promise<Invoice> {
    return post<Invoice>(`${BILLING_BASE}/invoices/${id}/send`, {});
  },

  async markPaid(id: string): Promise<Invoice> {
    return post<Invoice>(`${BILLING_BASE}/invoices/${id}/mark-paid`, {});
  },

  async cancel(id: string, reason?: string): Promise<Invoice> {
    const url = reason
      ? `${BILLING_BASE}/invoices/${id}/cancel?reason=${encodeURIComponent(reason)}`
      : `${BILLING_BASE}/invoices/${id}/cancel`;
    return post<Invoice>(url, {});
  },

  // PDF
  async downloadPdf(id: string, filename?: string): Promise<void> {
    const response = await apiClient.get(`${BILLING_BASE}/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `invoice-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default { currencyService, quoteService, invoiceService };
