/**
 * MindFlow - Billing Service Types
 * Quote and Invoice types with multi-currency support (INR, USD).
 */

// ============================================================================
// Currency
// ============================================================================

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export type CurrencyCode = 'INR' | 'USD';

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { code: 'INR', name: 'Indian Rupees', symbol: '₹' },
  USD: { code: 'USD', name: 'US Dollars', symbol: '$' },
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCIES[currency as CurrencyCode]?.symbol ?? currency;
}

export function formatCurrency(amount: number | string | undefined | null, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const num = Number(amount) || 0;
  return `${symbol} ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// Quote
// ============================================================================

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface QuoteItem {
  id: string;
  itemName?: string | null;
  description?: string | null;
  quantity: number;
  rate: number;
  amount: number;
  sortOrder: number;
}

export interface QuoteItemCreateRequest {
  itemName: string;
  description?: string;
  quantity?: number;
  rate: number;
  sortOrder?: number;
}

export interface QuoteItemUpdateRequest {
  itemName?: string;
  description?: string;
  quantity?: number;
  rate?: number;
  sortOrder?: number;
}

export interface ClientInfo {
  id: string;
  name: string;
  code: string;
}

export interface Quote {
  id: string;
  tenantId: string;
  clientId: string;
  client?: ClientInfo | null;
  quoteNumber: string;
  title: string;
  description?: string | null;
  billToName?: string | null;
  billToAddress?: string | null;
  billToEmail?: string | null;
  billToPhone?: string | null;
  currency: CurrencyCode;
  currencySymbol: string;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  status: QuoteStatus;
  validUntil?: string | null;
  notes?: string | null;
  terms?: string | null;
  itemCount: number;
  items: QuoteItem[];
  issuedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface QuoteCreateRequest {
  quoteNumber?: string;
  clientId: string;
  title: string;
  description?: string;
  billToName?: string;
  billToAddress?: string;
  billToEmail?: string;
  billToPhone?: string;
  currency?: CurrencyCode;
  taxPercentage?: number;
  validUntil?: string;
  notes?: string;
  terms?: string;
  items?: QuoteItemCreateRequest[];
}

export interface QuoteUpdateRequest {
  quoteNumber?: string;
  clientId?: string;
  title?: string;
  description?: string | null;
  billToName?: string | null;
  billToAddress?: string | null;
  billToEmail?: string | null;
  billToPhone?: string | null;
  currency?: CurrencyCode;
  taxPercentage?: number;
  validUntil?: string | null;
  notes?: string | null;
  terms?: string | null;
}

export interface QuoteFilters {
  clientId?: string;
  status?: QuoteStatus;
  currency?: CurrencyCode;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// ============================================================================
// Invoice
// ============================================================================

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  itemName?: string | null;
  description?: string | null;
  quantity: number;
  rate: number;
  amount: number;
  sortOrder: number;
}

export interface InvoiceItemCreateRequest {
  itemName: string;
  description?: string;
  quantity?: number;
  rate: number;
  sortOrder?: number;
}

export interface InvoiceItemUpdateRequest {
  itemName?: string;
  description?: string;
  quantity?: number;
  rate?: number;
  sortOrder?: number;
}

export interface QuoteInfo {
  id: string;
  quoteNumber: string;
  title: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  clientId: string;
  client?: ClientInfo | null;
  quoteId?: string | null;
  quote?: QuoteInfo | null;
  quoteNumber?: string | null;
  quoteDate?: string | null;
  poNumber?: string | null;
  poDate?: string | null;
  invoiceNumber: string;
  title: string;
  description?: string | null;
  billToName?: string | null;
  billToAddress?: string | null;
  billToEmail?: string | null;
  billToPhone?: string | null;
  currency: CurrencyCode;
  currencySymbol: string;
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  itemCount: number;
  items: InvoiceItem[];
  issuedAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface InvoiceCreateRequest {
  invoiceNumber?: string;
  clientId: string;
  quoteId?: string;
  quoteDate?: string;
  poNumber?: string;
  poDate?: string;
  title: string;
  description?: string;
  billToName?: string;
  billToAddress?: string;
  billToEmail?: string;
  billToPhone?: string;
  currency?: CurrencyCode;
  taxPercentage?: number;
  dueDate?: string;
  notes?: string;
  terms?: string;
  items?: InvoiceItemCreateRequest[];
}

export interface InvoiceUpdateRequest {
  invoiceNumber?: string;
  clientId?: string;
  poNumber?: string | null;
  poDate?: string | null;
  quoteDate?: string | null;
  title?: string;
  description?: string | null;
  billToName?: string | null;
  billToAddress?: string | null;
  billToEmail?: string | null;
  billToPhone?: string | null;
  currency?: CurrencyCode;
  taxPercentage?: number;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
}

export interface InvoiceFilters {
  clientId?: string;
  quoteId?: string;
  status?: InvoiceStatus;
  currency?: CurrencyCode;
  startDate?: string;
  endDate?: string;
  dueStartDate?: string;
  dueEndDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}
