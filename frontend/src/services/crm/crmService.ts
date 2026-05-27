/**
 * MindFlow - CRM Service
 * CRUD for Micro-CRM Operating Office leads.
 */

import { get, post, put, del } from '@/services/api/client';
import type {
  CrmLead,
  CrmLeadCreateRequest,
  CrmLeadUpdateRequest,
  CrmLeadListResponse,
  CrmLeadFilters,
} from './types';

const BASE = '/crm/leads';

export const crmService = {
  async list(params?: CrmLeadFilters): Promise<CrmLeadListResponse> {
    return get<CrmLeadListResponse>(BASE, params);
  },

  async getById(id: string): Promise<CrmLead> {
    return get<CrmLead>(`${BASE}/${id}`);
  },

  async create(data: CrmLeadCreateRequest): Promise<CrmLead> {
    return post<CrmLead>(BASE, data);
  },

  async update(id: string, data: CrmLeadUpdateRequest): Promise<CrmLead> {
    return put<CrmLead>(`${BASE}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${BASE}/${id}`);
  },
};
