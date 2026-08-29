import { useCallback, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from './api';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.get<User>('/auth/me');
        setUser(me);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string }>('/auth/login', { email, password });
    await setToken(res.accessToken);
    setUser({ id: 'me', email });
    return res;
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
