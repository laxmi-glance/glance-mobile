type Listener = () => void;
type TenantListener = (tenantId: string | null) => void;

const sessionExpiredListeners = new Set<Listener>();
const tenantChangedListeners = new Set<TenantListener>();

export function onSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => listener());
}

export function onTenantChanged(listener: TenantListener): () => void {
  tenantChangedListeners.add(listener);
  return () => {
    tenantChangedListeners.delete(listener);
  };
}

export function notifyTenantChanged(tenantId: string | null): void {
  tenantChangedListeners.forEach((listener) => listener(tenantId));
}
