import axios from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken } from '../core/auth/tokenStorage';
import { clearSession } from '../core/auth/session';

export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api'
  : 'https://staging.glancewise.app/api';

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
      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return apiClient(originalRequest);
    } catch {
      await clearSession();
      return Promise.reject(error);
    }
  }
);

export default apiClient;
