import { Platform } from "react-native";
import Constants from "expo-constants";

export type ApiEnv = "local" | "staging" | "production";

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

/**
 * Resolution order:
 * 1. EXPO_PUBLIC_API_BASE_URL (full URL override)
 * 2. extra.apiBaseUrl in app.json
 * 3. EXPO_PUBLIC_API_ENV / extra.apiEnv → local | staging | production
 * 4. local in Expo Go / __DEV__, staging in release builds
 */
export const API_ENV: ApiEnv =
  parseApiEnv(process.env.EXPO_PUBLIC_API_ENV) ||
  parseApiEnv(extraConfig().apiEnv) ||
  (__DEV__ ? "local" : "staging");

const urlOverride =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || extraConfig().apiBaseUrl?.trim() || "";

export const API_BASE_URL = urlOverride || API_HOSTS[API_ENV];

export const FRONTEND_URL =
  process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ||
  extraConfig().frontendUrl?.trim() ||
  FRONTEND_HOSTS[API_ENV];

export const WEB_LOGIN_URL = `${FRONTEND_URL.replace(/\/+$/, "")}/login`;

export const API_TIMEOUT_MS = 30000;
export const UPLOAD_TIMEOUT_MS = 120000;

export { API_HOSTS, FRONTEND_HOSTS };
