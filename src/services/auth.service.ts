import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';
import { clearSession } from '../core/auth/session';
import { getAccessToken, getRefreshToken, setAccessToken, setTokens } from '../core/auth/tokenStorage';

const PROFILE_KEY = 'user';

export interface LoginCredentials {
  /** Django `authenticate` username — often the same as email */
  username: string;
  password: string;
}

export interface LoginTenant {
  tenant_id: string;
  company_name: string | null;
  role: string;
}

/** Response from POST /users/login/ */
export interface LoginResponse {
  access: string;
  refresh: string;
  tenants: LoginTenant[];
  pending_invitations: unknown[];
}

export interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  tenant_id?: string;
  company_name?: string | null;
  role?: string;
  [key: string]: unknown;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/users/login/', {
      username: credentials.username.trim(),
      password: credentials.password,
    });

    const { access, refresh, tenants } = response.data;

    await setTokens(access, refresh);
    await AsyncStorage.setItem('loginTenants', JSON.stringify(tenants ?? []));

    return response.data;
  }

  /**
   * Exchange basic JWT for tenant-scoped tokens (required before tenant-specific APIs).
   */
  async selectTenant(tenantId: string): Promise<void> {
    const response = await apiClient.post<{ access: string; refresh: string }>('/users/select-tenant/', {
      tenant_id: tenantId,
    });

    await setTokens(response.data.access, response.data.refresh);
  }

  /** Load profile (optional); stores JSON under `user` for getCurrentUser. */
  async fetchProfile(): Promise<UserProfile | null> {
    try {
      const response = await apiClient.get<UserProfile>('/users/me/');
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(response.data));
      return response.data;
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await clearSession();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const userStr = await AsyncStorage.getItem(PROFILE_KEY);
      return userStr ? (JSON.parse(userStr) as UserProfile) : null;
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await getAccessToken();
    return !!token;
  }

  async refreshToken(): Promise<string> {
    const refresh = await getRefreshToken();
    if (!refresh) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ access: string }>('/users/token/refresh/', {
      refresh,
    });

    await setAccessToken(response.data.access);
    return response.data.access;
  }
}

export default new AuthService();
