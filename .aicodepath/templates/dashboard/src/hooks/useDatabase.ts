import { useState, useEffect, useCallback } from 'react';

export interface UseDBResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDatabase<T>(
  endpoint: string,
  interval = 3899
): UseDBResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData(); // Initial fetch

    // Poll every interval
    const timer = setInterval(fetchData, interval);

    return () => clearInterval(timer);
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
}
