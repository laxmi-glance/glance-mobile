import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageKeys } from "../../core/storage";
import { onTenantChanged } from "../../core/sessionEvents";
import { clearTaxRegimeCache, fetchTaxRegime } from "./fetchTaxRegime";
import type { TaxRegimePayload } from "./taxRegimeTypes";

type TaxRegimeContextValue = {
  regime: TaxRegimePayload | null;
  tenantId: string | null;
  loading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
};

const TaxRegimeContext = createContext<TaxRegimeContextValue>({
  regime: null,
  tenantId: null,
  loading: false,
  error: null,
  refetch: async () => {},
});

export function TaxRegimeProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [regime, setRegime] = useState<TaxRegimePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const loadGeneration = useRef(0);

  useEffect(() => {
    let active = true;
    const syncTenantFromStorage = () =>
      AsyncStorage.getItem(StorageKeys.tenantId).then((id) => {
        if (active) {
          setTenantId(id);
        }
      });
    void syncTenantFromStorage();
    const unsub = onTenantChanged((id) => {
      if (active) {
        setTenantId(id);
        return;
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const load = useCallback(async () => {
    if (!tenantId) {
      loadGeneration.current += 1;
      setRegime(null);
      setLoading(false);
      setError(null);
      return;
    }
    const generation = loadGeneration.current + 1;
    loadGeneration.current = generation;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTaxRegime(tenantId);
      if (generation !== loadGeneration.current) {
        return;
      }
      setRegime(data);
    } catch (e) {
      if (generation !== loadGeneration.current) {
        return;
      }
      setRegime(null);
      setError(e);
    } finally {
      if (generation === loadGeneration.current) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  useEffect(() => {
    clearTaxRegimeCache(tenantId);
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- fetch regime after tenant switch
  }, [tenantId, load]);

  const refetch = useCallback(async () => {
    clearTaxRegimeCache(tenantId);
    await load();
  }, [tenantId, load]);

  const value = useMemo(
    () => ({ regime, tenantId, loading, error, refetch }),
    [regime, tenantId, loading, error, refetch]
  );

  return <TaxRegimeContext.Provider value={value}>{children}</TaxRegimeContext.Provider>;
}

export function useTaxRegimeContext(): TaxRegimeContextValue {
  return useContext(TaxRegimeContext);
}
