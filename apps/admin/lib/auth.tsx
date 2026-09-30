'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, setRefreshToken, clearAllAuth, getToken } from './api';

export interface SessionUser {
  id: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: SessionUser;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const USER_KEY = 'sunseekers_user';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    try {
      const stored = window.localStorage.getItem(USER_KEY);
      const token = getToken();
      if (stored && token) {
        const parsed = JSON.parse(stored) as SessionUser;
        setUser(parsed);
        // Verify session validity with backend in the background
        api
          .get<SessionUser>('/auth/me')
          .then((freshUser) => {
            if (active && freshUser) {
              setUser(freshUser);
              window.localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            }
          })
          .catch(() => {
            if (active) {
              clearAllAuth();
              setUser(null);
            }
          });
      } else {
        clearAllAuth();
        setUser(null);
      }
    } catch {
      clearAllAuth();
      setUser(null);
    }
    if (active) setLoading(false);
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      setToken(data.accessToken);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      router.push('/');
    },
    [router],
  );

  const logout = useCallback(() => {
    clearAllAuth();
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdmin = useMemo(
    () =>
      Boolean(
        user && (user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('ADMIN')),
      ),
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, isAdmin }),
    [user, loading, login, logout, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
