import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../config/api";
import {
  StorageKeys,
  clearSession,
  getAccessToken,
  getJson,
  getRefreshToken,
  setJson,
  setTokenPair,
} from "../core/storage";
import { userIdFromAccessToken } from "../utils/jwt";
import rbacService from "./rbac.service";
import type { LoginResponse, Tenant, TokenPair, UserProfile } from "../types/models";

class AuthService {
  async persistLoginSession(data: LoginResponse): Promise<void> {
    await setTokenPair(data.access, data.refresh);
    const userId = userIdFromAccessToken(data.access);
    if (userId) {
      await AsyncStorage.setItem(StorageKeys.userId, userId);
    } else {
      await AsyncStorage.removeItem(StorageKeys.userId);
    }
    await AsyncStorage.removeItem(StorageKeys.tenantId);
    await AsyncStorage.removeItem(StorageKeys.selectedTenant);
    await AsyncStorage.removeItem(StorageKeys.rbacConfig);
    await setJson(StorageKeys.availableTenants, data.tenants ?? []);
  }

  async selectTenant(tenantId: string): Promise<TokenPair> {
    const { data } = await apiClient.post<TokenPair>("/users/select-tenant/", {
      tenant_id: tenantId,
    });

    await setTokenPair(data.access, data.refresh);
    await AsyncStorage.setItem(StorageKeys.tenantId, tenantId);

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
    const refresh = await getRefreshToken();
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
    const token = await getAccessToken();
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
    const token = await getAccessToken();
    const userId = userIdFromAccessToken(token);
    if (userId) {
      await AsyncStorage.setItem(StorageKeys.userId, userId);
    }
    return userId;
  }
}

export default new AuthService();
