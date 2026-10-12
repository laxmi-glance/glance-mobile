import type { TaxRegimePayload } from "./taxRegimeTypes";

/**
 * Per-company cache of GET /api/tax/regime/ promises. Free of the API client import so
 * config/api.ts can clear it without a require cycle through fetchTaxRegime.
 */
export const taxRegimeCache = new Map<string, Promise<TaxRegimePayload>>();

export function clearTaxRegimeCache(tenantId?: string | null): void {
  if (tenantId == null) {
    taxRegimeCache.clear();
    return;
  }
  taxRegimeCache.delete(String(tenantId));
}
