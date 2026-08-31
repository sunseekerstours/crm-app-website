import { useCallback, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken } from './api';

export interface User {
  id: string;
  email: string;
  name?: string;
  roles: string[];
  permissions: string[];
}

export interface Me {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (!Array.isArray(user.permissions) || user.permissions.length === 0) return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  if (!user) return true;
  if (!Array.isArray(user.permissions) || user.permissions.length === 0) return true;
  return permissions.some((p) => user.permissions.includes(p));
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
        const me = await api.get<Me>('/auth/me');
        setUser({ ...me, name: undefined });
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Me> => {
    const res = await api.post<{ accessToken: string; user?: Me }>('/auth/login', {
      email,
      password,
    });
    await setToken(res.accessToken);
    let me: Me = { id: 'me', email, roles: [], permissions: [] };
    if (res.user) {
      me = res.user;
    } else {
      try {
        me = await api.get<Me>('/auth/me');
      } catch {
        // fall back to minimal user
      }
    }
    setUser({ ...me, name: undefined });
    return me;
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return { user, loading, login, logout, hasPermission, hasAnyPermission };
}
