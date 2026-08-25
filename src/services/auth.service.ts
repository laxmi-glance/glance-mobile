import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../config/api";
import { StorageKeys, clearSession, getJson, setJson } from "../core/storage";
import { userIdFromAccessToken } from "../utils/jwt";
import rbacService from "./rbac.service";
import type {
  LoginResponse,
  PendingInvitation,
  Tenant,
  TokenPair,
  UserProfile,
} from "../types/models";

export interface LoginCredentials {
  username: string;
  password: string;
  recaptchaToken?: string;
}

class AuthService {
  async persistLoginSession(data: LoginResponse): Promise<void> {
    await AsyncStorage.multiSet([
      [StorageKeys.accessToken, data.access],
      [StorageKeys.refreshToken, data.refresh],
    ]);
    const userId = userIdFromAccessToken(data.access);
    if (userId) {
      await AsyncStorage.setItem(StorageKeys.userId, userId);
    }
    await AsyncStorage.removeItem(StorageKeys.tenantId);
    await AsyncStorage.removeItem(StorageKeys.selectedTenant);
    await AsyncStorage.removeItem(StorageKeys.rbacConfig);
    await setJson(StorageKeys.availableTenants, data.tenants ?? []);
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const body: Record<string, string> = {
      username: credentials.username.trim(),
      password: credentials.password,
    };
    if (credentials.recaptchaToken) {
      body.recaptcha_token = credentials.recaptchaToken;
    }

    const { data } = await apiClient.post<LoginResponse>("/users/login/", body);
    await this.persistLoginSession(data);
    return data;
  }

  async selectTenant(tenantId: string): Promise<TokenPair> {
    const { data } = await apiClient.post<TokenPair>("/users/select-tenant/", {
      tenant_id: tenantId,
    });

    await AsyncStorage.multiSet([
      [StorageKeys.accessToken, data.access],
      [StorageKeys.refreshToken, data.refresh],
      [StorageKeys.tenantId, tenantId],
    ]);

    const userId = userIdFromAccessToken(data.access);
    if (userId) {
      await AsyncStorage.setItem(StorageKeys.userId, userId);
    }

    const tenants = (await getJson<Tenant[]>(StorageKeys.availableTenants)) ?? [];
    const selected = tenants.find((tenant) => tenant.tenant_id === tenantId) ?? null;
    if (selected) {
      await setJson(StorageKeys.selectedTenant, { ...selected, is_current: true });
    }

    await rbacService.sync().catch(() => undefined);

    return data;
  }

  async getProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>("/users/me/");
    return data;
  }

  async logout(): Promise<void> {
    const refresh = await AsyncStorage.getItem(StorageKeys.refreshToken);
    try {
      if (refresh) {
        await apiClient.post("/users/logout/", { refresh });
      }
    } catch {
      // Honor local logout even if the blacklist call fails (expired token, offline).
    } finally {
      await clearSession();
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(StorageKeys.accessToken);
    return Boolean(token);
  }

  async hasSelectedTenant(): Promise<boolean> {
    const tenantId = await AsyncStorage.getItem(StorageKeys.tenantId);
    return Boolean(tenantId);
  }

  async getStoredTenants(): Promise<Tenant[]> {
    return (await getJson<Tenant[]>(StorageKeys.availableTenants)) ?? [];
  }

  async getStoredUserId(): Promise<string | null> {
    const stored = await AsyncStorage.getItem(StorageKeys.userId);
    if (stored) {
      return stored;
    }
    const token = await AsyncStorage.getItem(StorageKeys.accessToken);
    const userId = userIdFromAccessToken(token);
    if (userId) {
      await AsyncStorage.setItem(StorageKeys.userId, userId);
    }
    return userId;
  }

  async getPendingInvitations(): Promise<PendingInvitation[]> {
    return [];
  }
}

export default new AuthService();
