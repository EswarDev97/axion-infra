/**
 * MindFlow - Client (Insurer/Client) Service
 * CRUD for the Insurer / Client master table.
 */

import { get, post, put, del } from '@/services/api/client';

const BASE = '/complaints/clients';

export interface Client {
  id: string;
  name: string;
  code: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientCreateRequest {
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export interface ClientUpdateRequest {
  name?: string;
  code?: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface ClientListResponse {
  items: Client[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const clientService = {
  async list(params?: { page?: number; limit?: number; isActive?: boolean; search?: string }): Promise<ClientListResponse> {
    return get<ClientListResponse>(BASE, params);
  },

  async getById(id: string): Promise<Client> {
    return get<Client>(`${BASE}/${id}`);
  },

  async create(data: ClientCreateRequest): Promise<Client> {
    return post<Client>(BASE, data);
  },

  async update(id: string, data: ClientUpdateRequest): Promise<Client> {
    return put<Client>(`${BASE}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${BASE}/${id}`);
  },
};
