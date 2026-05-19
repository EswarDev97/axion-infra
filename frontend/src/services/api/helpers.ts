/**
 * MindFlow - API Helper Functions
 * Utilities for handling paginated responses from the API.
 *
 * The backend returns paginated responses in the format:
 * { items: T[], pagination: { page, pageSize, totalItems, totalPages, ... } }
 *
 * These helpers ensure frontend services properly extract data from this format.
 */

import { get } from './client';
import type { PaginatedResponse, PaginationMeta } from './types';

/**
 * Fetches a paginated endpoint and returns just the items array.
 * Use when you only need the data, not pagination info (e.g., dropdown lists).
 *
 * @example
 * // Service
 * async list(): Promise<TaskStatus[]> {
 *   return getList<TaskStatus>(`${TASK_BASE}/statuses`);
 * }
 *
 * @param url - API endpoint URL
 * @param params - Optional query parameters
 * @returns Array of items from the paginated response
 */
export async function getList<T>(url: string, params?: object): Promise<T[]> {
  const response = await get<PaginatedResponse<T>>(url, params);
  return response?.items ?? [];
}

/**
 * Fetches a paginated endpoint and returns both items and pagination metadata.
 * Use when you need pagination info for UI (e.g., data tables with paging).
 *
 * @example
 * // Service
 * async listWithPagination(params?: PaginationParams): Promise<PaginatedResponse<Task>> {
 *   return getPaginatedList<Task>(TASK_BASE, params);
 * }
 *
 * @param url - API endpoint URL
 * @param params - Optional query parameters including pagination
 * @returns Full paginated response with items and pagination metadata
 */
export async function getPaginatedList<T>(url: string, params?: object): Promise<PaginatedResponse<T>> {
  const response = await get<PaginatedResponse<T>>(url, params);
  return response ?? {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    } as PaginationMeta,
  };
}

/**
 * Type guard to check if a response is a paginated response.
 * Useful when an endpoint might return either an array or paginated response.
 *
 * @param response - Response to check
 * @returns true if response is a paginated response with items array
 */
export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'items' in response &&
    Array.isArray((response as PaginatedResponse<T>).items)
  );
}

/**
 * Safely extracts items from a response that might be either an array or paginated.
 * Use as a fallback when migrating from array to paginated response handling.
 *
 * @param response - Response that might be T[] or PaginatedResponse<T>
 * @returns Array of items
 */
export function extractItems<T>(response: T[] | PaginatedResponse<T> | null | undefined): T[] {
  if (!response) {
    return [];
  }
  if (Array.isArray(response)) {
    return response;
  }
  if (isPaginatedResponse<T>(response)) {
    return response.items;
  }
  return [];
}
