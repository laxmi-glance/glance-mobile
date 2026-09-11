export function mergeUniqueById<T extends { id: string }>(
  prev: T[],
  next: T[],
  replace: boolean
): T[] {
  if (replace) {
    return next;
  }
  const seen = new Set(prev.map((item) => item.id));
  return [...prev, ...next.filter((item) => item.id && !seen.has(item.id))];
}
