import axios from 'axios';
import Constants from 'expo-constants';
import { getAccessToken, getRefreshToken, setAccessToken } from '../core/auth/tokenStorage';
import { clearSession } from '../core/auth/session';

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

function getHostFromExpoConfig(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const [host] = hostUri.split(':');
  return host || null;
}

function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured?.trim()) {
    return normalizeApiBaseUrl(configured);
  }

  if (!__DEV__) {
    return 'https://staging.glancewise.app/api';
  }

  const host = getHostFromExpoConfig();
  if (host) {
    return `http://${host}:8000/api`;
  }

  // Fallback for simulator/dev environments where Expo host is unavailable.
  return 'http://localhost:8000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: refresh on 401 once, then clear session and reset app auth
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const url = String(originalRequest.url ?? '');
    if (
      url.includes('/users/login/') ||
      url.includes('/users/token/refresh/') ||
      url.includes('/users/select-tenant/')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refresh = await getRefreshToken();
      if (!refresh) {
        await clearSession();
        return Promise.reject(error);
      }

      const { data } = await axios.post<{ access: string }>(
        `${API_BASE_URL}/users/token/refresh/`,
        { refresh },
        { headers: { 'Content-Type': 'application/json' } }
      );

      await setAccessToken(data.access);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return apiClient(originalRequest);
    } catch {
      await clearSession();
      return Promise.reject(error);
    }
  }
);

export default apiClient;
