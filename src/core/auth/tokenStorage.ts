import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const LEGACY_ACCESS = 'authToken';
const LEGACY_REFRESH = 'refreshToken';
const SECURE_ACCESS = 'glance_access_token_v1';
const SECURE_REFRESH = 'glance_refresh_token_v1';

const useSecureStore = Platform.OS !== 'web';

let migrationChecked = false;

/** One-time migration from AsyncStorage-only tokens (older builds) to SecureStore on iOS/Android. */
async function migrateLegacyTokensIfNeeded(): Promise<void> {
  if (migrationChecked || !useSecureStore) {
    return;
  }
  migrationChecked = true;
  try {
    const existing = await SecureStore.getItemAsync(SECURE_ACCESS);
    if (existing) {
      return;
    }
    const oldAccess = await AsyncStorage.getItem(LEGACY_ACCESS);
    const oldRefresh = await AsyncStorage.getItem(LEGACY_REFRESH);
    if (oldAccess) {
      await SecureStore.setItemAsync(SECURE_ACCESS, oldAccess);
    }
    if (oldRefresh) {
      await SecureStore.setItemAsync(SECURE_REFRESH, oldRefresh);
    }
    if (oldAccess || oldRefresh) {
      await AsyncStorage.multiRemove([LEGACY_ACCESS, LEGACY_REFRESH]);
    }
  } catch (e) {
    console.warn('Token migration:', e);
  }
}

async function deleteSecure(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Key may not exist
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (useSecureStore) {
    await migrateLegacyTokensIfNeeded();
    return SecureStore.getItemAsync(SECURE_ACCESS);
  }
  return AsyncStorage.getItem(LEGACY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  if (useSecureStore) {
    await migrateLegacyTokensIfNeeded();
    return SecureStore.getItemAsync(SECURE_REFRESH);
  }
  return AsyncStorage.getItem(LEGACY_REFRESH);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  if (useSecureStore) {
    await migrateLegacyTokensIfNeeded();
    await SecureStore.setItemAsync(SECURE_ACCESS, access);
    await SecureStore.setItemAsync(SECURE_REFRESH, refresh);
    await AsyncStorage.multiRemove([LEGACY_ACCESS, LEGACY_REFRESH]);
  } else {
    await AsyncStorage.setItem(LEGACY_ACCESS, access);
    await AsyncStorage.setItem(LEGACY_REFRESH, refresh);
  }
}

export async function setAccessToken(access: string): Promise<void> {
  if (useSecureStore) {
    await SecureStore.setItemAsync(SECURE_ACCESS, access);
  } else {
    await AsyncStorage.setItem(LEGACY_ACCESS, access);
  }
}

export async function clearTokens(): Promise<void> {
  if (useSecureStore) {
    await deleteSecure(SECURE_ACCESS);
    await deleteSecure(SECURE_REFRESH);
  }
  await AsyncStorage.multiRemove([LEGACY_ACCESS, LEGACY_REFRESH]);
}
