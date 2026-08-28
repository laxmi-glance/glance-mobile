import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";

export const StorageKeys = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  tenantId: "tenantId",
  selectedTenant: "selectedTenant",
  availableTenants: "availableTenants",
  rbacConfig: "rbacConfig",
  userId: "userId",
} as const;

const SECRET_KEYS = [StorageKeys.accessToken, StorageKeys.refreshToken] as const;

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const PAYABLE_PREVIEW_CACHE_NAME = "payable-preview.pdf";

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

async function readLegacySecret(key: string): Promise<string | null> {
  const legacy = await AsyncStorage.getItem(key);
  if (!legacy) {
    return null;
  }
  await setSecret(key, legacy);
  await AsyncStorage.removeItem(key);
  return legacy;
}

export async function getSecret(key: string): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(key, SECURE_OPTIONS);
    if (stored) {
      return stored;
    }
  } catch {
    // Fall through to one-time AsyncStorage migration.
  }
  try {
    return await readLegacySecret(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
  await AsyncStorage.removeItem(key);
}

export async function getAccessToken(): Promise<string | null> {
  return getSecret(StorageKeys.accessToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return getSecret(StorageKeys.refreshToken);
}

export async function setTokenPair(access: string, refresh?: string | null): Promise<void> {
  const writes = [setSecret(StorageKeys.accessToken, access)];
  if (refresh) {
    writes.push(setSecret(StorageKeys.refreshToken, refresh));
  }
  await Promise.all(writes);
}

async function deleteSecrets(): Promise<void> {
  await Promise.all(
    SECRET_KEYS.map(async (key) => {
      try {
        await SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
      } catch {
        // Key may not exist yet (fresh install or already cleared).
      }
      await AsyncStorage.removeItem(key);
    })
  );
}

export async function wipeSensitiveCache(): Promise<void> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    return;
  }
  try {
    await FileSystem.deleteAsync(`${dir}${PAYABLE_PREVIEW_CACHE_NAME}`, { idempotent: true });
  } catch {
    // Best-effort cleanup on logout.
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([deleteSecrets(), wipeSensitiveCache()]);
  await AsyncStorage.multiRemove(Object.values(StorageKeys));
}
