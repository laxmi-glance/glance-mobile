import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Appearance, AppState, type AppStateStatus } from "react-native";
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
const SERVER_THEME_SYNC_MS = 60_000;

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
  applyFromPreferences: (prefs: { theme?: unknown }, fetchEpoch: number) => Promise<void>;
  getThemeWriteEpoch: () => number;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(THEME_AUTO);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(resolveTheme(THEME_AUTO));
  const [localReady, setLocalReady] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const writeEpochRef = useRef(0);
  const patchInFlightRef = useRef(false);
  const hydrateInFlightRef = useRef<Promise<void> | null>(null);

  const getThemeWriteEpoch = useCallback(() => writeEpochRef.current, []);

  const applyFromPreferences = useCallback(async (prefs: { theme?: unknown }, fetchEpoch: number) => {
    if (patchInFlightRef.current || fetchEpoch !== writeEpochRef.current) {
      return;
    }
    const next = prefs?.theme;
    if (!isMode(next) || next === modeRef.current) {
      return;
    }
    setMode(next);
    setResolvedTheme(resolveTheme(next));
  }, []);

  const hydrateFromServer = useCallback(async () => {
    if (hydrateInFlightRef.current) {
      return hydrateInFlightRef.current;
    }
    const run = (async () => {
      const fetchEpoch = writeEpochRef.current;
      try {
        const [authed, hasTenant] = await Promise.all([
          authService.isAuthenticated(),
          authService.hasSelectedTenant(),
        ]);
        if (!authed || !hasTenant) {
          return;
        }
        const prefs = await preferencesService.get();
        await applyFromPreferences(prefs, fetchEpoch);
      } catch {
        // local cache is enough
      }
    })();
    hydrateInFlightRef.current = run.finally(() => {
      hydrateInFlightRef.current = null;
    });
    return hydrateInFlightRef.current;
  }, [applyFromPreferences]);

  const setTheme = useCallback(
    async (value: ThemeMode, { syncBackend = true }: { syncBackend?: boolean } = {}) => {
      if (!isMode(value) || value === modeRef.current) {
        return;
      }
      writeEpochRef.current += 1;
      if (syncBackend) {
        patchInFlightRef.current = true;
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
        } finally {
          patchInFlightRef.current = false;
        }
      }
    },
    []
  );

  useEffect(() => {
    return onSessionExpired(() => {
      writeEpochRef.current += 1;
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
    const onChange = (next: AppStateStatus) => {
      if (next === "active") {
        void hydrateFromServer();
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    const timer = setInterval(() => {
      if (AppState.currentState === "active") {
        void hydrateFromServer();
      }
    }, SERVER_THEME_SYNC_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
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
      applyFromPreferences,
      getThemeWriteEpoch,
    }),
    [
      mode,
      resolvedTheme,
      colors,
      type,
      setTheme,
      hydrateFromServer,
      applyFromPreferences,
      getThemeWriteEpoch,
    ]
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
