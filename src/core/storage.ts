import AsyncStorage from "@react-native-async-storage/async-storage";

export const StorageKeys = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  tenantId: "tenantId",
  selectedTenant: "selectedTenant",
  availableTenants: "availableTenants",
  rbacConfig: "rbacConfig",
  userId: "userId",
} as const;

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(StorageKeys));
}
