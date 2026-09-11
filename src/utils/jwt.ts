type JwtPayload = {
  user_id?: string;
  username?: string;
  tenant_id?: string;
  role?: string;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) {
      return null;
    }
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4);
    const json = globalThis.atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function userIdFromAccessToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }
  const id = decodeJwtPayload(token)?.user_id;
  return typeof id === "string" && id ? id : null;
}
