import { API_BASE_URL, API_ENV, FRONTEND_URL } from "../config/env";

const BLOCKED_SCHEMES = new Set([
  "javascript:",
  "file:",
  "data:",
  "intent:",
  "content:",
  "blob:",
  "about:",
]);

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function isLoopbackOrIp(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "10.0.2.2" ||
    hostname === "0.0.0.0" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

/** Apex and www of the frontend host both appear in CORS; trust both. */
function withWwwAlias(origin: string): string[] {
  try {
    const parsed = new URL(origin);
    if (isLoopbackOrIp(parsed.hostname) || parsed.hostname.startsWith("api.")) {
      return [origin];
    }
    const alias = new URL(origin);
    alias.hostname = parsed.hostname.startsWith("www.")
      ? parsed.hostname.slice(4)
      : `www.${parsed.hostname}`;
    return alias.origin === origin ? [origin] : [origin, alias.origin];
  } catch {
    return [origin];
  }
}

export function trustedAuthOrigins(): string[] {
  return [FRONTEND_URL, API_BASE_URL]
    .map(originOf)
    .filter((value): value is string => Boolean(value))
    .flatMap(withWwwAlias);
}

export function allowsCleartextAuth(): boolean {
  return API_ENV === "local";
}

export function loginOriginWhitelist(): string[] {
  return allowsCleartextAuth() ? ["http://*", "https://*"] : ["https://*"];
}

export function loginMixedContentMode(): "never" | "compatibility" {
  return allowsCleartextAuth() ? "compatibility" : "never";
}

export function isTrustedAuthUrl(url?: string | null): boolean {
  if (!url) {
    return false;
  }
  const origin = originOf(url);
  return Boolean(origin && trustedAuthOrigins().includes(origin));
}

export function isAuthFlowPath(url?: string | null): boolean {
  if (!url) {
    return false;
  }
  try {
    const path = new URL(url).pathname;
    return path.includes("/login") || path.includes("/select-tenant");
  } catch {
    return false;
  }
}

const WEB_LOGIN_USES_HTTPS = (() => {
  try {
    return new URL(FRONTEND_URL).protocol === "https:";
  } catch {
    return false;
  }
})();

export function isHttpsLoginConfigured(): boolean {
  return allowsCleartextAuth() || WEB_LOGIN_USES_HTTPS;
}

function isBlockedScheme(url: string): boolean {
  const lower = url.trim().toLowerCase();
  if (lower === "about:blank") {
    return false;
  }
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return true;
    }
  }
  return false;
}

export function shouldAllowAuthNavigation(request: { url: string; isTopFrame?: boolean }): boolean {
  const url = request.url?.trim() ?? "";
  if (url.toLowerCase() === "about:blank") {
    return true;
  }
  if (!url || isBlockedScheme(url)) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol === "http:" && !allowsCleartextAuth()) {
    return false;
  }

  // Android always reports isTopFrame=true (inner frames never hit this callback).
  // Missing/undefined is treated as top-frame so a skipped flag cannot open an
  // attacker origin.
  const isTopFrame = request.isTopFrame !== false;
  if (isTopFrame) {
    return isTrustedAuthUrl(url);
  }

  return parsed.protocol === "https:" || allowsCleartextAuth();
}

export function shouldReadCapturedLogin(url?: string | null): boolean {
  if (!isTrustedAuthUrl(url)) {
    return false;
  }
  try {
    return new URL(url as string).pathname.includes("/select-tenant");
  } catch {
    return false;
  }
}
