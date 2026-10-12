import { apiClient } from "../../config/api";
import type { TaxRegimePayload } from "./taxRegimeTypes";

import { clearTaxRegimeCache, taxRegimeCache as cache } from "./taxRegimeCache";

export { clearTaxRegimeCache };

export async function fetchTaxRegime(tenantId: string): Promise<TaxRegimePayload> {
  const key = String(tenantId);
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }
  const promise = apiClient.get<TaxRegimePayload>("/tax/regime/").then((res) => res.data);
  cache.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    cache.delete(key);
    throw err;
  }
}
