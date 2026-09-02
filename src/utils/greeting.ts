export function getGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function getDisplayFirstName(
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  } | null
): string {
  const first = profile?.first_name?.trim();
  if (first) {
    return first;
  }
  const source = profile?.username || "";
  const token = source.split(/[@.\s_]/)[0];
  if (!token) {
    return "there";
  }
  return token.charAt(0).toUpperCase() + token.slice(1);
}
