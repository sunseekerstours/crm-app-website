'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Paginated } from './api';

export function useList<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<Paginated<T>>(path)
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch((e: Error) => {
        if (!active) return;
        setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, reloadKey, ...deps]);

  return { data, loading, error, reload };
}
