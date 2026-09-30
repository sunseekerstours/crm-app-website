const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'sunseekers_access_token';
const REFRESH_TOKEN_KEY = 'sunseekers_refresh_token';
const USER_KEY = 'sunseekers_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAllAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type RawResponse<T> =
  | { data: T; meta?: Record<string, unknown> }
  | { error?: { code?: string; message?: string } };

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAllAuth();
      return null;
    }

    const json = await res.json();
    const newAccessToken = json?.data?.accessToken || json?.accessToken;
    const newRefreshToken = json?.data?.refreshToken || json?.refreshToken;

    if (newAccessToken) {
      setToken(newAccessToken);
      if (newRefreshToken) setRefreshToken(newRefreshToken);
      return newAccessToken;
    }

    clearAllAuth();
    return null;
  } catch {
    clearAllAuth();
    return null;
  }
}

async function request<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json: RawResponse<T> | null = null;
  try {
    json = (await res.json()) as RawResponse<T>;
  } catch {
    json = null;
  }

  // Handle 401 Unauthorized
  if (res.status === 401 && !isRetry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(method, path, body, true);
    }

    clearAllAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?expired=1&redirect=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  if (!res.ok) {
    const code = json && 'error' in json && json.error?.code ? json.error.code! : 'UNKNOWN';
    const message =
      json && 'error' in json && json.error?.message ? json.error.message! : `Request failed (${res.status})`;
    throw new ApiError(res.status, code, message);
  }

  if (json && 'data' in json && json.data !== undefined) {
    return json.data;
  }
  return undefined as unknown as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export async function fetchList<T>(path: string): Promise<Paginated<T>> {
  return api.get<Paginated<T>>(path);
}

