import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingLoginReset = false;
let retryGeneration = 0;

function performReset(): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  navigationRef.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });
  pendingLoginReset = false;
  return true;
}

/**
 * Called from `NavigationContainer` `onReady` so a logout/session-expiry that fired
 * before the container was mountable can still reset the stack.
 */
export function onNavigationReady(): void {
  if (pendingLoginReset) {
    performReset();
  }
}

/**
 * Reset stack to Login after session expiry or logout. Retries while the container
 * is not ready, and relies on `onNavigationReady` + timed retries to clear races.
 */
export function resetToLogin(): void {
  if (performReset()) {
    return;
  }

  pendingLoginReset = true;
  const gen = ++retryGeneration;
  let attempt = 0;
  const maxAttempts = 40;
  const intervalMs = 80;

  const step = () => {
    if (gen !== retryGeneration) {
      return;
    }
    if (!pendingLoginReset) {
      return;
    }
    if (performReset()) {
      return;
    }
    attempt += 1;
    if (attempt >= maxAttempts) {
      console.warn(
        '[auth] resetToLogin: navigation container stayed unavailable; user may need to restart the app.'
      );
      pendingLoginReset = false;
      return;
    }
    setTimeout(step, intervalMs);
  };

  setTimeout(step, 0);
}
