type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionExpired(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Session expired listener error:', e);
    }
  });
}
