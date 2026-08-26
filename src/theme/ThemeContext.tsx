import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type AppColors } from "./colors";
import { makeType, type TypeScale } from "./typography";
import preferencesService from "../services/preferences.service";
import authService from "../services/auth.service";
import { onSessionExpired } from "../core/sessionEvents";

export const THEME_LIGHT = "light";
export const THEME_DARK = "dark";
export const THEME_AUTO = "auto";
export type ThemeMode = typeof THEME_LIGHT | typeof THEME_DARK | typeof THEME_AUTO;
export type ResolvedTheme = typeof THEME_LIGHT | typeof THEME_DARK;

const STORAGE_KEY = "theme";

function isMode(value: unknown): value is ThemeMode {
  return value === THEME_LIGHT || value === THEME_DARK || value === THEME_AUTO;
}

function systemTheme(): ResolvedTheme {
  return Appearance.getColorScheme() === "dark" ? THEME_DARK : THEME_LIGHT;
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === THEME_AUTO ? systemTheme() : mode;
}

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  theme: ResolvedTheme;
  isDark: boolean;
  colors: AppColors;
  type: TypeScale;
  setTheme: (mode: ThemeMode, options?: { syncBackend?: boolean }) => Promise<void>;
  hydrateFromServer: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(THEME_AUTO);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(resolveTheme(THEME_AUTO));
  const [localReady, setLocalReady] = useState(false);

  const hydrateFromServer = useCallback(async () => {
    try {
      const [authed, hasTenant] = await Promise.all([
        authService.isAuthenticated(),
        authService.hasSelectedTenant(),
      ]);
      if (!authed || !hasTenant) {
        return;
      }
      const prefs = await preferencesService.get();
      if (isMode(prefs.theme)) {
        setMode(prefs.theme);
        setResolvedTheme(resolveTheme(prefs.theme));
        await AsyncStorage.setItem(STORAGE_KEY, prefs.theme);
      }
    } catch {
      // local cache is enough
    }
  }, []);

  const setTheme = useCallback(
    async (value: ThemeMode, { syncBackend = true }: { syncBackend?: boolean } = {}) => {
      if (!isMode(value) || value === mode) {
        return;
      }
      setMode(value);
      setResolvedTheme(resolveTheme(value));
      try {
        await AsyncStorage.setItem(STORAGE_KEY, value);
      } catch {
        // ignore
      }
      if (syncBackend) {
        try {
          const [authed, hasTenant] = await Promise.all([
            authService.isAuthenticated(),
            authService.hasSelectedTenant(),
          ]);
          if (authed && hasTenant) {
            await preferencesService.patch({ theme: value });
          }
        } catch {
          // local storage is the fallback
        }
      }
    },
    [mode]
  );

  useEffect(() => {
    return onSessionExpired(() => {
      setMode(THEME_AUTO);
      setResolvedTheme(resolveTheme(THEME_AUTO));
      void AsyncStorage.setItem(STORAGE_KEY, THEME_AUTO).catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && isMode(stored)) {
          setMode(stored);
          setResolvedTheme(resolveTheme(stored));
        }
      } catch {
        // keep auto
      }
      if (!cancelled) {
        setLocalReady(true);
        await hydrateFromServer();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromServer]);

  useEffect(() => {
    if (!localReady) {
      return;
    }
    const next = resolveTheme(mode);
    setResolvedTheme((prev) => (prev === next ? prev : next));
    void AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => undefined);
  }, [mode, localReady]);

  useEffect(() => {
    if (mode !== THEME_AUTO) {
      return;
    }
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setResolvedTheme(colorScheme === "dark" ? THEME_DARK : THEME_LIGHT);
    });
    return () => sub.remove();
  }, [mode]);

  const colors = resolvedTheme === THEME_DARK ? darkColors : lightColors;
  const type = useMemo(() => makeType(colors), [colors]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      theme: resolvedTheme,
      isDark: resolvedTheme === THEME_DARK,
      colors,
      type,
      setTheme,
      hydrateFromServer,
    }),
    [mode, resolvedTheme, colors, type, setTheme, hydrateFromServer]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}
