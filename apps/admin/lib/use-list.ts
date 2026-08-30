'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from './api';

/**
 * Lightweight list data hook for admin pages. Fetches a paginated endpoint
 * and exposes reload/retry. Used read-only across admin screens.
 */
export function useList<T>(path: (page: number) => string, deps: unknown[] = []) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<T>>(path(page));
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ...deps]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, page, setPage, reload: load };
}
