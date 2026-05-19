/**
 * MindFlow - Server-Side Fetch Utility
 * Provides authenticated fetch for Next.js Server Components
 */

import { cookies } from 'next/headers';

// Use internal Docker network URL for server-side requests, fallback to public URL
const API_BASE = process.env.API_BASE_URL_INTERNAL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Server-side fetch with authentication.
 * Use this in server components and API routes.
 *
 * @param path - API path (e.g., '/employees/123')
 * @param options - Fetch options
 * @returns Parsed response data or null on error
 */
export async function serverFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

    const response = await fetch(url, {
      ...options,
      headers,
      cache: options.cache || 'no-store',
    });

    if (!response.ok) {
      console.error(`Server fetch failed: ${response.status} ${response.statusText} for ${path}`);
      return null;
    }

    const data = await response.json();
    return (data.data || data) as T;
  } catch (error) {
    console.error('Server fetch error:', error);
    return null;
  }
}

/**
 * Server-side fetch for list endpoints.
 * Returns empty array on error instead of null.
 */
export async function serverFetchList<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T[]> {
  const result = await serverFetch<{ items: T[] } | T[]>(path, options);

  if (!result) {
    return [];
  }

  // Handle both { items: [...] } and direct array responses
  if (Array.isArray(result)) {
    return result;
  }

  return result.items || [];
}

export { API_BASE };
