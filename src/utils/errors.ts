import { isAxiosError } from "axios";

export function apiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      { detail?: string; message?: string; error_code?: string } | undefined;
    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (data && typeof data === "object") {
      for (const value of Object.values(data as Record<string, unknown>)) {
        if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
          return value[0];
        }
        if (typeof value === "string" && value.trim()) {
          return value;
        }
      }
    }
    if (error.message === "Network Error") {
      return "Unable to reach Glancewise. Check your connection and API URL.";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function apiErrorCode(error: unknown): string | null {
  if (isAxiosError(error)) {
    const code = (error.response?.data as { error_code?: string } | undefined)?.error_code;
    return code ?? null;
  }
  return null;
}
