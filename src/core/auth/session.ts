import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens } from './tokenStorage';
import { emitSessionExpired } from './authEvents';

const SESSION_ASYNC_KEYS = ['user', 'loginTenants', 'selectedCompany'] as const;

/**
 * Clears JWTs (secure storage) and cached session data. Optionally notifies listeners
 * so the root navigator can reset to Login (401 refresh failure, explicit logout).
 */
export async function clearSession(options?: { emit?: boolean }): Promise<void> {
  const shouldEmit = options?.emit !== false;
  await clearTokens();
  await AsyncStorage.multiRemove([...SESSION_ASYNC_KEYS]);
  if (shouldEmit) {
    emitSessionExpired();
  }
}
