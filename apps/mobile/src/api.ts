import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'sunseekers_access_token';

export function getApiUrl(): string {
  return API_URL;
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
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

type RawResponse<T> = { data: T } | { error?: { code?: string; message?: string } };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Is the backend running?');
  }

  let json: RawResponse<T> | null = null;
  try {
    json = (await res.json()) as RawResponse<T>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const code = json && 'error' in json && json.error?.code ? json.error.code : 'UNKNOWN';
    const message = json && 'error' in json && json.error?.message ? json.error.message! : `Request failed (${res.status})`;
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
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
