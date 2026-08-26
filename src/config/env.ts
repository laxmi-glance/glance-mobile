import { Platform } from "react-native";
import Constants from "expo-constants";

export type ApiEnv = "local" | "staging" | "production";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const API_HOSTS: Record<ApiEnv, string> = {
  local: Platform.OS === "android" ? "http://10.0.2.2:8000/api" : "http://localhost:8000/api",
  staging: "https://api.staging.glancewise.app/api",
  production: "https://api.glancewise.app/api",
};

const FRONTEND_HOSTS: Record<ApiEnv, string> = {
  local: "http://localhost:3000",
  staging: "https://staging.glancewise.app",
  production: "https://app.glancewise.app",
};

type ExtraConfig = {
  apiBaseUrl?: string;
  frontendUrl?: string;
  apiEnv?: string;
};

function extraConfig(): ExtraConfig {
  return (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
}

function parseApiEnv(value?: string | null): ApiEnv | null {
  const env = value?.trim().toLowerCase();
  if (env === "local" || env === "staging" || env === "production") {
    return env;
  }
  return null;
}

function hostnameFromHostUri(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  try {
    const withScheme = raw.includes("://") ? raw : `http://${raw}`;
    const { hostname } = new URL(withScheme);
    return hostname || null;
  } catch {
    const host = raw.split("/")[0]?.split(":")[0]?.trim();
    return host || null;
  }
}

/**
 * Expo's Metro LAN host (same IP the phone already used to load the bundle).
 * Physical devices cannot reach localhost on the developer machine.
 */
function lanHostname(): string | null {
  const constantsRecord = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string };
    linkingUri?: string;
  };
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    constantsRecord.manifest?.debuggerHost,
    constantsRecord.linkingUri,
  ];
  for (const candidate of candidates) {
    const host = hostnameFromHostUri(candidate);
    if (host && !LOOPBACK_HOSTS.has(host)) {
      return host;
    }
  }
  return null;
}

function rewriteLoopbackHost(url: string, host: string): string {
  try {
    const parsed = new URL(url);
    if (LOOPBACK_HOSTS.has(parsed.hostname) || parsed.hostname === "10.0.2.2") {
      parsed.hostname = host;
      let result = parsed.toString();
      if (!url.endsWith("/") && result.endsWith("/") && parsed.pathname === "/") {
        result = result.slice(0, -1);
      }
      return result;
    }
  } catch {
    return url.replace(/localhost|127\.0\.0\.1|10\.0\.2\.2/g, host);
  }
  return url;
}

function withDevLanHost(url: string): string {
  if (API_ENV !== "local") {
    return url;
  }
  const host = lanHostname();
  if (!host) {
    return url;
  }
  return rewriteLoopbackHost(url, host);
}

/**
 * Resolution order:
 * 1. EXPO_PUBLIC_API_BASE_URL (full URL override)
 * 2. extra.apiBaseUrl in app.json
 * 3. EXPO_PUBLIC_API_ENV / extra.apiEnv → local | staging | production
 * 4. local in Expo Go / __DEV__, staging in release builds
 *
 * In local mode, loopback hosts are rewritten to Expo's LAN IP so a physical
 * phone can reach Django (:8000) and the web login page (:3000).
 */
export const API_ENV: ApiEnv =
  parseApiEnv(process.env.EXPO_PUBLIC_API_ENV) ||
  parseApiEnv(extraConfig().apiEnv) ||
  (__DEV__ ? "local" : "staging");

const urlOverride =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || extraConfig().apiBaseUrl?.trim() || "";

export const API_BASE_URL = withDevLanHost(urlOverride || API_HOSTS[API_ENV]);

export const FRONTEND_URL = withDevLanHost(
  process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ||
    extraConfig().frontendUrl?.trim() ||
    FRONTEND_HOSTS[API_ENV]
);

export const WEB_LOGIN_URL = `${FRONTEND_URL.replace(/\/+$/, "")}/login`;

export const API_TIMEOUT_MS = 30000;
export const UPLOAD_TIMEOUT_MS = 120000;

export { API_HOSTS, FRONTEND_HOSTS };
