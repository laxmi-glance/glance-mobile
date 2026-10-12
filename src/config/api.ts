import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, API_TIMEOUT_MS } from "./env";
import {
  StorageKeys,
  clearSession,
  getAccessToken,
  getRefreshToken,
  setTokenPair,
} from "../core/storage";
import { notifySessionExpired, notifyTenantChanged } from "../core/sessionEvents";
import { clearTaxRegimeCache } from "../shared/tax/taxRegimeCache";
import type { TokenPair } from "../types/models";

function isFormDataBody(data: unknown): boolean {
  if (typeof FormData === "undefined" || data == null || typeof data !== "object") {
    return false;
  }
  if (data instanceof FormData) {
    return true;
  }
  return typeof (data as FormData).append === "function";
}

const PUBLIC_PATHS = [
  "/users/login/",
  "/users/login/mfa-verify/",
  "/users/app-login/",
  "/users/token/refresh/",
  "/users/logout/",
  "/users/signup/",
  "/users/verify-otp/",
];

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const MOBILE_APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "X-Glance-Client": "mobile",
    "X-Glance-Client-Version": MOBILE_APP_VERSION,
  },
});

function isPublicPath(url?: string): boolean {
  if (!url) {
    return false;
  }
  return PUBLIC_PATHS.some((path) => url.includes(path));
}

apiClient.interceptors.request.use(async (config) => {
  const headers = AxiosHeaders.from(config.headers);
  const publicPath = isPublicPath(config.url);
  const token = await getAccessToken();
  if (token && !publicPath) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const tenantId = await AsyncStorage.getItem(StorageKeys.tenantId);
  if (tenantId && !publicPath) {
    headers.set("X-Tenant-ID", tenantId);
  }

  if (isFormDataBody(config.data)) {
    // Axios POST defaults to urlencoded. If that header reaches RN Android,
    // OkHttp throws before the request is sent (often shown as an invalid URL /
    // network error). `false` blocks the default and lets RN set multipart.
    headers.set("Content-Type", false);
  } else if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  config.headers = headers;
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function rotateTokens(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) {
    return null;
  }

  const { data } = await axios.post<TokenPair>(
    `${API_BASE_URL}/users/token/refresh/`,
    { refresh },
    { timeout: API_TIMEOUT_MS, headers: { "Content-Type": "application/json" } }
  );

  await setTokenPair(data.access, data.refresh);
  return data.access;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = rotateTokens().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function forceSignOut(): Promise<void> {
  await clearSession();
  clearTaxRegimeCache();
  notifyTenantChanged(null);
  notifySessionExpired();
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const errorCode = (error.response?.data as { error_code?: string } | undefined)?.error_code;

    if (errorCode === "USER_ACCOUNT_DISABLED") {
      await forceSignOut();
      return Promise.reject(error);
    }

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isPublicPath(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const access = await refreshAccessToken();
      if (!access) {
        await forceSignOut();
        return Promise.reject(error);
      }
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return apiClient(originalRequest);
    } catch {
      await forceSignOut();
      return Promise.reject(error);
    }
  }
);
