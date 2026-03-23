import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from '../config/api';
import { getAccessToken } from '../core/auth/tokenStorage';
import { AppTheme, darkTheme, lightTheme, ThemeMode, ThemeName } from './tokens';

const STORAGE_KEY = 'gw_mobile_theme_mode';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  resolvedTheme: ThemeName;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  mode: 'auto',
  resolvedTheme: 'light',
  setMode: async () => {},
});

function resolveThemeName(mode: ThemeMode, systemScheme: ReturnType<typeof useColorScheme>): ThemeName {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}

async function fetchUserPreferredThemeMode(): Promise<ThemeMode | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await apiClient.get<{ theme?: string }>('/users/preferences/');
    const raw = String(response.data?.theme || '').toLowerCase();
    if (raw === 'light' || raw === 'dark' || raw === 'auto') {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [hydrated, setHydrated] = useState(false);

  const syncModeFromServer = useCallback(async () => {
    const serverMode = await fetchUserPreferredThemeMode();
    if (!serverMode) return false;
    setModeState(serverMode);
    await AsyncStorage.setItem(STORAGE_KEY, serverMode);
    return true;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const localMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (localMode === 'light' || localMode === 'dark' || localMode === 'auto') {
          setModeState(localMode);
        }
        await syncModeFromServer();
      } finally {
        setHydrated(true);
      }
    })();
  }, [syncModeFromServer]);

  useEffect(() => {
    if (!hydrated) return;

    // If login finishes after initial mount, token may not exist during first sync.
    // Do a few delayed retries so theme still gets sourced from personalization API.
    let attempts = 0;
    const maxAttempts = 8;
    const retryMs = 1500;

    const timer = setInterval(async () => {
      attempts += 1;
      const synced = await syncModeFromServer();
      if (synced || attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, retryMs);

    return () => clearInterval(timer);
  }, [hydrated, syncModeFromServer]);

  useEffect(() => {
    if (!hydrated) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void syncModeFromServer();
      }
    });
    return () => subscription.remove();
  }, [hydrated, syncModeFromServer]);

  const resolvedTheme: ThemeName = useMemo(() => resolveThemeName(mode, systemScheme), [mode, systemScheme]);

  const theme = useMemo(() => (resolvedTheme === 'dark' ? darkTheme : lightTheme), [resolvedTheme]);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    try {
      const token = await getAccessToken();
      if (token) {
        await apiClient.patch('/users/preferences/', { theme: nextMode });
      }
    } catch {
      // Ignore background sync errors; local preference still applies.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolvedTheme, setMode }),
    [theme, mode, resolvedTheme, setMode]
  );

  if (!hydrated) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
