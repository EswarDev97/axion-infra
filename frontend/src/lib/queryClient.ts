/**
 * MindFlow - TanStack Query Client Configuration
 * Per FRONTEND_ARCHITECTURE.md Section 12
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 401, 403, 404
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
